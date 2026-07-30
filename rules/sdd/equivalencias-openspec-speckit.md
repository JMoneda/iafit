---
title: "Equivalencias OpenSpec ↔ SpecKit y pérdida al convertir"
category: sdd
slug: equivalencias-openspec-speckit
version: "1.0"
last_updated: "2026-07-30"
applies_to: ["sdd"]
status: active
---

## Regla

**Convertir un proyecto entre OpenSpec y SpecKit NO es un cambio de nombres de carpeta:
los dos modelos no son isomorfos y la conversión pierde información.** Toda conversión
DEBE documentar explícitamente qué se pierde y qué se decide hacer con ello, antes de
mover un solo archivo. Una conversión que no declara su pérdida está mal hecha.

## La asimetría de fondo

| | OpenSpec | SpecKit |
|---|---|---|
| **Unidad duradera** | El **requisito**, en la baseline `openspec/specs/` | La **constitución**, en `.specify/memory/constitution.md` |
| **Unidad de trabajo** | El *cambio*: `openspec/changes/<id>/` | La *feature*: `specs/<###-nombre>/` |
| **Cómo se consolida** | `openspec archive` **fusiona los deltas** en la baseline y mueve el cambio a `changes/archive/YYYY-MM-DD-<id>/` | **No existe**: la carpeta de la feature queda como está |
| **Deltas** | Nativos: `## ADDED / MODIFIED / REMOVED Requirements` | No existen |
| **Gobernanza** | Reglas externas (en EAFIT, iafit) | Constitución versionada con semver, leída en runtime por plan/tasks |
| **Herencia entre repos** | *Stores*: repo git aparte, referenciado desde `openspec/config.yaml` (beta) | *Presets*: paquete instalable que sobrescribe plantillas y comandos |

Resumido: **OpenSpec acumula conocimiento en una baseline; SpecKit acumula gobernanza en
una constitución.** Por eso la conversión no es simétrica.

## Mapeo de artefactos

| Concepto | OpenSpec | SpecKit |
|---|---|---|
| Raíz de configuración | `openspec/config.yaml` | `.specify/` |
| Especificación de la capacidad | `openspec/specs/<capacidad>/spec.md` | *(sin equivalente directo)* |
| Propuesta del cambio | `changes/<id>/proposal.md` | `specs/<###-nombre>/spec.md` |
| Diseño técnico | `changes/<id>/design.md` | `specs/<###-nombre>/plan.md` (+ `research.md`, `data-model.md`, `contracts/`) |
| Tareas | `changes/<id>/tasks.md` | `specs/<###-nombre>/tasks.md` |
| Delta de spec | `changes/<id>/specs/<cap>/spec.md` | *(sin equivalente)* |
| Flujo de trabajo custom | `openspec/schemas/<n>/schema.yaml` + `templates/` | Preset o extension |
| Validación | `openspec validate` | `/speckit.analyze`, `/speckit.checklist` |
| Cierre | `openspec archive <id>` | `/speckit.converge` (valida código contra artefactos) |

## Qué se pierde en cada sentido

### OpenSpec → SpecKit

- **Se pierde el modelo delta/archive.** No hay destino natural para `## MODIFIED` ni
  `## REMOVED`: SpecKit no sabe fusionar.
- **Queda huérfana la baseline `openspec/specs/`.** SpecKit no tiene dónde ponerla.
- **Decisión obligatoria:** qué se hace con la baseline. La recomendación institucional
  es **conservarla** como carpeta de specs vivas y hacer que las features de SpecKit
  reconcilien contra ella (invariante 3 de [[invariantes-sdd]]). Tirarla es descartar el
  patrimonio acumulado y **no está autorizado** sin aprobación arquitectural.
- Se pierde el historial `changes/archive/` como estructura navegable por la CLI (los
  archivos siguen en git, pero ninguna herramienta los vuelve a leer).

### SpecKit → OpenSpec

- **Hay que sintetizar la baseline desde cero** a partir de N carpetas de feature. Es el
  trabajo caro y no es mecánico: features distintas pueden haber especificado la misma
  capacidad de forma **contradictoria**, y hay que resolverlo capacidad por capacidad.
- **La constitución no tiene destino nativo.** En EAFIT no se pierde: sus principios ya
  viven en el corpus de reglas de iafit (ver [[constitucion-institucional]]), que es de
  donde salió.
- `plan.md` de SpecKit es más rico que `design.md` de OpenSpec (arrastra `data-model.md`
  y `contracts/`); esos artefactos no tienen slot y hay que decidir si se conservan como
  anexos del cambio.

## Verificación de una conversión

1. Existe un documento de mapeo que enumera, **artefacto por artefacto**, origen y
   destino, y una sección explícita de "qué se pierde y qué decidimos".
2. Ningún requisito de la baseline original quedó sin destino ni sin decisión registrada.
3. La spec resultante cumple los cinco invariantes de [[invariantes-sdd]].
4. El proyecto arranca y valida en el framework destino
   (`openspec validate` / `/speckit.analyze` en verde).

**Criterio de aceptación:** alguien que no participó en la conversión puede leer el
documento de mapeo y saber qué pasó con cada requisito que existía antes.

## Nota de vigencia

Los nombres de comandos y rutas de esta regla se verificaron contra la documentación
oficial de ambos proyectos el **2026-07-30**. Ambos evolucionan rápido — SpecKit ya
renombró sus comandos a la forma `/speckit.*`. Antes de apoyarte en un comando concreto,
reconfírmalo contra la CLI instalada, según [[migration:verificar-fuente-oficial]].
