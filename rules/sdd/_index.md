---
category: sdd
description: Desarrollo guiado por especificación (SDD) — invariantes, elección entre OpenSpec y SpecKit, y la constitución institucional heredable
---

## Reglas disponibles

| slug | título | aplica a |
|------|--------|----------|
| invariantes-sdd | Invariantes de SDD (independientes del framework) | sdd |
| eleccion-de-framework | Elección de framework SDD (OpenSpec o SpecKit) | sdd |
| equivalencias-openspec-speckit | Equivalencias OpenSpec ↔ SpecKit y pérdida al convertir | sdd |
| constitucion-institucional | Constitución institucional de ingeniería EAFIT (heredable por SpecKit) | sdd |

## Cómo se relacionan

`invariantes-sdd` es la base: lo que se cumple sea cual sea el framework.
`eleccion-de-framework` decide cuál se usa y qué obliga esa decisión.
`equivalencias-openspec-speckit` documenta el mapeo y la pérdida al convertir.
`constitucion-institucional` es el artefacto que hace cumplir todo lo anterior en
proyectos SpecKit, que es donde el framework no lo garantiza solo.

## Alcance: SDD es opt-in

Estas reglas llevan el tag de **contexto** `sdd`, no `all`. Es deliberado: **no todos los
proyectos hacen SDD, y los que no lo hacen no deben recibir estas reglas**. Solo aparecen en
`get_applicable_rules` cuando se pide explícitamente ese tag; el prompt `iafit-sdd` y el de
migración lo añaden, y el de desarrollo no.

Hoy, en EAFIT, SDD y los schemas de IAFIT se usan sobre todo en **migraciones y
actualizaciones** de proyectos existentes. Fuera de ese escenario la adopción es caso a
caso, y un proyecto que ya tiene su framework declarado se queda con el que tiene.

> El detalle por stack (Angular, .NET, Azure) sigue viviendo en `architecture`,
> `code-standards` y `security`, y esas sí aplican con o sin SDD.

## Vigencia

Los nombres de comandos, rutas y mecanismos de OpenSpec y SpecKit citados en estas reglas
se verificaron contra la documentación oficial el **2026-07-30**. Ambos proyectos
evolucionan rápido: reconfirma contra la CLI instalada antes de apoyarte en un comando
concreto.
