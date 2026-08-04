---
title: "Documentación de API en .NET 9+: OpenAPI nativo + Scalar (no Swashbuckle)"
category: code-standards
slug: openapi-scalar-dotnet
version: "1.0"
last_updated: "2026-08-04"
applies_to: ["backend", "dotnet"]
status: active
---

## Regla

En **.NET 9, .NET 10 y versiones posteriores**, la documentación de API se construye con
dos piezas:

1. **Generación del documento**: `Microsoft.AspNetCore.OpenApi` (`AddOpenApi()` +
   `MapOpenApi()`), el generador **nativo** de ASP.NET Core.
2. **Interfaz de usuario**: **Scalar** (`Scalar.AspNetCore`, `MapScalarApiReference()`).

**`Swashbuckle.AspNetCore` no se usa** en proyectos nuevos, y en migraciones se **retira**
en el salto a `net9.0`. La UI de Swagger deja de ser el estándar institucional: donde hoy
haya `/swagger`, queda Scalar.

## Justificación

- Microsoft **retiró Swashbuckle de la plantilla de Web API en .NET 9** y lo reemplazó por
  el generador nativo. No es una preferencia estética: el proyecto Swashbuckle quedó sin
  mantenimiento activo por su dueño en la comunidad (sin release oficial para .NET 8, issues
  sin atender) y su generación por **reflexión** choca con las restricciones de **Native AOT**.
- Depender de una librería sin mantenimiento en la superficie pública del API es deuda
  técnica con riesgo de seguridad y de bloqueo del siguiente salto de versión.
- El generador nativo **no trae UI**: solo publica el JSON/YAML. Scalar aporta la UI
  interactiva (explorador, "try it out", generación de snippets de cliente) sobre ese mismo
  documento, sin acoplar la generación a la UI.

## Ámbito por versión

| Versión | Generación | UI |
|---------|-----------|-----|
| ≤ .NET 8 | `Swashbuckle.AspNetCore` (`AddSwaggerGen`) | Swagger UI (`UseSwaggerUI`) |
| .NET 9 | `Microsoft.AspNetCore.OpenApi` | **Scalar** |
| .NET 10 y siguientes | `Microsoft.AspNetCore.OpenApi` | **Scalar** |

En una migración por saltos (ver [[proceso-migracion]]) el cambio se hace **en el salto a
`net9.0`**, no antes: mientras el TFM sea ≤ `net8.0` se conserva Swashbuckle para no
introducir ruido fuera del salto que le corresponde. Ver [[dotnet-a-9]] y [[dotnet-a-10]].

**Excepción — Azure Functions:** no aplica. Functions documenta con su propia extensión
OpenAPI (ver [[documentacion-api-cierre]], [[azure-functions-a-isolated]]), no con
Swashbuckle ni con el pipeline de ASP.NET Core.

## Tabla de reemplazos (migrar desde Swashbuckle)

| Swashbuckle | .NET 9+ |
|-------------|---------|
| `AddSwaggerGen()` | `AddOpenApi()` |
| `UseSwagger()` | `MapOpenApi()` |
| `UseSwaggerUI()` | `MapScalarApiReference()` |
| `/swagger/v1/swagger.json` | `/openapi/v1.json` |
| `/swagger` (UI) | `/scalar` |
| `IOperationFilter` / `ISchemaFilter` | *document / operation / schema transformers* |
| `[SwaggerOperation]`, `[SwaggerSchema]` | comentarios XML + `WithSummary`/`WithDescription` |
| `IncludeXmlComments(...)` | `<GenerateDocumentationFile>true</GenerateDocumentationFile>` |

## Ejemplo

```xml
<!-- Api.csproj -->
<PropertyGroup>
  <TargetFramework>net10.0</TargetFramework>
  <!-- .NET 10 incorpora los comentarios XML al documento OpenAPI automáticamente -->
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.*" />
  <PackageReference Include="Scalar.AspNetCore" Version="2.*" />
</ItemGroup>
```

```csharp
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// El documento y la UI se exponen de forma controlada, no por defecto en producción
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                       // /openapi/v1.json
    app.MapScalarApiReference();            // /scalar
}

app.MapControllers();
app.Run();
```

```csharp
// ❌ Incorrecto en net9.0+: dependencia sin mantenimiento y UI fuera del estándar
// builder.Services.AddSwaggerGen();
// app.UseSwagger();
// app.UseSwaggerUI();
```

## Reglas específicas

- **Exposición controlada**: documento y UI solo en entornos no productivos o **protegidos**
  con autenticación. Si el API va detrás de API Management (ver [[plataforma-azure]]), no
  quedan públicos sin control. No exponer secretos, datos reales en ejemplos ni endpoints
  internos (CWE-200/210) — ver [[documentacion-api-cierre]] y [[secrets-management]].
- **Retirar los residuos de Swashbuckle** en el mismo salto: `PackageReference`, `using`s,
  filtros, atributos `[Swagger*]` y el `launchUrl: "swagger"` de `launchSettings.json`.
  Dejar la mitad migrada viola [[residuos-de-migracion]].
- **La UI no es el contrato**: el contrato es el documento OpenAPI. Los diffs de
  [[linea-base-de-contrato]] se hacen sobre el JSON, no sobre la UI.
- **Cambio de versión de OpenAPI**: .NET 10 emite **OpenAPI 3.1** por defecto (antes 3.0),
  y 3.1 representa los nulos como `"type": ["string", "null"]` en vez de `nullable: true`.
  Al comparar contra una línea base generada por Swashbuckle, fija la versión para que el
  diff sea comparable y no se lea como ruptura de paridad:
  `AddOpenApi(o => o.OpenApiVersion = OpenApiSpecVersion.OpenApi3_0)`.
- **Diferencias cosméticas ≠ regresión**: el generador nativo produce un documento con
  formato distinto al de Swashbuckle. Se comparan **endpoints, verbos, códigos de estado y
  forma de los esquemas**, no el texto literal (ver [[preservar-comportamiento]]).
- **Transformers**: en .NET 10, `Microsoft.OpenApi` 2.x trae breaking changes en los
  transformers (entidades como interfaces `IOpenApiSchema`, sin propiedad `Nullable`,
  `OpenApiAny` → `JsonNode`). Portar los filtros de Swashbuckle exige reescribirlos, no
  traducirlos línea a línea.
- **Comentarios XML en minimal APIs**: los comentarios sobre expresiones lambda **no** se
  capturan; declara el handler como método nombrado y documenta el método.
- **Generación en build para CI**: `<OpenApiGenerateDocuments>true</OpenApiGenerateDocuments>`
  emite el documento durante el build, útil para versionar la línea base y hacer el diff sin
  levantar el servicio. YAML solo está disponible al servirlo desde el endpoint, no en build.
- **Versiones exactas de paquetes y API de opciones**: la superficie fluida de Scalar
  (`WithTitle`, `AddDocument`, `AddPreferredSecuritySchemes`, …) cambia entre majors.
  Confirmar contra la fuente oficial antes de escribirla (ver [[verificar-fuente-oficial]]):
  `https://learn.microsoft.com/aspnet/core/fundamentals/openapi/overview` y
  `https://github.com/scalar/scalar/tree/main/documentation/integrations/aspnetcore`.
  En versiones antiguas de `Scalar.AspNetCore` la UI se servía en `/scalar/v1`.

## Verificación

```bash
# 1. TFM del proyecto (determina qué exige esta regla)
grep -rhoE "<TargetFramework>[^<]+" --include=*.csproj . | sort -u

# 2. En net9.0+ NO debe quedar Swashbuckle (debe salir vacío)
grep -rniE "swashbuckle|AddSwaggerGen|UseSwaggerUI|UseSwagger\(" \
  --include=*.csproj --include=*.cs --include=*.json . | grep -v "/obj/"

# 3. Generación nativa y UI Scalar presentes (deben aparecer ambas)
grep -rnE "AddOpenApi|MapOpenApi" --include=*.cs . | grep -v "/obj/"
grep -rniE "Scalar\.AspNetCore|MapScalarApiReference" --include=*.csproj --include=*.cs .

# 4. Documento y UI no expuestos sin control (revisar cada resultado a mano)
grep -rn -B3 "MapScalarApiReference\|MapOpenApi" --include=*.cs . \
  | grep -iE "IsDevelopment|RequireAuthorization" | head

# 5. Residuo de la UI vieja en el perfil de arranque (debe salir vacío)
grep -rni "swagger" --include=launchSettings.json .
```

**Criterio de aceptación:** si el comando 1 muestra `net9.0` o superior, los comandos 2 y 5
salen vacíos y el 3 encuentra generación **y** UI; el 4 evidencia que la exposición está
condicionada por entorno o por autorización.
