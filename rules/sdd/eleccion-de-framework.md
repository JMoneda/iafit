---
title: "Elección de framework SDD (OpenSpec o SpecKit)"
category: sdd
slug: eleccion-de-framework
version: "1.0"
last_updated: "2026-07-30"
applies_to: ["all"]
status: active
---

## Regla

**Un proyecto usa UN framework SDD a la vez, y la elección se registra por escrito.**
Tener `openspec/` y `.specify/` conviviendo en el mismo repositorio **no está permitido**:
produce dos fuentes de verdad que divergen en silencio. Si se detectan ambos, se resuelve
antes de continuar cualquier trabajo de especificación.

Por defecto institucional, **OpenSpec** es el framework de arranque para proyectos nuevos
de EAFIT. Elegir SpecKit es una decisión válida pero **explícita**: se justifica y se
registra (en el README del proyecto o en un ADR).

## Justificación

El default no es una preferencia estética. OpenSpec trae de fábrica el invariante que más
cuesta sostener a mano: la **baseline viva** (`openspec archive` fusiona los deltas en
`openspec/specs/`). En SpecKit ese comportamiento hay que imponerlo por constitución y
sostenerlo con disciplina humana, porque la herramienta no lo hace sola
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

**Ninguno de los dos** si el cambio no altera comportamiento observable (refactor puro,
formato, actualización de dependencias sin efecto de contrato). SDD no es un peaje: es
para cambios que valen una spec.

## Obligaciones al elegir SpecKit

Elegir SpecKit **obliga** a compensar lo que la herramienta no da:

1. Instalar la constitución institucional ([[constitucion-institucional]]) antes de la
   primera feature.
2. Mantener una carpeta de specs de capacidad reconciliada al cerrar cada feature
   (invariante 3 de [[invariantes-sdd]]). Sin esto, a los seis meses no hay forma de
   saber qué hace el sistema sin leer todas las features.

## Verificación

1. El README del proyecto declara qué framework usa y, si es SpecKit, por qué.
2. No coexisten las dos raíces:

   ```bash
   ls -d openspec .specify 2>/dev/null   # debe listar UNA, no las dos
   ```

3. Si es SpecKit, existe `.specify/memory/constitution.md` y su cabecera declara de qué
   versión de la regla institucional deriva.

**Criterio de aceptación:** cualquiera que clone el repo sabe en el primer minuto qué
framework rige y dónde están las specs vigentes.
