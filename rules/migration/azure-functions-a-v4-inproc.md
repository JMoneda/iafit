---
title: "Azure Functions → v4 (in-process)"
category: migration
slug: azure-functions-a-v4-inproc
version: "1.0"
last_updated: "2026-07-10"
applies_to: ["backend"]
status: active
---

## Salto F1: Functions v3 (in-process, net3.1) → v4 (in-process, net6)

Procedimiento general: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://learn.microsoft.com/azure/azure-functions/migrate-version-3-version-4`.
Rama sugerida: `migration/<componente>-functions-v4`.

> **Excepción al ladder genérico .NET.** En Azure Functions el eje de la migración es el
> **host runtime** (v3→v4), no el TFM. Consecuencias:
> - **`dotnet-a-5` NO aplica**: Functions v3 solo corre en `netcoreapp3.1` y v4 arranca en
>   .NET 6; no hay un runtime de Functions desplegable en .NET 5.
> - Este salto **conserva el modelo in-process** a propósito (decisión EAFIT: etapa
>   intermedia de bajo riesgo). El código de funciones **no se reescribe todavía**.
> - ⚠️ **in-process es dead-end**: pierde soporte en **noviembre 2026** y no existe para
>   .NET 9/10. El siguiente salto obligatorio migra a isolated (ver [[azure-functions-a-isolated]]).

## Baselines

- **Host runtime:** Functions **v4** (`FUNCTIONS_EXTENSION_VERSION = ~4`)
- **Core Tools:** `func` v4 (`npm i -g azure-functions-core-tools@4`)
- **TFM:** `net6.0` · **modelo:** in-process (`Microsoft.NET.Sdk.Functions`)

## Cambios de cabecera / breaking

- ⚠️ **`FUNCTIONS_EXTENSION_VERSION` = `~4`** en configuración de la app (App Settings /
  Bicep) y en `local.settings.json` para pruebas locales.
- **`TargetFramework` a `net6.0`** en el `.csproj`.
- **`Microsoft.NET.Sdk.Functions`** a la versión compatible con v4.
- **Extension bundles / extensiones NuGet** (Storage, Service Bus, Event Hubs, etc.) a
  versiones compatibles con v4; `host.json` → `extensionBundle` v4 si se usa.
- **Se conserva** `FunctionsStartup`, `HttpRequestMessage`, `[FunctionName]` e `ILogger`
  inyectado — sin cambios de código de modelo en este salto.

## Compilar la línea base v3 (3.1) sin instalar el runtime 3.1

El generador de código de Azure Functions v3 corre como paso **post-build** y es una app
.NET Core **3.1**; en una máquina sin ese runtime (EOL) el build **falla ahí aunque las
librerías compilen**. Workaround **no invasivo** (no instala nada ni edita el repo): forzar
que ese ejecutable 3.1 haga *roll-forward* a un runtime más nuevo ya instalado, mediante la
variable de entorno `DOTNET_ROLL_FORWARD=LatestMajor`, **solo para la invocación del build**.

**Regla operativa:** si la línea base es .NET Core 3.1 (ver [[linea-base-compila]]) y el build
falla en el post-build del generador de Functions v3 pidiendo el runtime 3.1, **reintenta con
`DOTNET_ROLL_FORWARD=LatestMajor` antes de declarar bloqueador**. Es solo para compilar la
base: no cambia el comportamiento, el TFM ni el `.csproj`.

```
# PowerShell
$env:DOTNET_ROLL_FORWARD = "LatestMajor"; dotnet build -c Release
# bash
DOTNET_ROLL_FORWARD=LatestMajor dotnet build -c Release
```

## Revisión manual sugerida

- Ejecutar los disparadores localmente con Core Tools v4 y validar paridad de comportamiento
  contra las specs de `research`.
- Verificar que Application Insights sigue reportando (ver [[logging-appinsights]]).
- Revisar breaking changes de cada extensión al pasar a v4.

## Comando

```
# Core Tools v4
npm i -g azure-functions-core-tools@4 --unsafe-perm true
# .csproj: <TargetFramework>net6.0</TargetFramework> y paquetes a v4
dotnet restore
func start   # prueba local
# Deploy: asegurar App Setting  FUNCTIONS_EXTENSION_VERSION = ~4
```
