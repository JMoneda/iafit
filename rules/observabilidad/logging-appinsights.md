---
title: "Logging y auditoría con Application Insights"
category: observabilidad
slug: logging-appinsights
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["all"]
status: active
---

## Regla

Toda la solución envía telemetría (métricas, logs, traces, dependencias) a **Application
Insights + Log Analytics + Azure Monitor**. Cada acción relevante del sistema se registra
como **custom event** estructurado, garantizando auditoría, depuración y trazabilidad
end-to-end, **sin almacenar información personal**.

## Justificación

Una trazabilidad estructurada permite entender el uso del portal y de los asistentes,
diagnosticar incidentes rápido y sostener auditoría certificable. Centralizar en
Log Analytics habilita consultas KQL, dashboards y alertas.

## Contextos donde se registra automáticamente

- **Inicio y finalización** de cada caso de uso o servicio.
- **Errores capturados** por try-catch, con **stack trace** y contexto técnico.
- **Operaciones automáticas** de los Workers.
- **Eventos de auditoría** de usuarios.

## Campos del custom event de auditoría

| Campo | Descripción |
|-------|-------------|
| `PK_IdLog` | Identificador único del evento (GUID). |
| `IdTipoEvento` | Tipo de evento (inicio, finalización, error, advertencia). |
| `IdUsuario` | Usuario que ejecutó la acción (trazabilidad/auditoría). |
| `DFechaHora` | Fecha y hora exacta del evento. |
| `SMensaje` | Mensaje descriptivo (p. ej. "Finaliza ejecución del caso de uso Consultar Oferta…"). |
| `SDetalles` | Información técnica adicional (errores, identificadores, datos internos). |
| `STipo` | Tipo de log (informativo, error, advertencia); vinculable a un catálogo/enum (LogEventos). |

## Reglas específicas

- **No registrar información personal** en logs ni custom events; respetar las políticas de
  privacidad.
- **Alertas** en Azure Monitor / Application Insights sobre métricas críticas: latencia de
  agentes, códigos de error, disponibilidad de APIs, consumo de AI Foundry/OpenAI.
- **Tableros/workbooks** de uso (volumen por asistente, tipo de usuario, periodo) para
  decisiones de capacidad y priorización.
- Front-end (SPA) también instrumentado con Application Insights (flujos, abandono,
  acciones frecuentes).
- Los errores de negocio (`AplicationCoreException`) se registran con su contexto
  (ver [[dotnet]]).
