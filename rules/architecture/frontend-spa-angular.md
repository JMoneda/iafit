---
title: "Frontend SPA Angular"
category: architecture
slug: frontend-spa-angular
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: active
---

## Regla

El frontend es una **SPA en Angular/TypeScript** publicada como **Azure Static Web App**,
detrás de **Front Door + WAF** sobre HTTPS. La SPA se comunica **exclusivamente** con el
**API Gateway** (Azure API Management) mediante REST sobre JSON/HTTPS. Nunca llama directo
a los microservicios/backend ni a bases de datos.

## Justificación

Servir contenido estático desde infraestructura gestionada da escalabilidad y latencia
global sin servidores propios. Forzar que todo el tráfico pase por el gateway centraliza
seguridad (validación JWT, CORS, rate limiting) y observabilidad, y desacopla el frontend
de la topología interna del backend.

## Reglas específicas

- **Punto de entrada único:** toda llamada de datos va al API Gateway; prohibido invocar
  endpoints internos directamente.
- **Autenticación** vía Entra ID (SSO); la SPA porta tokens **JWT** emitidos por el IdP
  institucional (ver [[identidad-acceso]]).
- **Diseño responsivo y accesible**, con navegación simple y descubrimiento guiado
  (buscador, filtros, categorización) según lineamientos de diseño institucional.
- **Telemetría de front-end** con Application Insights (flujos, abandono, acciones)
  (ver [[logging-appinsights]]).
- La versión de Angular y su ruta de actualización se rigen por las reglas de
  `migration` (ver categoría migration: `angular-a-*`).

## Publicación

- **Static Web App** (o estático sobre Storage Account) + **Azure Front Door + WAF**.
- CI/CD independiente de la capa de negocio (despliegue modular, ver [[cicd:azure-devops]]).
