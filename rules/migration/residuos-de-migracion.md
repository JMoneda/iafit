---
title: "No dejar configuración a medio migrar (residuos)"
category: migration
slug: residuos-de-migracion
version: "1.0"
last_updated: "2026-07-14"
applies_to: ["frontend", "angular", "backend"]
status: active
---

## Regla

Un salto de versión no termina cuando **compila**: termina cuando **no queda configuración de
la versión anterior**. Los *residuos* son archivos y opciones que la versión nueva ya no usa,
que el build tolera en silencio y que nadie vuelve a mirar.

Cada salto cierra con un **barrido de residuos**: lo que la versión destino declara obsoleto
se elimina en **ese** salto, no "más adelante".

## Justificación

El residuo no rompe hoy; rompe en el salto siguiente, cuando ya nadie recuerda por qué está
ahí. Y como el build pasa, el equipo asume que la migración quedó completa. Es deuda que se
**compone**: cada salto omitido deja su capa, y tres saltos después el `angular.json` describe
un proyecto que no existe.

Este barrido es el precio de haber saltado un schematic. Si la cadena de saltos se respeta
(un salto = una rama, [[convencion-ramas]]), cada `ng update` ejecuta sus migraciones
automáticas y casi no hay residuo. Cuando se salta de v12 a v17 de golpe, **ningún schematic
intermedio corre** y el residuo hay que barrerlo a mano.

## Antipatrón (caso real: `@shared/pipes`, salto 12 → 17 en un solo commit)

Quedó, con el build en verde y publicado en el feed:

| Residuo | Estado real | Debía ser |
|---|---|---|
| `angular.json` → `defaultProject` | El CLI moderno lo **ignora** | Eliminado |
| `angular.json` → `cli.defaultCollection` | Deprecado desde v14 | `cli.schematicCollections: ["@angular-eslint/schematics"]` |
| `angular.json` → `test.options.polyfills: "src/polyfills.ts"` | Ruta a archivo (formato viejo) | Arreglo: `["zone.js", "zone.js/testing"]` |
| `src/polyfills.ts` | **Creado a mano en la migración** (59 líneas, comentarios sobre IE10/IE11) | No debe existir desde v15 |
| `src/test.ts` | Eliminado ✅ | (correcto) |
| `tsconfig.json` → `target: es2015`, `lib: es2018` | Angular 17 espera **ES2022** | `target: ES2022` + `useDefineForClassFields: false` |
| `src/styles.scss` | **268 líneas de variables de color** en una librería que solo tiene *pipes*, sin un solo componente | No debe existir |
| `karma.conf.js` | Carga `karma-coverage-istanbul-reporter` (deprecado) **y** `karma-coverage` | Solo `karma-coverage` |

Nótese el patrón: se **eliminó** `test.ts` (correcto) pero se **creó** `polyfills.ts`
(incorrecto). Media migración aplicada, media inventada. Y `styles.scss` es basura arrastrada
de una plantilla de aplicación a una librería que nunca renderiza nada.

## Residuos frecuentes en Angular

Fuente de verdad del salto concreto: `https://update.angular.dev/`. Lo obsoleto se confirma
ahí; esta lista es el barrido mínimo.

- **`tslint.json`, `tslint` en package.json** → migrado a ESLint (desde v12).
- **`e2e/`, `protractor.conf.js`** → Protractor está fuera de soporte.
- **`enableIvy`, `ngcc`, `entryComponents`** → no existen en Angular moderno.
- **`src/test.ts`** → innecesario desde v15; el CLI descubre los `.spec.ts`.
- **`src/polyfills.ts`** → sustituido por el arreglo `polyfills` en `angular.json`.
- **`defaultProject`, `cli.defaultCollection`** → eliminado / renombrado.
- **`target` < ES2022 en `tsconfig.json`** → Angular 15+ genera ES2022.
- **`createDefaultProgram: true`** en `.eslintrc.json` → deprecado en typescript-eslint.
- **`umdModuleIds` en `ng-package.json`** → el Angular Package Format ya no emite UMD; se
  elimina, pero **la dependencia que declaraba sigue siendo real**: pasa a
  `peerDependencies` (o a `allowedNonPeerDependencies` de ng-packagr), no al olvido
  (ver [[librerias-publicadas]]).

## Reglas específicas

- **El barrido ocurre dentro del salto**, en su rama, no como tarea diferida. Es la única
  tarea de limpieza permitida durante una migración porque **no altera comportamiento**:
  elimina configuración muerta (ver [[preservar-comportamiento]]).
- **Nunca se crea un archivo que la versión destino ya no usa.** Si el build pide un
  `polyfills.ts`, la respuesta es corregir `angular.json`, no crear el archivo.
- **Todo residuo eliminado se registra** en `notas-migracion.md`, con qué era y por qué murió.
- **Si un residuo no se puede eliminar** (algo depende de él), se documenta como hallazgo con
  su motivo (ver [[sugerencias-post-migracion]]); no se deja en silencio.
- **Archivos huérfanos**: si un archivo de configuración no lo referencia nadie
  (`styles.scss` en una librería sin componentes), se elimina. La prueba es simple: bórralo
  y que el build siga verde.

## Verificación

```bash
# 1. Residuos en angular.json (cada resultado debe eliminarse o migrarse)
grep -nE '"(defaultProject|defaultCollection)"' angular.json
grep -nE '"polyfills"\s*:\s*"' angular.json          # string = formato viejo; debe ser arreglo

# 2. Archivos que la versión destino ya no usa (deben salir vacíos)
ls src/polyfills.ts src/test.ts projects/*/src/polyfills.ts projects/*/src/test.ts 2>/dev/null
ls tslint.json protractor.conf.js e2e/ 2>/dev/null

# 3. tsconfig por debajo de la baseline del salto
grep -nE '"(target|lib|moduleResolution)"' tsconfig.json

# 4. Config de la era anterior aún referenciada
grep -rn "createDefaultProgram" .eslintrc.json 2>/dev/null
grep -rn "umdModuleIds\|enableIvy\|entryComponents" . --include=*.json --include=*.ts \
  --exclude-dir=node_modules

# 5. Reporters/plugins duplicados o deprecados
grep -n "istanbul" karma.conf.js projects/*/karma.conf.js 2>/dev/null

# 6. Archivos huérfanos: si nadie lo referencia, sobra
grep -rn "styles.scss" angular.json projects/*/ --include=*.json --include=*.ts \
  --exclude-dir=node_modules
```

**Criterio de aceptación:** los comandos 1, 2, 4 y 5 salen vacíos; el 3 cumple la baseline de
la regla `angular-a-<N>` del salto; lo del 6 que no tenga referencias se elimina y el build
sigue verde.
