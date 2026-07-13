---
title: "Convención de ramas por versión"
category: migration
slug: convencion-ramas
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Cada salto de versión de una migración vive en **su propia rama**, y se avanza
**una versión a la vez**. No se salta de la versión origen a la versión objetivo
final en una sola rama; se encadena versión por versión.

El nombre de la rama sigue el patrón:

```
migration/<componente>-<framework>-<versión-destino>
```

- `<componente>`: nombre del proyecto o librería (ej. `controls`, `dinfo-web`).
- `<framework>`: `angular`, `dotnet`, `node`, etc.
- `<versión-destino>`: la versión mayor a la que se sube en ESA rama.

## Justificación

Una rama por versión hace que cada salto sea **revisable, reversible y verificable
de forma aislada**. Si un salto rompe algo, se corrige o descarta esa rama sin
arrastrar los cambios de otros saltos. Es también la política de la empresa
(ver ejemplo `shared-controls-eafit`, con ramas `migration/controls-angular-14`,
`-15`, `-16`, `-17`).

## Reglas específicas

- **Un salto = una rama = un cambio de OpenSpec.** La rama `migration/<...>-<N>`
  contiene el cambio de OpenSpec que documenta y ejecuta la subida a la versión `N`.
- **Se parte de la rama de la versión anterior**, no de `dev`/`main` directamente,
  una vez iniciada la cadena. La primera rama de la cadena parte de la rama por
  defecto (`dev`).
- **La versión objetivo se alcanza por escalones**, respetando la ruta de
  actualización soportada por el framework (ver la matriz específica del framework).
- **Nunca se omite una versión mayor intermedia** salvo que la matriz del framework
  lo permita explícitamente.
- **El nombre de la rama se confirma con el usuario** durante el onboarding antes
  de crearla; el MCP sólo *sugiere* el nombre según este patrón.

## Ejemplos

```
✅ Correcto — cadena de ramas, un salto cada una
  dev
   └─ migration/controls-angular-14
        └─ migration/controls-angular-15
             └─ migration/controls-angular-16
                  └─ migration/controls-angular-17

❌ Incorrecto — un solo salto grande
  dev
   └─ migration/controls-angular-17   (12 → 17 de golpe)
```
