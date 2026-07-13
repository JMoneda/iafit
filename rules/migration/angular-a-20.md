---
title: "Angular → 20"
category: migration
slug: angular-a-20
version: "0.1"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: draft
---

## Salto 19 → 20

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://update.angular.dev/?v=19.0-20.0`.

> **Regla en borrador.** Los datos exactos de este salto deben completarse desde la
> guía oficial cuando se aborde. NO inventar breaking changes ni baselines.

## Por completar antes de ejecutar el salto

- **Node (mín.):** _(verificar en la guía oficial)_
- **TypeScript:** _(verificar)_
- **Cambios de cabecera / breaking:** _(verificar — p. ej. estabilización de
  signals/`effect`, APIs deprecadas que pasan a removidas, cambios en el builder)_
- **Revisión manual sugerida:** _(completar tras leer la guía)_

## Comando

```
ng update @angular/core@20 @angular/cli@20
```
