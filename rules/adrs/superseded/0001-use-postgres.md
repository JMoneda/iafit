---
title: "Uso de PostgreSQL como base de datos relacional principal"
category: adrs
slug: 0001-use-postgres
version: "1.1"
last_updated: "2026-07-09"
applies_to: ["backend", "data"]
status: superseded
superseded_by: "adrs:0002-azure-sql-database"
---

> **SUPERSEDED por [[0002-azure-sql-database]] (2026-07-09).** La arquitectura de
> referencia institucional sobre Azure adopta **Azure SQL Database** como base de datos
> relacional estándar. Este ADR se conserva por trazabilidad; **no usar su decisión**.

## Contexto

Los equipos de desarrollo usaban distintas bases de datos relacionales (MySQL, SQL Server,
PostgreSQL) según preferencia del equipo, lo que dificultaba el soporte transversal,
las herramientas compartidas y las habilidades del equipo de operaciones.

## Decisión

PostgreSQL 15+ es la base de datos relacional estándar para todos los nuevos proyectos
de EAFIT. Las migraciones existentes de otros motores se evaluarán caso a caso.

## Justificación

- Soporte nativo para JSON/JSONB, arrays y tipos avanzados
- Extensiones clave ya desplegadas: `pgvector`, `postgis`, `pg_trgm`
- Equipo de operaciones con expertise consolidado en administración y monitoreo
- Licencia open source sin costos de licenciamiento

## Consecuencias

- **Positivo:** Stack unificado, tooling compartido (migraciones, backups, monitoreo)
- **Negativo:** Proyectos que requieran características específicas de otro motor necesitan
  aprobación arquitectural antes de usarlo
- Los proyectos que usan SQL Server por integración con sistemas legados quedan exentos
  mientras dure esa dependencia
