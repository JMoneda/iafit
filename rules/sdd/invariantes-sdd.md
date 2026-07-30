---
title: "Invariantes de SDD (independientes del framework)"
category: sdd
slug: invariantes-sdd
version: "1.0"
last_updated: "2026-07-30"
applies_to: ["all"]
status: active
---

## Regla

**Todo proyecto EAFIT que trabaje con desarrollo guiado por especificación (SDD) cumple
estos cinco invariantes, use OpenSpec o use SpecKit.** El framework decide *dónde* viven
los artefactos y *con qué comandos* se producen; no decide si estos invariantes aplican.

1. **No hay código de producción sin especificación aprobada.** Primero la spec, después
   el plan, después las tareas, después el código. Saltarse el orden no está permitido.
2. **Los requisitos son verificables.** Cada requisito se redacta con `SHALL`/`MUST`
   (nunca *should* / *may*) y tiene **al menos un escenario** en formato `WHEN` / `THEN`.
   Un requisito sin escenario no es un requisito: es una intención.
3. **La spec es línea base viva, no artefacto desechable.** Al cerrar un cambio, la spec
   queda reconciliada con el comportamiento real del sistema. Una feature nueva que toca
   una capacidad ya especificada **reconcilia** contra su spec; no la duplica.
4. **Todo se redacta en español**, salvo los identificadores que la convención del
   lenguaje exija en inglés (nombres de capacidad en kebab-case pueden ir en inglés si
   el código ya los usa así).
5. **Las reglas institucionales gobiernan por encima de la spec.** Una spec no puede
   autorizar lo que una regla de `security` prohíbe. Ante conflicto, gana la regla y se
   corrige la spec.

## Justificación

EAFIT va a tener proyectos en OpenSpec y proyectos en SpecKit conviviendo. Si cada
framework arrastra su propia definición de qué es una spec aceptable, el patrimonio de
especificaciones deja de ser comparable, revisable y portable: dos equipos escribirían
cosas distintas llamándolas igual, y mover un proyecto de un framework a otro se
convertiría en reescritura.

Estos invariantes son, deliberadamente, **el subconjunto que ambos frameworks pueden
cumplir**. Fijarlos aquí es lo que hace que cambiar de framework sea un cambio de
herramienta y no una pérdida de conocimiento (ver [[equivalencias-openspec-speckit]]).

## Cómo se materializan en cada framework

| Invariante | OpenSpec | SpecKit |
|---|---|---|
| 1. Spec antes que código | El cambio nace con `openspec new change`; `apply` va después de las tareas | `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement` |
| 2. Requisitos verificables | Formato nativo `### Requirement:` + `#### Scenario:` | Se impone vía constitución ([[constitucion-institucional]]) y se verifica con `/speckit.analyze` |
| 3. Spec como línea base | Nativo: `openspec archive` fusiona los deltas en `openspec/specs/` | **No es nativo**: hay que reconciliar de forma explícita al cerrar |
| 4. Español | Instrucciones de los schemas de iafit | Constitución + plantillas del preset |
| 5. Reglas por encima de la spec | `get_applicable_rules` antes de redactar | Constitución (que se deriva de las mismas reglas) |

La fila 3 es la brecha real entre ambos y la razón de que la constitución exista.

## Verificación (antes de cerrar un cambio SDD)

1. Cada requisito de la spec usa `SHALL`/`MUST` y tiene su escenario:

   ```bash
   # Requisitos sin ningún escenario debajo → revisar a mano
   grep -c '^### Requirement:' <ruta-spec>
   grep -c '^#### Scenario:' <ruta-spec>
   ```

   **Los escenarios llevan exactamente 4 numerales.** Con 3 numerales o con viñetas,
   OpenSpec falla en silencio: no los cuenta como escenarios.

2. En OpenSpec, `openspec validate` pasa en verde.
3. En SpecKit, `/speckit.analyze` no reporta inconsistencias entre spec, plan y tareas.
4. Las reglas aplicables se cargaron antes de redactar
   (`get_applicable_rules(tags=[...])`) y las de `security` no quedan contradichas.

**Criterio de aceptación:** un revisor puede leer la spec sin abrir el código y decir,
para cada requisito, qué prueba lo verificaría.
