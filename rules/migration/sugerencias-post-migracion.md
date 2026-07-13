---
title: "Sugerencias de refactor y hallazgos al cerrar la migración"
category: migration
slug: sugerencias-post-migracion
version: "1.0"
last_updated: "2026-07-12"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Al **terminar** la migración de una API/componente (paridad verificada y README final), se
consolidan las **vulnerabilidades** y **mejoras** detectadas durante el proceso como
**sugerencias de refactorización adicional**, documentadas **por API**. No se implementan
aquí: son insumo para **changes futuros separados** (ver [[preservar-comportamiento]]).

Los hallazgos se van anotando en cada salto (sección de sugerencias diferidas de
`notas-migracion.md`) y al cierre se consolidan en un entregable **`sugerencias-refactor.md`**,
junto al README final.

## Justificación

Durante la migración está prohibido alterar comportamiento, así que las mejoras y los
riesgos de seguridad que se ven de paso **no se pierden**: se capturan para abordarlos con
intención, priorizados y auditables, sin contaminar la migración.

## Qué registrar (por API/componente)

| Campo | Contenido |
|-------|-----------|
| API / componente | A qué aplica |
| Tipo | vulnerabilidad / mejora / deuda técnica |
| Hallazgo | Qué se observó, dónde |
| Riesgo o beneficio | Por qué importa |
| Prioridad | alta / media / baja |
| Esfuerzo estimado | S / M / L |
| Referencia | CWE/ASVS si es seguridad; HU si ya existe |

## Reglas específicas

- **Vulnerabilidades → work item.** Cada hallazgo de seguridad se propone como **HU en Azure
  DevOps** (crear con la tool `create_work_item`), citando CWE/ASVS cuando aplique — nunca se
  corrige dentro de la migración.
- **Nada se implementa** en el cierre: `sugerencias-refactor.md` es solo documentación.
- **Priorizar** para que el backlog sea accionable; no listar por listar.
- **Trazabilidad**: si el hallazgo ya se anotó en `notas-migracion.md` de un salto, enlazarlo.

## Estructura sugerida de `sugerencias-refactor.md`

```markdown
# Sugerencias de refactor — <API/componente>

## Vulnerabilidades
- **<hallazgo>** · CWE/ASVS: <ref> · Prioridad: <alta/media/baja> · Esfuerzo: <S/M/L>
  → Propuesta: <cambio sugerido> · HU sugerida: <#id o "por crear">

## Mejoras / deuda técnica
- **<hallazgo>** · Beneficio: <cuál> · Prioridad: <...> · Esfuerzo: <...>
  → Propuesta: <cambio sugerido en change separado>
```
