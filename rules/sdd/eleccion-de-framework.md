---
title: "Elección de framework SDD (OpenSpec o SpecKit)"
category: sdd
slug: eleccion-de-framework
version: "1.0"
last_updated: "2026-07-30"
applies_to: ["sdd"]
status: active
---

## Regla

**SDD es opt-in: esta regla solo aplica a proyectos que decidieron trabajar con
especificaciones.** No obliga a adoptarlo. Un proyecto sin SDD no incumple nada, y un
proyecto que ya declaró su framework **se queda con el que tiene**: esta regla no es una
orden de migrar.

Para los proyectos que sí hacen SDD:

1. **Se usa UN framework a la vez, y la elección se registra por escrito.** Tener
   `openspec/` y `.specify/` conviviendo en el mismo repositorio **no está permitido**:
   produce dos fuentes de verdad que divergen en silencio.
2. **Si vas a arrancar SDD desde cero y no tienes preferencia, empieza por OpenSpec.** No
   es un mandato: es el camino con menos fricción, porque los schemas de IAFIT ya están
   escritos en su formato. Si el equipo prefiere SpecKit, es una decisión válida que solo
   pide justificarse por escrito.

## Cuándo NO aplica esta categoría

- Proyectos que no trabajan con especificaciones. **No hay obligación de adoptar SDD.**
- Cambios que no alteran comportamiento observable: refactor interno, formato,
  actualización de dependencias sin efecto de contrato. SDD no es un peaje.
- Proyectos que ya tienen su framework declarado y funcionando: se respeta. Cambiar de
  framework solo tiene sentido si hay un motivo concreto, y entonces se hace con el flujo
  de conversión, no por alineación.

**Contexto actual (2026-07-30):** en EAFIT, SDD y los schemas de IAFIT se usan sobre todo
en **migraciones y actualizaciones** de proyectos existentes. Fuera de ese escenario, la
adopción es caso a caso.

## Justificación

La recomendación de OpenSpec para empezar no es preferencia estética. Trae de fábrica el
invariante que más cuesta sostener a mano: la **baseline viva** (`openspec archive` fusiona
los deltas en `openspec/specs/`). En SpecKit ese comportamiento hay que imponerlo por
constitución y sostenerlo con disciplina humana, porque la herramienta no lo hace sola
(ver [[equivalencias-openspec-speckit]]).

Además, el corpus de schemas de iafit ya está escrito en el formato de schemas custom de
OpenSpec (`schema.yaml` + `templates/`), así que en OpenSpec se consume directo.

## Cuándo elegir cada uno

**Elige OpenSpec cuando:**

- El proyecto va a acumular capacidades a lo largo del tiempo y necesitas una baseline
  consultable de "qué es verdad hoy" (la mayoría de los productos internos).
- Vas a usar los schemas de iafit (`research`, `migracion-incremental`,
  `inventario-tecnico`) tal cual.
- El trabajo es de comprensión o migración de legado: esos schemas producen specs que
  solo tienen sentido si se archivan en una baseline.
- Varios repos deben compartir requisitos de una plataforma común.

**Elige SpecKit cuando:**

- El equipo ya trabaja con él y el coste de mover excede el beneficio.
- Necesitas su cadena de artefactos de diseño más rica por feature (`data-model.md`,
  `contracts/`, `quickstart.md`) — típicamente APIs con contrato formal.
- Quieres gobernanza fuerte y verificable por herramienta: la constitución es leída en
  runtime por `plan` y `tasks`, y `/speckit.analyze` valida consistencia entre artefactos
  antes de implementar.
- El proyecto es una feature acotada y de vida corta, donde la baseline aporta poco.

## Obligaciones al elegir SpecKit

Elegir SpecKit **obliga** a compensar lo que la herramienta no da:

1. Instalar la constitución institucional ([[constitucion-institucional]]) antes de la
   primera feature.
2. Mantener una carpeta de specs de capacidad reconciliada al cerrar cada feature
   (invariante 3 de [[invariantes-sdd]]). Sin esto, a los seis meses no hay forma de
   saber qué hace el sistema sin leer todas las features.

## Verificación

Solo aplica si el proyecto hace SDD. Si no lo hace, no hay nada que verificar aquí.

1. El README del proyecto declara qué framework usa y, si es SpecKit, por qué.
2. No coexisten las dos raíces:

   ```bash
   ls -d openspec .specify 2>/dev/null   # debe listar UNA, no las dos
   ```

3. Si es SpecKit, existe `.specify/memory/constitution.md` y su cabecera declara de qué
   versión de la regla institucional deriva.

**Criterio de aceptación:** cualquiera que clone el repo sabe en el primer minuto qué
framework rige y dónde están las specs vigentes.
