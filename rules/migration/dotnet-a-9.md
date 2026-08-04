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
- **OpenAPI integrado** (`Microsoft.AspNetCore.OpenApi`): genera el documento sin Swashbuckle.
  Microsoft **retiró Swashbuckle de la plantilla de Web API** en este salto (proyecto sin
  mantenimiento activo, incompatible con Native AOT): aquí se retira la dependencia de
  Swagger y la UI pasa a **Scalar**. Regla: [[openapi-scalar-dotnet]].
- Mejoras de rendimiento en ASP.NET Core y en el GC (modos de servidor).
- **EF Core 9**: mejoras en consultas y en el proveedor de Azure Cosmos.

## Revisión manual sugerida

- Migrar la generación de OpenAPI a la nativa, retirar Swashbuckle por completo (paquete,
  filtros, atributos, `launchUrl`) y montar la UI de Scalar — ver [[openapi-scalar-dotnet]].
  Al comparar el documento con la línea base ([[linea-base-de-contrato]]), el formato cambia
  aunque el contrato no: se comparan endpoints, verbos, códigos y esquemas.
- Revisar usos de `lock(obj)` que puedan beneficiarse del nuevo tipo `Lock`.
- Verificar breaking changes de EF Core 9 en consultas existentes.

## Comando

```
upgrade-assistant upgrade <ruta.csproj>
# o manual: <TargetFramework>net9.0</TargetFramework> + actualizar paquetes a 9.x
```
