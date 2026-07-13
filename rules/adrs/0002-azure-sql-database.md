---
title: "Azure SQL Database como base de datos relacional estándar"
category: adrs
slug: 0002-azure-sql-database
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["backend", "data"]
status: active
---

## Contexto

La arquitectura de referencia cloud de EAFIT se estandariza sobre servicios gestionados de
Azure (ver [[plataforma-azure]]). Se requiere un motor relacional gestionado, con alta
disponibilidad, cifrado y backups automáticos, alineado con Entra ID, Key Vault y la
operación institucional. El ADR previo [[0001-use-postgres]] proponía PostgreSQL, que no
corresponde con la plataforma adoptada.

## Decisión

**Azure SQL Database** es la base de datos relacional estándar para la persistencia
estructurada de los proyectos sobre la plataforma Azure de EAFIT (configuración y catálogo
de asistentes, usuarios/roles del portal, permisos, calificaciones y reseñas, métricas
agregadas, auditoría funcional). Supersede a [[0001-use-postgres]].

## Justificación

- Servicio **gestionado** con alta disponibilidad, **cifrado en reposo** y **backups
  automáticos**.
- Integración nativa con el ecosistema Azure (Entra ID, Key Vault vía MSI, Monitor).
- Acceso desde el backend .NET mediante **EF Core** (ver [[clean-architecture-dotnet]]).

## Consecuencias

- **Positivo:** stack de datos unificado con la plataforma Azure aprobada; tooling,
  seguridad y operación consistentes.
- **Negativo:** características específicas de otros motores (p. ej. `pgvector`) se cubren
  con servicios dedicados (p. ej. **AI Search** para búsqueda vectorial), no con el motor
  relacional.
- Las cadenas de conexión se almacenan en **Key Vault** y se consumen por **MSI**
  (ver [[secrets-management]]).
