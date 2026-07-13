---
title: "Angular → 19"
category: migration
slug: angular-a-19
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: active
---

## Salto 18 → 19

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://update.angular.dev/?v=18.0-19.0`.

## Baselines

- **Node:** `^18.19.0 || ^20.11.0 || ^22.0.0`
- **TypeScript:** `5.5 / 5.6`

## Cambios de cabecera / breaking

- ⚠️ **Standalone por defecto**: los componentes/directivas/pipes son standalone
  salvo que declaren `standalone: false`. Los que aún viven en NgModule requieren
  ese flag. Hay schematic de migración.
- **Incremental hydration** (`@defer` con hidratación diferida).
- **Event replay** activado por defecto en SSR.
- Nuevas APIs de signals: `linkedSignal`, `resource()` (experimental).
- **`@let`** en plantillas (variables locales).
- Hot Module Replacement (HMR) para plantillas/estilos.

## Revisión manual sugerida

- Ejecutar el schematic de standalone; revisar componentes que deban seguir en
  NgModule (`standalone: false`).
- Validar SSR si el proyecto lo usa (hidratación incremental y event replay).

## Comando

```
ng update @angular/core@19 @angular/cli@19
```
