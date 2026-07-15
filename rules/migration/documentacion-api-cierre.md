---
title: "Documentación del API al cerrar el apply (README + Swagger/OpenAPI)"
category: migration
slug: documentacion-api-cierre
version: "1.0"
last_updated: "2026-07-12"
applies_to: ["backend"]
status: active
---

## Regla

Al **cerrar el `apply`** de un salto —y de forma consolidada en el último salto de cada
API— se deja el API **lo mejor documentado posible**:

1. **README del API completo**: contra el checklist de completitud de
   [[readme-api-completo]] —propósito, requisitos, cómo correr en local, configuración,
   endpoints, autenticación, pruebas y despliegue—, no solo "actualizado a medias".
2. **Swagger / OpenAPI presente y correcto**: si el API **no lo tiene, se implementa**; si lo
   tiene, se verifica que refleje los endpoints actuales.

Se hace **después de verificar paridad** y en **su propio commit** dentro del change (para
trazabilidad).

## Reconciliación con `preservar-comportamiento`

La documentación de API (README + OpenAPI/Swagger) es **infraestructura de documentación**,
no lógica de negocio ni conexiones (ver [[preservar-comportamiento]]). Implementar Swagger
solo **expone el contrato ya existente**: NO cambia la firma ni el comportamiento de los
endpoints. Requisitos:

- El build sigue **verde** y la **paridad intacta** tras añadir la documentación.
- **No exponer información sensible** en el doc (secretos, ejemplos con datos reales,
  endpoints internos sin protección) — evitar divulgación de información (CWE-200/210).
- Si el API va detrás de API Management (ver [[plataforma-azure]]), el Swagger no debe
  quedar público sin control.

## Cómo implementarlo según el stack

- **ASP.NET Core ≤ .NET 8**: `Swashbuckle.AspNetCore` (`AddSwaggerGen` + `UseSwaggerUI`),
  con comentarios XML habilitados para enriquecer el doc.
- **ASP.NET Core .NET 9/10**: OpenAPI integrado `Microsoft.AspNetCore.OpenApi`
  (`AddOpenApi`/`MapOpenApi`) + una UI (Swagger UI o Scalar). Ver [[dotnet-a-9]].
- **Azure Functions**: extensión OpenAPI de Functions, no Swashbuckle.
  - in-process: `Microsoft.Azure.WebJobs.Extensions.OpenApi`.
  - isolated: `Microsoft.Azure.Functions.Worker.Extensions.OpenApi`.
  Ver [[azure-functions-a-v4-inproc]] y [[azure-functions-a-isolated]].

## Reglas específicas

- **Anotar** endpoints, modelos de request/response y códigos de estado; usar los comentarios
  XML del código cuando existan.
- **No implementar lógica** en este paso: solo documentación y su andamiaje.
- Si añadir Swagger implicara algún riesgo de exposición, **protegerlo** (auth / no público)
  o dejarlo como **sugerencia** (ver [[sugerencias-post-migracion]]) en vez de exponerlo.
