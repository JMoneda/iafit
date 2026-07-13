---
title: "Plataforma Azure de referencia"
category: architecture
slug: plataforma-azure
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["backend", "frontend", "data"]
status: active
---

## Regla

Las soluciones se construyen sobre **servicios gestionados de Microsoft Azure**, de forma
**preferente sobre servicios ya aprobados institucionalmente**, siguiendo la arquitectura
de referencia cloud de EAFIT y el **Azure Well-Architected Framework**. Antes de introducir
un servicio nuevo, se revisa si ya existe uno aprobado que cubra la necesidad.

## Justificación

Estandarizar la plataforma da alta disponibilidad, gobernabilidad y eficiencia operativa,
reduce el costo de soporte transversal y evita soluciones aisladas por equipo.

## Servicios de referencia por capa

| Capa | Servicio Azure |
|------|----------------|
| Presentación | Static Web Apps (SPA Angular) + Front Door + WAF |
| Negocio — Gateway | API Management (punto único de entrada) |
| Negocio — Backend | Container Apps (microservicios .NET 8, stateless, autoescalado) |
| Negocio — Async | Workers en Container Apps (offloading de tareas pesadas) |
| Datos — Relacional | Azure SQL Database (ver [[azure-sql-database]]) |
| Datos — Archivos | Azure Blob Storage |
| IA | Azure AI Foundry / Azure OpenAI, Content Safety |
| Seguridad | Entra ID, Key Vault, RBAC/MSI |
| Observabilidad | Application Insights, Log Analytics, Azure Monitor |
| CI/CD & Plataforma | Azure DevOps (Repos, Pipelines), ACR, Bicep |

## Reglas específicas

- **Container Apps stateless** con autoescalado por carga (CPU, RPS, colas).
- **API Management** como único punto de entrada a las APIs; ningún endpoint de negocio se
  expone directo.
- **Al menos 3 entornos**: Desarrollo, QA y Producción, con la misma estructura de recursos
  y variaciones de escala/acceso/monitoreo.
- **Resiliencia obligatoria**: circuit breakers, retries y backups automatizados.
- Todo recurso se aprovisiona por **Bicep** versionado (ver [[azure-devops]]); nada manual.
