---
title: ".NET → 10"
category: migration
slug: dotnet-a-10
version: "1.0"
last_updated: "2026-07-10"
applies_to: ["backend"]
status: active
---

## Salto 9 → 10

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad de los pasos exactos: `https://learn.microsoft.com/dotnet/core/compatibility/10.0`
y el `upgrade-assistant`.

> .NET 10 es **LTS** y es el **destino final** de la migración de todas las apps backend
> de la empresa.

## Baselines

- **SDK / TFM:** `net10.0`
- **C#:** `14`
- **EF Core:** `10.x`

## Cambios de cabecera / breaking

- **C# 14**: palabra clave `field` en propiedades, *extension members* (bloques `extension`),
  asignación null-condicional (`x?.P = v`), modificadores en parámetros de lambda.
- Mejoras de rendimiento en runtime, JIT y GC; mejoras en ASP.NET Core y minimal APIs.
- **EF Core 10**: revisar breaking changes de proveedor y traducción de consultas.
- Al ser destino final: consolidar cumplimiento de los estándares [[dotnet]],
  [[clean-architecture-dotnet]], observabilidad ([[logging-appinsights]]) y seguridad
  ([[secrets-management]]).

## Revisión manual sugerida

- Ejecutar la verificación de paridad contra las specs de `research` (fase 2 de
  [[proceso-migracion]]) — es el último salto, debe quedar verde.
- Adoptar `field` y *extension members* de C# 14 donde simplifiquen el código.
- Generar/actualizar el **README final** de la migración (fase 5).

## Comando

```
upgrade-assistant upgrade <ruta.csproj>
# o manual: <TargetFramework>net10.0</TargetFramework> + actualizar paquetes a 10.x
```
