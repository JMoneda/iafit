---
category: sdd
description: Desarrollo guiado por especificación (SDD) — invariantes, elección entre OpenSpec y SpecKit, y la constitución institucional heredable
---

## Reglas disponibles

| slug | título | aplica a |
|------|--------|----------|
| invariantes-sdd | Invariantes de SDD (independientes del framework) | all |
| eleccion-de-framework | Elección de framework SDD (OpenSpec o SpecKit) | all |
| equivalencias-openspec-speckit | Equivalencias OpenSpec ↔ SpecKit y pérdida al convertir | all |
| constitucion-institucional | Constitución institucional de ingeniería EAFIT (heredable por SpecKit) | all |

## Cómo se relacionan

`invariantes-sdd` es la base: lo que se cumple sea cual sea el framework.
`eleccion-de-framework` decide cuál se usa y qué obliga esa decisión.
`equivalencias-openspec-speckit` documenta el mapeo y la pérdida al convertir.
`constitucion-institucional` es el artefacto que hace cumplir todo lo anterior en
proyectos SpecKit, que es donde el framework no lo garantiza solo.

> Estas reglas son de **aplicación transversal**: no dependen del stack, sino de que el
> proyecto trabaje con especificaciones. El detalle por stack (Angular, .NET, Azure) sigue
> viviendo en `architecture`, `code-standards` y `security`.

## Vigencia

Los nombres de comandos, rutas y mecanismos de OpenSpec y SpecKit citados en estas reglas
se verificaron contra la documentación oficial el **2026-07-30**. Ambos proyectos
evolucionan rápido: reconfirma contra la CLI instalada antes de apoyarte en un comando
concreto.
