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

## Dónde mirar (una migración siempre deja hallazgos)

Un `sugerencias-refactor.md` vacío casi siempre significa que **no se buscó**, no que el
proyecto esté limpio. Barrido mínimo antes de dar por cerrada la migración:

- **Código heredado sin tipar**: `any` explícito, firmas públicas sin tipo
  (ver [[angular]], [[typescript]]).
- **Puentes temporales que quedaron puestos**: `UntypedFormGroup`, `mat-legacy-*`,
  `--legacy-peer-deps`. Funcionan, y por eso nadie los quita.
- **Dependencias no declaradas o no tree-shakeables** en librerías publicadas
  (ver [[librerias-publicadas]]).
- **Cobertura y umbrales simbólicos** (ver [[pruebas-frontend-angular]]).
- **Modernización disponible y no aplicada**: standalone components/pipes, signals,
  `takeUntilDestroyed`, control flow (`@if`/`@for`). Son mejoras, **no** parte del salto.
- **Residuos que no se pudieron eliminar** y por qué (ver [[residuos-de-migracion]]).

## Verificación

```bash
# 1. El entregable existe y no está vacío
test -s openspec/changes/<change-id>/sugerencias-refactor.md && echo "OK"

# 2. Los hallazgos anotados durante los saltos llegaron al consolidado
grep -rn "sugerencia\|hallazgo\|diferid" openspec/changes/*/notas-migracion.md

# 3. Cada vulnerabilidad tiene su HU en Azure DevOps (tool create_work_item)
grep -nE "HU sugerida|#[0-9]+" openspec/changes/<change-id>/sugerencias-refactor.md

# 4. Nada de esto se implementó dentro de la migración (debe salir vacío):
#    el cierre es SOLO documentación
git diff <rama-base>..HEAD --stat -- ':!*.md'
```

**Criterio de aceptación:** el comando 1 pasa; toda vulnerabilidad del 3 tiene HU creada o
marcada "por crear"; el comando 4 no muestra cambios de código en el commit de cierre.
