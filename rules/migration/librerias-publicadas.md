---
title: "Migrar una librería publicada: el manifiesto es el contrato"
category: migration
slug: librerias-publicadas
version: "1.0"
last_updated: "2026-07-14"
applies_to: ["frontend", "angular", "libreria"]
status: active
---

## Regla

Una **librería publicada** (feed de Azure Artifacts, npm privado) no se migra como una
aplicación. Una app se despliega y se prueba a sí misma; una librería se **publica** y la
prueban terceros que no ves. Su superficie de contrato es doble:

1. **`public-api.ts`** — qué se exporta.
2. **El `package.json` de la librería** (`projects/<lib>/package.json`, el que ng-packagr
   empaqueta) — qué necesita para funcionar en casa ajena.

**Todo símbolo de terceros importado por código alcanzable desde `public-api.ts` debe estar
declarado en el `package.json` de la librería**, en `peerDependencies` o `dependencies`.
El `package.json` de la raíz **no se publica**: lo que esté solo ahí no existe para el
consumidor.

## Justificación

Una dependencia usada pero no declarada (*dependencia fantasma*) **funciona en el repo de la
librería** — está en el `node_modules` de la raíz — y **funciona en muchos consumidores por
accidente**, porque npm la instaló plana por otra razón. Falla en el consumidor que no la
tenga, y el error aparece lejos del culpable: en el build de otro equipo, semanas después.
El repo de la librería nunca reproduce el fallo, así que nadie lo atribuye a la librería.

## Antipatrón (caso real: `@shared/pipes`, salto 12 → 17)

`order-array.pipe.ts` — exportado en `public-api.ts` — importa lodash:

```ts
import * as _ from 'lodash';   // ← en tiempo de ejecución, en el paquete publicado
```

Pero el manifiesto publicado declara únicamente `tslib`:

```jsonc
// projects/pipes/package.json — lo que recibe el consumidor
{
  "peerDependencies": { "@angular/common": "^17.3.0", "@angular/core": "^17.3.0" },
  "dependencies": { "tslib": "^2.3.0" }        // ← lodash no aparece por ningún lado
}
```

Y la migración **eliminó** la única declaración que quedaba de lodash como externo:

```diff
  // projects/pipes/ng-package.json
  "lib": {
-   "entryFile": "src/public-api.ts",
-   "umdModuleIds": { "lodash": "lodash" }
+   "entryFile": "src/public-api.ts"
  }
```

`@types/lodash` quedó en el `package.json` de la **raíz** (devDependencies), que no se
publica: da tipos al compilar la librería y ninguna garantía al consumidor.

Además, `import * as _` importa **lodash entero** y **no es tree-shakeable**: el consumidor
carga toda la librería para usar un `orderBy`.

```ts
// ✅ Import puntual, tree-shakeable, y lodash declarado como peerDependency
import { orderBy } from 'lodash-es';
```

## Reglas específicas

- **Cruce imports ↔ manifiesto en cada salto.** Todo import de terceros bajo `src/lib/` debe
  aparecer en el `package.json` de la librería. Es lo primero que se revisa, no lo último.
- **`peerDependencies` para lo que el consumidor ya tiene** (Angular, RxJS) y para librerías
  que deben ser una sola instancia. **`dependencies` para lo que la librería trae consigo**
  (tslib). Ante la duda en Angular: peer.
- **Prohibido `import * as X from '<paquete>'`** en código publicado: rompe el tree-shaking.
  Imports puntuales o eliminar la dependencia (`order-array` podía usar el `core/utils/utils`
  que la propia librería ya tiene).
- **Subir Angular obliga a subir `peerDependencies`.** El rango de `@angular/core` y
  `@angular/common` del manifiesto se actualiza en el mismo salto, o el consumidor instala
  una librería que declara soportar una versión que ya no soporta.
- **El artefacto que se valida es el `.tgz`, no el `dist/`.** El único smoke test que cuenta
  es instalar el paquete empaquetado en un proyecto limpio, fuera del monorepo.
- **No se publica desde una rama de migración** sin la verificación de paridad aprobada
  ([[preservar-comportamiento]]): una versión mala en el feed la consumen terceros y no se
  revierte con un `git reset`.
- **Un salto de Angular = un major de la librería** (ver [[alineacion-ecosistema]]). La
  versión de `projects/<lib>/package.json` y la de la raíz se mantienen sincronizadas.

## Verificación

```bash
# 1. Dependencias fantasma: todo import de terceros vs. el manifiesto publicado
#    Lista los paquetes importados por el código de la librería...
grep -rhoE "from '(@?[a-z0-9][^'./][^']*)'" projects/<lib>/src/lib \
  | sed -E "s/from '//; s/'//" | grep -v '^@angular/' | sort -u
#    ...y compáralos contra lo declarado. Todo lo de arriba debe estar aquí:
cat projects/<lib>/package.json

# 2. Imports no tree-shakeables en código publicado (debe salir vacío)
grep -rn "import \* as" projects/<lib>/src/lib

# 3. peerDependencies alineadas con el salto (debe reflejar la versión destino)
grep -A3 peerDependencies projects/<lib>/package.json

# 4. Smoke test del artefacto real — el único que prueba el contrato
ng build <lib>
cd dist/<lib> && npm pack
mkdir /tmp/smoke && cd /tmp/smoke && npm init -y
npm install /ruta/al/<lib>-<version>.tgz    # debe resolver sin peers faltantes
node -e "require('<paquete>')"              # debe cargar sin 'Cannot find module'
```

**Criterio de aceptación:** todo paquete del comando 1 aparece en el manifiesto de la
librería; el comando 2 sale vacío; el `npm install` del comando 4 no reporta
`unmet peer dependency` ni `Cannot find module`.
