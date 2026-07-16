---
title: "Re-verificar EOL y breaking changes contra la fuente oficial"
category: migration
slug: verificar-fuente-oficial
version: "1.0"
last_updated: "2026-07-16"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Las **fechas de fin de soporte (EOL)** y las **listas de breaking changes** se **re-verifican
contra la documentación oficial en el momento de ejecutar cada salto**. Nunca se confía en
fechas memorizadas, ni en la memoria del agente, ni en este catálogo de reglas como fuente de
verdad de fechas o de la lista exacta de rupturas. Cada salto **registra las referencias
oficiales consultadas** (URL + qué se confirmó).

## Justificación

Las fechas de soporte y las matrices de compatibilidad **cambian y caducan**; una fecha
memorizada o escrita en una regla envejece y lleva a decidir sobre datos falsos (avanzar a una
versión ya fuera de soporte, o creer que aún hay tiempo cuando no lo hay). La única fuente
válida es la oficial, consultada **en el momento**. Registrar la referencia hace la decisión
**auditable y reproducible**: se puede saber qué se consultó, cuándo y qué decía.

## Reglas específicas

- **Fuentes de verdad**:
  - .NET → **release lifecycle** (`https://dotnet.microsoft.com/platform/support/policy/dotnet-core`)
    y **breaking changes** (`https://learn.microsoft.com/dotnet/core/compatibility/`).
  - Angular → **update guide** (`https://update.angular.dev/`) y
    **release schedule/soporte** (`https://angular.dev/reference/releases`).
  - Azure Functions → matriz de host/runtime y fin del modelo in-process
    (`https://learn.microsoft.com/azure/azure-functions/`).
- **Ninguna regla del catálogo es fuente de fechas.** Las reglas `dotnet-a-*`, `angular-a-*`,
  [[alineacion-ecosistema]] y [[azure-functions-a-isolated]] orientan el *qué*; la fecha y la
  lista de rupturas se confirman contra la fuente oficial al ejecutar.
- **Se registra la consulta** en `notas-migracion.md` (o `ruta.md`): URL, fecha de consulta y
  el dato confirmado (p. ej. "in-process EOL confirmado a nov-2026 el 2026-07-16").
- **Si la fuente contradice una regla o una fecha asumida**, manda la fuente oficial; se
  anota la discrepancia como hallazgo (ver [[sugerencias-post-migracion]]).

## Ejemplo

```
✅ Correcto
  Antes del salto a net10: se abre learn.microsoft.com/dotnet/core/compatibility/10.0,
  se listan las rupturas aplicables y se anota la URL + fecha en notas-migracion.md.

❌ Incorrecto
  "Sé que .NET 6 sale de soporte en noviembre de 2024, no hace falta verificar."
  → dato memorizado; puede estar mal o desactualizado. Se re-verifica siempre.
```

## Verificación

```bash
# 1. El registro de la migración cita fuentes oficiales para el salto (no debe salir vacío)
grep -nE "learn\.microsoft\.com|dotnet\.microsoft\.com|update\.angular\.dev|angular\.dev" \
  notas-migracion.md ruta.md 2>/dev/null

# 2. Cada referencia trae fecha de consulta (patrón URL + fecha)
grep -nE "https?://.*\b(20[0-9]{2}-[0-9]{2}-[0-9]{2})" notas-migracion.md 2>/dev/null
```

**Criterio de aceptación:** el registro del salto incluye al menos una **referencia oficial
con fecha de consulta** para las decisiones de EOL/rupturas de ese salto. Sin ese registro, la
compuerta de trazabilidad del salto no está cumplida (ver [[compuertas-de-salto]]).
