---
category: adrs
description: Architecture Decision Records — decisiones de arquitectura documentadas
---

## ADRs disponibles

| slug | título | estado |
|------|--------|--------|
| 0002-azure-sql-database | Azure SQL Database como base de datos relacional estándar | active |
| 0001-use-postgres | Uso de PostgreSQL como base de datos relacional principal | superseded |

## Cómo agregar un ADR

1. Crear archivo con nombre `NNNN-titulo-en-kebab-case.md`
2. Usar `slug: NNNN-titulo-en-kebab-case` en el frontmatter
3. Actualizar esta tabla en `_index.md`

Los ADRs no se modifican una vez aprobados; si una decisión cambia, se crea un nuevo ADR
que referencia y supercede al anterior.
