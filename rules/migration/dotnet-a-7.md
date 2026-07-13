---
title: ".NET → 7"
category: migration
slug: dotnet-a-7
version: "1.0"
last_updated: "2026-07-10"
applies_to: ["backend"]
status: active
---

## Salto 6 → 7

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad de los pasos exactos: `https://learn.microsoft.com/dotnet/core/compatibility/7.0`
y el `upgrade-assistant`.

> .NET 7 es **STS** (fuera de soporte); escalón de paso hacia 8 LTS.

## Baselines

- **SDK / TFM:** `net7.0`
- **C#:** `11`
- **EF Core:** `7.x`

## Cambios de cabecera / breaking

- **C# 11**: *raw string literals*, *generic math*, `required` members, *list patterns*.
- **Rate limiting middleware** integrado en ASP.NET Core.
- **Output caching** middleware.
- **EF Core 7**: `ExecuteUpdate`/`ExecuteDelete` (operaciones masivas sin cargar entidades),
  mapeo de columnas JSON.
- Revisar cambios de comportamiento en model binding y `System.Text.Json`.

## Revisión manual sugerida

- Sustituir bucles de actualización/borrado por `ExecuteUpdate`/`ExecuteDelete` donde aplique.
- Evaluar `required` members en DTOs y entidades.
- Revisar breaking changes de EF Core 7 en consultas complejas.

## Comando

```
upgrade-assistant upgrade <ruta.csproj>
# o manual: <TargetFramework>net7.0</TargetFramework> + actualizar paquetes a 7.x
```
