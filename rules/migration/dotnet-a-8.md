---
title: ".NET → 8"
category: migration
slug: dotnet-a-8
version: "1.0"
last_updated: "2026-07-10"
applies_to: ["backend"]
status: active
---

## Salto 7 → 8

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad de los pasos exactos: `https://learn.microsoft.com/dotnet/core/compatibility/8.0`
y el `upgrade-assistant`.

> .NET 8 es **LTS** y es el estándar actual de los estándares de código de la empresa
> (ver [[dotnet]]). Salto importante en ASP.NET y EF Core.
>
> ⚠️ **Si el proyecto es Azure Functions**, en net8 debe estar ya en el modelo **isolated
> worker** (in-process es dead-end: EOL nov-2026, sin net9/10). La reescritura in-process→
> isolated se hace en [[azure-functions-a-isolated]], que aterriza justo en net8.

## Baselines

- **SDK / TFM:** `net8.0`
- **C#:** `12`
- **EF Core:** `8.x`

## Cambios de cabecera / breaking

- **C# 12**: *primary constructors* en clases/structs, *collection expressions* (`[...]`),
  alias de cualquier tipo.
- **Keyed DI services**: `AddKeyedScoped`/`GetRequiredKeyedService`.
- **`TimeProvider`** / `ITimer`: abstracción de tiempo testeable (reemplaza usos directos de
  `DateTime.Now`).
- **Native AOT** para minimal APIs.
- **Blazor unificado**: render server-side (SSR), streaming, modo `auto`.
- **EF Core 8**: *complex types*, mejoras en consultas primitivas.

## Revisión manual sugerida

- Introducir `TimeProvider` en lógica dependiente de fecha/hora para testeo.
- Evaluar keyed services donde hoy se resuelven implementaciones por convención.
- Alinear con los estándares [[dotnet]] y [[clean-architecture-dotnet]] al ser la versión base.

## Comando

```
upgrade-assistant upgrade <ruta.csproj>
# o manual: <TargetFramework>net8.0</TargetFramework> + actualizar paquetes a 8.x
```
