---
title: "CI/CD con Azure DevOps (pipelines, Bicep, ACR)"
category: cicd
slug: azure-devops
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["all"]
status: active
---

## Regla

El ciclo de vida usa **Azure DevOps**: código en **Azure Repos (Git)**, automatización con
**Azure Pipelines (YAML reutilizables)**, imágenes en **Azure Container Registry (ACR)** e
infraestructura por **Bicep** versionado. Despliegue automatizado y controlado con **gates
por entorno** hacia **Dev, QA y Producción**. Los secretos se obtienen **solo de Key Vault**
(ver [[secrets-management]]).

## Justificación

Un pipeline estandarizado con gates y plantillas reutilizables da trazabilidad, control de
calidad y gobernabilidad, reduce errores manuales y asegura consistencia entre servicios y
entornos.

## Flujo

**a) Desarrollo y control de versiones**
- Trabajo en **ramas feature**; cambios sujetos a **Pull Request** y validaciones
  automáticas antes de integrarse a ramas protegidas (`main`/`develop`).

**b) Pipeline de PR** (al abrir PR hacia ramas protegidas)
- Escaneo de **seguridad estática**, compilación y **pruebas unitarias**; preparación para
  revisión de código.

**c) Continuous Integration (CI)** (tras aprobar el PR)
- Obtención segura de secretos desde **Key Vault**, compilación completa (backend y
  frontend), pruebas unitarias y publicación de artefactos.

**d) Continuous Deployment (CD)** (con gates)
- **Staging**: descarga de artefactos, despliegue a recursos de prueba, **validación
  funcional**.
- **Producción**: despliegue final con su gate de aprobación.

## Reglas específicas

- **Plantillas YAML reutilizables** para consistencia entre todos los servicios.
- **Despliegue modular**: pipelines separados para presentación (Static Web App) y negocio
  (Container Apps), habilitando actualizaciones independientes y **rollback selectivo**.
- **Infraestructura como Código con Bicep**, versionado en Azure DevOps: nada de recursos
  creados a mano; reproducibilidad y auditoría.
- **ACR** como registro privado de imágenes del backend, con integración a Container Apps.
- **SonarQube** integrado como gate de calidad/cobertura: **bloquea el ascenso de ambiente**
  si no se cumple el umbral (ver [[pruebas-unitarias]]).
- **Secretos exclusivamente desde Key Vault**, nunca persistidos en código o variables.
- Tres entornos (**Dev/QA/Prod**) con la misma estructura de recursos y variaciones de
  escala/acceso/monitoreo (ver [[plataforma-azure]]).
