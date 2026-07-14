---
title: "Los majors del ecosistema siguen al del framework"
category: migration
slug: alineacion-ecosistema
version: "1.0"
last_updated: "2026-07-14"
applies_to: ["frontend", "backend", "angular", "dotnet"]
status: active
---

## Regla

Un salto de versión **no es solo el framework**: arrastra un conjunto de paquetes cuyo
número mayor está **acoplado** al del framework. Subir Angular a `N` y dejar el
herramental en `N-1` o `N+1` produce un proyecto que compila hoy y es imposible de
diagnosticar mañana.

Al cerrar un salto a la versión `N`, **todos los paquetes acoplados están en `N`**.

## Justificación

Estos paquetes no son dependencias cualquiera: leen la configuración del framework, generan
su código o parsean su AST. Un `@angular-eslint` de una versión distinta a la de Angular
analiza plantillas con una gramática que no es la del compilador que las compila. El
resultado no es un error limpio: son falsos positivos, reglas que dejan de aplicar sin avisar
y un `ng update` del salto siguiente que falla por un conflicto de peers que nadie introdujo
conscientemente.

Y la desalineación **se hereda**: el salto siguiente parte de una base inconsistente, así que
el diagnóstico ya no distingue entre "lo rompió el salto nuevo" y "venía roto".

## Paquetes acoplados en Angular

Al subir a Angular `N`, estos van a `N` (o al rango que `N` declara):

| Paquete | Regla |
|---|---|
| `@angular/cli`, `@angular-devkit/build-angular` | Major = `N`, **siempre** |
| `@angular/material`, `@angular/cdk` | Major = `N`, **siempre** |
| `ng-packagr` (librerías) | Major = `N`, **siempre** |
| `@angular-eslint/*` (`eslint-plugin`, `schematics`, `template-parser`…) | Major = `N`, **siempre** |
| `typescript` | Al **rango exacto** que exige `N` (no "el último") |
| `zone.js` | Al rango que exige `N` |
| `rxjs` | Al rango que exige `N` |
| Node | A la baseline de `N` (ver la regla `angular-a-<N>`) |
| Librerías propias de EAFIT (`@shared/*`) | Major = `N` (ver [[librerias-publicadas]]) |

`typescript` es el que más se equivoca: Angular declara un **rango cerrado** (Angular 17:
`>=5.2 <5.5`). Instalar "el TypeScript más nuevo" rompe el compilador de Angular.

## Antipatrón (caso real: `@shared/pipes`)

```jsonc
"dependencies":    { "@angular/core": "^17.3.0" },      // Angular 17
"devDependencies": {
  "@angular/cli": "^17.3.8",                            // ✅ 17
  "ng-packagr": "^17.3.0",                              // ✅ 17
  "zone.js": "^0.14.7",                                 // ✅ rango de 17
  "typescript": "~5.4.2",                               // ✅ dentro de >=5.2 <5.5
  "@angular-eslint/eslint-plugin": "^18.1.0",           // ❌ 18 sobre Angular 17
  "@angular-eslint/schematics": "^18.1.0",              // ❌ 18 sobre Angular 17
  "@angular-eslint/template-parser": "^18.1.0"          // ❌ 18 sobre Angular 17
}
```

`@angular-eslint` en 18 sobre Angular 17: el linter analiza con las reglas de una versión que
el proyecto no usa. Nadie lo notó porque `ng lint` sigue devolviendo cero.

## Paquetes acoplados en .NET

Al subir el TFM a `netN.0`:

| Paquete | Regla |
|---|---|
| `Microsoft.EntityFrameworkCore.*` | Major = `N` |
| `Microsoft.Extensions.*` | Major = `N` |
| `Microsoft.AspNetCore.*` (los que se referencian explícitamente) | Major = `N` |
| SDK de .NET (`global.json`) | Major = `N` |
| Analizadores y `LangVersion` | A la baseline de `N` |

## Reglas específicas

- **`ng update` no lo hace todo.** Actualiza lo que conoce; `@angular-eslint`, `ng-packagr` y
  las librerías propias suelen quedarse atrás. El salto revisa el `package.json` **completo**,
  paquete por paquete.
- **Se actualiza al rango que exige el framework, no al último publicado.** "Última versión"
  no es una política de actualización.
- **Un peer dependency insatisfecho es un bloqueador**, no una advertencia. `npm install
  --legacy-peer-deps` para "hacerlo pasar" es esconder el problema: se documenta y se resuelve.
- **La desalineación detectada y no resuelta se documenta** en `notas-migracion.md` con su
  motivo, y va como hallazgo a [[sugerencias-post-migracion]].
- **Antes de empezar el salto siguiente**, el ecosistema del salto actual está alineado. No se
  encadena sobre una base inconsistente.

## Verificación

```bash
# 1. Majors de Angular vs. herramental (deben coincidir)
npm ls @angular/core @angular/cli @angular-devkit/build-angular ng-packagr \
       @angular/material @angular/cdk --depth=0

# 2. El linter debe ir en el mismo major que Angular
npm ls @angular-eslint/eslint-plugin @angular-eslint/schematics \
       @angular-eslint/template-parser --depth=0

# 3. TypeScript / zone.js / rxjs dentro del rango que exige Angular
npm ls typescript zone.js rxjs --depth=0
npm info @angular/core@<N> peerDependencies    # el rango exigido, de la fuente

# 4. Peers insatisfechos (debe salir vacío; ningún --legacy-peer-deps)
npm ls 2>&1 | grep -iE "unmet|invalid|peer dep"

# 5. .NET: paquetes acoplados al TFM
dotnet list package --outdated
grep -rn "TargetFramework" --include=*.csproj .
```

**Criterio de aceptación:** en los comandos 1 y 2 todos los majors coinciden con el destino
del salto; el 3 cae dentro del rango declarado por Angular; el 4 sale vacío.
