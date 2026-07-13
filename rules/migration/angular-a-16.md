---
title: "Angular → 16"
category: migration
slug: angular-a-16
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: active
---

## Salto 15 → 16

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://update.angular.dev/?v=15.0-16.0`.

## Baselines

- **Node:** `^16.14.0 || ^18.10.0`
- **TypeScript:** `4.9 / 5.0`

## Cambios de cabecera / breaking

- **Signals** (developer preview): `signal`, `computed`, `effect`.
- **Required inputs**: `@Input({ required: true })`.
- **Router component input binding**: `withComponentInputBinding()` mapea params a `@Input`.
- **`DestroyRef`** y **`takeUntilDestroyed`** (interop RxJS).
- **esbuild**: builder de desarrollo en developer preview.
- **Hydration** (SSR no destructiva) en developer preview.
- Etiquetas **self-closing** en plantillas.

## Revisión manual sugerida

- Oportunidad de empezar a introducir signals en estado local (no obligatorio).
- Revisar suscripciones manuales que puedan pasar a `takeUntilDestroyed`.

## Comando

```
ng update @angular/core@16 @angular/cli@16
```
