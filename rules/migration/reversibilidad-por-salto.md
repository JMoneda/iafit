---
title: "Reversibilidad garantizada por salto (commit aislado + rollback)"
category: migration
slug: reversibilidad-por-salto
version: "1.0"
last_updated: "2026-07-16"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Cada salto DEBE poder **deshacerse de forma limpia**. Para ello:

- Cada salto se materializa en **su propio commit/PR aislado**, identificable como salto de
  migración y con su **origen→destino** en el mensaje (p. ej. `migración: net8 → net10`).
- Cada salto **documenta su procedimiento de reversión** (cómo volver al estado anterior).
- **Ningún salto se integra a la rama principal sin una ruta de rollback probada o
  claramente descrita.** No se mezclan dos saltos en un mismo commit.

Es la contraparte de la regla de ramas ([[convencion-ramas]]): una rama por salto **y** una
forma probada de devolver ese salto.

## Justificación

Tocar una pila fuera de soporte es arriesgado; la capacidad de revertir en **cada escalón** es
la red de contención que hace ese riesgo aceptable. Si un salto mezcla cambios o no tiene
rollback, un fallo en producción obliga a diagnosticar y deshacer a ciegas cinco versiones de
cambios acumulados. Un salto aislado y reversible se revierte con un solo `git revert` y un
`build` de confirmación.

## Reglas específicas

- **Un salto = un commit/PR.** Si un salto necesita varios commits de trabajo, se integra
  como un PR único y squasheable; no se entrelaza con otro salto.
- **El mensaje identifica el salto**: framework y versiones origen→destino, y que es
  migración (no feature ni fix). Facilita ubicarlo y revertirlo.
- **Procedimiento de reversión documentado** en `notas-migracion.md`: revertir el commit →
  restaurar `TargetFramework`/versiones de paquetes (o `package.json`/lock) previas →
  `restore` + `build` para confirmar el estado anterior.
- **Rollback probado o descrito** antes de fusionar: idealmente se ejecuta el revert en local
  y se confirma que la línea base anterior vuelve a compilar; si no se ejecuta, se describe el
  procedimiento exacto.
- **Cambios cosméticos o funcionales ajenos al salto están prohibidos** en el commit del
  salto: ensucian el diff y hacen la reversión imprecisa (ver [[preservar-comportamiento]],
  [[residuos-de-migracion]]).

## Ejemplo

```
✅ Correcto
  PR "migración: net8 (isolated) → net10" — un solo salto, mensaje claro,
  notas-migracion.md con: "revertir → git revert <sha>; restaurar TFM net8.0 en *.csproj;
  dotnet restore && dotnet build → verde". Rollback ensayado en local.

❌ Incorrecto
  Un commit que sube a net10 Y cambia la cola a Service Bus Y renombra variables.
  Revertirlo devuelve tres cosas a la vez; el diff no distingue migración de feature.
```

## Verificación

```bash
# 1. El salto es un commit/PR aislado e identificable como migración
git log --oneline -1
git log --oneline | grep -iE "migraci|migration|net[0-9]+ ?(->|→)" | head

# 2. Existe procedimiento de reversión documentado para el salto
grep -niE "revers|rollback|revert" notas-migracion.md 2>/dev/null

# 3. Ensayo de rollback: el estado anterior vuelve a compilar
git revert --no-commit HEAD && dotnet build -c Release   # luego: git revert --abort
```

**Criterio de aceptación:** el salto está en un commit/PR aislado con mensaje origen→destino,
`notas-migracion.md` describe el rollback, y el estado anterior compila al revertir. Un PR de
salto sin ruta de rollback **no se fusiona**.
