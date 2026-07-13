---
title: ".NET → 9"
category: migration
slug: dotnet-a-9
version: "1.0"
last_updated: "2026-07-10"
applies_to: ["backend"]
status: active
---

## Salto 8 → 9

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad de los pasos exactos: `https://learn.microsoft.com/dotnet/core/compatibility/9.0`
y el `upgrade-assistant`.

> .NET 9 es **STS** (fuera de soporte); escalón de paso hacia 10 LTS.

## Baselines

- **SDK / TFM:** `net9.0`
- **C#:** `13`
- **EF Core:** `9.x`

## Cambios de cabecera / breaking

- **C# 13**: colecciones `params` (más allá de arrays), nuevo tipo `System.Threading.Lock`,
  mejoras en `ref struct`.
- **OpenAPI integrado** (`Microsoft.AspNetCore.OpenApi`): genera el documento sin Swashbuckle;
  revisar si se retira la dependencia de Swagger.
- Mejoras de rendimiento en ASP.NET Core y en el GC (modos de servidor).
- **EF Core 9**: mejoras en consultas y en el proveedor de Azure Cosmos.

## Revisión manual sugerida

- Evaluar migrar la generación de OpenAPI a la nativa y retirar Swashbuckle si no se usan
  sus extras.
- Revisar usos de `lock(obj)` que puedan beneficiarse del nuevo tipo `Lock`.
- Verificar breaking changes de EF Core 9 en consultas existentes.

## Comando

```
upgrade-assistant upgrade <ruta.csproj>
# o manual: <TargetFramework>net9.0</TargetFramework> + actualizar paquetes a 9.x
```
