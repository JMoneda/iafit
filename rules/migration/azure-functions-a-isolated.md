---
title: "Azure Functions → modelo isolated worker"
category: migration
slug: azure-functions-a-isolated
version: "1.0"
last_updated: "2026-07-10"
applies_to: ["backend"]
status: active
---

## Salto F2: Functions v4 in-process (net6) → v4 isolated worker (net8)

Procedimiento general: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://learn.microsoft.com/azure/azure-functions/migrate-dotnet-to-isolated-model`.
Rama sugerida: `migration/<componente>-functions-isolated`.
Requisito previo: haber completado [[azure-functions-a-v4-inproc]].

> Este es el **salto arquitectónico de fondo**, no un cambio de TFM. El modelo **in-process**
> (FunctionsStartup, HttpRequestMessage, ILogger inyectado) pierde soporte en **noviembre
> 2026** y no existe para .NET 9/10. El modelo **isolated worker** es el futuro (soporta
> .NET 8/9/10) y **reescribe la capa de funciones**. Aterrizamos en **net8 (LTS)** como
> checkpoint verificable; los saltos posteriores 8→9→10 son bumps simples de TFM
> (ver [[dotnet-a-9]] y [[dotnet-a-10]]).

## Baselines

- **TFM:** `net8.0` · **modelo:** isolated worker (`dotnet-isolated`)
- **Paquetes:** `Microsoft.Azure.Functions.Worker`, `Microsoft.Azure.Functions.Worker.Sdk`
  y extensiones `Microsoft.Azure.Functions.Worker.Extensions.*`
- **`FUNCTIONS_WORKER_RUNTIME` = `dotnet-isolated`**

## Cambios de cabecera / breaking (la reescritura)

- ⚠️ **`Program.cs` reemplaza a `Startup.cs`/`FunctionsStartup`**: arranque con `HostBuilder`
  (`ConfigureFunctionsWorkerDefaults` / `FunctionsApplication`), y ahí se registra la DI.
- ⚠️ **`HttpRequestData`/`HttpResponseData`** reemplazan a `HttpRequestMessage` (y a los
  `IActionResult` del modelo in-process). Revisar lectura de body, headers y autorización.
- ⚠️ **Atributo `[Function]`** reemplaza a `[FunctionName]`.
- **Middleware isolated** (`IFunctionsWorkerMiddleware`) en vez del pipeline in-process;
  reubicar manejo transversal (excepciones institucionales de [[dotnet]], correlación).
- **Logging**: `ILogger<T>` por DI del worker o `FunctionContext.GetLogger`; configurar
  App Insights del worker (`AddApplicationInsightsTelemetryWorkerService` +
  `ConfigureFunctionsApplicationInsights`) — ver [[logging-appinsights]].
- **`.csproj`**: `<OutputType>Exe</OutputType>`, referencia al worker SDK y extensiones
  `.Worker.Extensions.*` (cambian los paquetes de bindings).
- **`local.settings.json` / App Settings**: `FUNCTIONS_WORKER_RUNTIME = dotnet-isolated`.
- **Serialización**: el worker usa `System.Text.Json` por defecto; revisar dependencias de
  `Newtonsoft.Json`.

## Revisión manual sugerida

- Inventariar **cada función** y mapear firma in-process → isolated (trigger, binding,
  entrada/salida).
- Reimplementar el manejo de errores institucional en middleware isolated
  (`AplicationCoreException` → respuesta) alineado con [[dotnet]].
- Verificar autenticación/autorización con `HttpRequestData` (no hay `HttpRequestMessage`).
- Validar paridad contra las specs de `research` antes de continuar a net9/net10.

## Comando

```
# .csproj: OutputType=Exe, TFM net8.0, paquetes worker + *.Worker.Extensions.*
# local.settings.json: "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated"
dotnet restore
func start   # prueba local del worker aislado
```
