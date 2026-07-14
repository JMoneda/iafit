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

El salto grande no es solo "menos revisable": **ningún schematic intermedio corre**. Todas las
migraciones automáticas que traían las versiones saltadas quedan sin ejecutar, y hay que
barrerlas a mano (ver [[residuos-de-migracion]]). Es exactamente lo que le pasó a
`@shared/pipes` al ir de 12 a 17 en un commit.

## Verificación

```bash
# 1. Existe una rama por versión de la cadena
git branch -a --list '*migration*'

# 2. La rama actual sube UN solo major (revisar el diff del package.json / .csproj)
git diff <rama-padre>..HEAD -- package.json | grep -E '^[+-].*"@angular/core"'
git diff <rama-padre>..HEAD -- '*.csproj' | grep -E '^[+-].*TargetFramework'

# 3. La rama parte de la del salto anterior, no de dev/main (una vez iniciada la cadena)
git merge-base --is-ancestor <rama-salto-anterior> HEAD && echo "OK: encadenada"

# 4. El nombre sigue el patrón migration/<componente>-<framework>-<versión>
git rev-parse --abbrev-ref HEAD
```

**Criterio de aceptación:** el comando 2 muestra un salto de **una sola versión mayor**. Si
muestra varios, es un salto múltiple: ver la sección de deuda de saltos omitidos en
[[proceso-migracion]].
