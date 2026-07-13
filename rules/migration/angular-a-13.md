---
title: "Angular → 13"
category: migration
slug: angular-a-13
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: active
---

## Salto 12 → 13

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad de los pasos exactos: `https://update.angular.dev/?v=12.0-13.0`.

## Baselines

- **Node:** `^12.20.0 || ^14.15.0 || ^16.10.0`
- **TypeScript:** `4.4`
- **RxJS:** `7.4+` (salto desde RxJS 6 — ⚠️ revisar operadores y `toPromise` deprecado)

## Cambios de cabecera / breaking

- ⚠️ **Se elimina View Engine**: el proyecto queda **sólo Ivy**. Las librerías que
  aún publiquen en formato View Engine deben actualizarse.
- ⚠️ **Se elimina soporte de IE11**.
- **`entryComponents` deja de ser necesario** (se elimina).
- Cambios en la **API de componentes dinámicos** (`ViewContainerRef.createComponent`
  ya no requiere factory).
- **Angular Package Format (APF)** actualizado: afecta a librerías propias.
- `TestBed` y utilidades de test: revisar APIs deprecadas.

## Revisión manual sugerida

- Componentes cargados dinámicamente (antes vía `entryComponents`).
- Migración de RxJS 6 → 7 (tipos más estrictos, `toPromise`).
- Librerías internas de la empresa: reconstruir con APF de Angular 13.

## Comando

```
ng update @angular/core@13 @angular/cli@13
```
