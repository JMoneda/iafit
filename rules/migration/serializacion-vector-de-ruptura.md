---
title: "Serialización JSON: el vector de ruptura principal (.NET)"
category: migration
slug: serializacion-vector-de-ruptura
version: "1.0"
last_updated: "2026-07-16"
applies_to: ["backend"]
status: active
---

## Regla

En una migración .NET, el cambio de **`Newtonsoft.Json` → `System.Text.Json` (STJ)** —que
llega por defecto con ASP.NET Core moderno y con el modelo **isolated worker** de Azure
Functions (ver [[azure-functions-a-isolated]])— es el **principal vector de ruptura del
contrato**. Se trata como riesgo de primer orden: cualquier diferencia que aparezca en el diff
de la [[linea-base-de-contrato]] se resuelve **preservando el comportamiento previo**
(configurando el serializador), **nunca** cambiando el contrato "de paso"
(ver [[preservar-comportamiento]]).

## Justificación

Newtonsoft y STJ tienen **valores por defecto distintos**. El código compila, los tests
unitarios de lógica pasan, el servicio arranca… y aun así la **forma del JSON cambia**:
otro casing, otro manejo de `null`, enums como número en vez de string, otro formato de fecha.
El frontend que consume ese contrato deja de leer los campos. Es una ruptura **silenciosa**:
solo la detecta el diff de contrato, no el build ni las pruebas unitarias.

## Diferencias que rompen (Newtonsoft → STJ)

| Aspecto | Newtonsoft (típico) | STJ (por defecto) | Cómo preservar |
|---|---|---|---|
| **Casing** | Respeta el nombre C# (PascalCase) o config | camelCase en ASP.NET Core | `PropertyNamingPolicy = null` para PascalCase |
| **`null`** | Incluye por defecto | Incluye por defecto | igual; si había `NullValueHandling.Ignore`, replicar con `DefaultIgnoreCondition` |
| **Enums** | Número (o string con `StringEnumConverter`) | **Número** | añadir `JsonStringEnumConverter` si el contrato era string |
| **Fechas** | Configurable, a veces con offset local | ISO 8601 UTC | converter/formato explícito si difería |
| **Case-insensitive al leer** | Sí | **No** (sensible) | `PropertyNameCaseInsensitive = true` si el cliente manda otro casing |
| **Campos desconocidos** | Ignora | Ignora | igual (vigilar `[JsonExtensionData]`) |
| **Cultura / decimales** | InvariantCulture usual | InvariantCulture | verificar en el diff |

## Reglas específicas

- **La decisión se toma explícitamente y se documenta**: (a) migrar a STJ configurando
  `JsonSerializerOptions` para reproducir el comportamiento previo, **o** (b) **mantener
  Newtonsoft** de forma deliberada (en isolated worker se puede registrar el serializador
  Newtonsoft en el worker). Ambas son válidas; lo prohibido es cambiar el contrato sin querer.
- **El diff de contrato manda**: si tras el salto el JSON difiere de la línea base, es un
  defecto de migración; se ajusta la configuración del serializador hasta que el diff quede
  vacío (ver [[compuertas-de-salto]]).
- **No se "aprovecha" para modernizar el contrato** (p. ej. pasar a camelCase porque "es lo
  estándar"): eso es un cambio funcional que va en un change separado, con el frontend enterado.
- **Se prueban los casos límite de serialización**: `null`, colecciones vacías, enums, fechas,
  decimales — son donde más difieren los dos serializadores.

## Ejemplo

```csharp
// ✅ Preservar PascalCase + enums como string al pasar a STJ (isolated worker)
services.Configure<JsonSerializerOptions>(o =>
{
    o.PropertyNamingPolicy = null;                 // PascalCase como Newtonsoft
    o.PropertyNameCaseInsensitive = true;
    o.Converters.Add(new JsonStringEnumConverter()); // enums como string, no número
});

// ❌ Incorrecto: dejar los defaults de STJ y "ver si el front aguanta"
//    → camelCase + enums numéricos = contrato roto sin aviso.
```

## Verificación

```bash
# 1. ¿El proyecto pasa de Newtonsoft a STJ en este salto?
git diff <rama-base>..HEAD -- '*.csproj' | grep -iE "Newtonsoft|System\.Text\.Json"

# 2. Diff de contrato tras el salto (ver linea-base-de-contrato) — debe salir vacío
curl -s "http://localhost:7071/api/GetAdmited?domain=eafit.edu.co" \
  | diff - research/contracts/GetAdmited.baseline.json

# 3. La decisión (migrar a STJ configurado vs. mantener Newtonsoft) está documentada
grep -niE "System\.Text\.Json|Newtonsoft|JsonSerializerOptions" notas-migracion.md 2>/dev/null
```

**Criterio de aceptación:** el diff de contrato (comando 2) sale **vacío** y la decisión de
serialización está registrada en `notas-migracion.md`. Cualquier diferencia de forma del JSON
se resuelve antes de cerrar el salto.
