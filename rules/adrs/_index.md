---
category: adrs
description: Architecture Decision Records — decisiones de arquitectura documentadas
---

## ADRs disponibles

| slug | título | estado | ubicación |
|------|--------|--------|-----------|
| 0002-azure-sql-database | Azure SQL Database como base de datos relacional estándar | active | `adrs/` |
| ~~0001-use-postgres~~ | Uso de PostgreSQL como base de datos relacional principal | superseded → `0002-azure-sql-database` | `adrs/superseded/` |

## Cómo agregar un ADR

1. Crear archivo con nombre `NNNN-titulo-en-kebab-case.md`
2. Usar `slug: NNNN-titulo-en-kebab-case` en el frontmatter
3. Actualizar esta tabla en `_index.md`

Los ADRs no se modifican una vez aprobados; si una decisión cambia, se crea un nuevo ADR
que referencia y supercede al anterior.

## Cómo archivar un ADR reemplazado

El nombre de un ADR describe la decisión que registró en su momento, no el estado actual del
stack: `0001-use-postgres` no significa que hoy se use PostgreSQL. Para que eso no confunda
al ver el árbol de archivos, los ADRs reemplazados se **mueven a `adrs/superseded/`**:

1. Marcar en el frontmatter `status: superseded` y `superseded_by: "adrs:<slug-vigente>"`
2. Anteponer al cuerpo un aviso que apunte al ADR vigente
3. `git mv` el archivo a `adrs/superseded/` (el nombre y el `slug` **no cambian**)
4. Actualizar la tabla de arriba

La subcarpeta es solo organización: el lector recorre las categorías recursivamente, así que
el ADR archivado **sigue siendo consultable** con `get_rule("adrs", "<slug>")` y con
`list_rules`/`search_rules` usando `include_inactive: true`, y los wikilinks que lo
referencian siguen resolviendo. Archivar nunca debe equivaler a borrar: los ADRs superseded
se conservan por trazabilidad.
