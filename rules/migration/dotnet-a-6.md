---
title: ".NET → 6"
category: migration
slug: dotnet-a-6
version: "1.0"
last_updated: "2026-07-10"
applies_to: ["backend"]
status: active
---

## Salto 5 → 6

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad de los pasos exactos: `https://learn.microsoft.com/dotnet/core/compatibility/6.0`
y el `upgrade-assistant`.

> .NET 6 es **LTS**. Salto clave: introduce el *minimal hosting model* y modernización de sintaxis.
>
> ⚠️ **Si el proyecto es Azure Functions**, no llegas a net6 por este salto genérico sino por
> la migración de host v3→v4 (in-process). Ver [[azure-functions-a-v4-inproc]].

## Baselines

- **SDK / TFM:** `net6.0`
- **C#:** `10`
- **EF Core:** `6.x`

## Cambios de cabecera / breaking

- ⚠️ **Minimal hosting model**: `Program.cs` con *top-level statements*; se puede eliminar
  `Startup.cs` fusionando `ConfigureServices`/`Configure` en `Program.cs`. Migración opcional
  pero recomendada.
- **Implicit usings** y **file-scoped namespaces** (C# 10): reducen boilerplate.
- **Nullable reference types** habilitado por defecto en plantillas nuevas; evaluar activarlo.
- **Hot Reload** (`dotnet watch`).
- Cambios en `IHostBuilder`/`WebApplicationBuilder`; revisar arranque y registro de servicios.

## Revisión manual sugerida

- Decidir si se migra `Startup.cs` al nuevo modelo o se conserva (ambos son válidos en 6).
- Revisar registro de middlewares y DI tras el cambio de hosting.
- Activar nullable de forma incremental por proyecto.

## Comando

```
upgrade-assistant upgrade <ruta.csproj>
# o manual: <TargetFramework>net6.0</TargetFramework> + actualizar paquetes a 6.x
```
