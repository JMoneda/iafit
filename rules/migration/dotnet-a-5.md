---
title: ".NET → 5"
category: migration
slug: dotnet-a-5
version: "1.0"
last_updated: "2026-07-10"
applies_to: ["backend"]
status: active
---

## Salto 3.1 → 5

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad de los pasos exactos: `https://learn.microsoft.com/dotnet/core/compatibility/5.0`
y el `upgrade-assistant`.

> Nota: tras 3.1 (LTS) la siguiente versión mayor es 5 (no existe .NET Core 4).
> .NET 5 es **STS** (fuera de soporte); es un escalón de paso hacia 6 LTS.
>
> ⚠️ **Azure Functions NO usa este salto.** Functions v3 solo corre en `netcoreapp3.1` y
> no hay runtime de Functions desplegable en .NET 5; la ruta es host v3→v4 directo a net6.
> Ver [[azure-functions-a-v4-inproc]].

## Baselines

- **SDK / TFM:** `net5.0` (antes `netcoreapp3.1`)
- **C#:** `9`
- **Runtime:** solo puede tener una versión mayor de salto; no mezclar TFM 3.1 y 5 en el mismo proyecto.

## Cambios de cabecera / breaking

- ⚠️ **Cambia el `TargetFramework`** de `netcoreapp3.1` a `net5.0` en cada `.csproj`.
- ⚠️ **WinForms/WPF quedan solo-Windows** (`net5.0-windows`) si aplica; APIs de escritorio
  no multiplataforma.
- **`System.Text.Json`** gana funcionalidad; revisar dependencias que aún usen `Newtonsoft.Json`.
- Se retiran/obsoletan APIs heredadas; revisar avisos de compilación (`SYSLIB`, `CS0618`).
- Bump de paquetes `Microsoft.AspNetCore.*` y `Microsoft.EntityFrameworkCore.*` a `5.x`.

## Revisión manual sugerida

- Actualizar `TargetFramework` en todos los `.csproj` y `global.json` (versión de SDK).
- Alinear versiones de todos los paquetes `Microsoft.*` a `5.x`.
- Revisar serialización JSON si hay dependencia fuerte de Newtonsoft.

## Comando

```
# Instalar/usar el asistente de actualización de Microsoft:
dotnet tool install -g upgrade-assistant
upgrade-assistant upgrade <ruta.csproj>

# o manual: editar <TargetFramework>net5.0</TargetFramework> y actualizar paquetes
dotnet outdated -u   # opcional, requiere la herramienta dotnet-outdated
```
