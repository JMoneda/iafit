<!--
Recorrido lineal y narrativo de cómo funciona esta zona HOY. Describe lo que el
código HACE, no lo que debería cambiar. Redacta TODO en español.

SNIPPETS EJECUTADOS (obligatorio): NUNCA teclees código a mano. Extrae cada
fragmento con un comando (sed -n / grep -n / cat -n) y pega el COMANDO + su SALIDA
real. Usa Showboat si 'uvx showboat --help' funciona; si no, el fallback portable
de abajo. Regla del MCP: 'documentacion-walkthrough'. Sin comando, no hay snippet.
-->

## Puntos de entrada

<!-- Dónde entra la ejecución/los datos a esta zona, y quién la llama. -->
- <!-- entrada --> (`ruta/al/archivo.ts:línea`)

## Recorrido lineal

<!--
Visita numerada y en orden del camino principal, de entrada a salida. Cada paso:
prosa en español que explica QUÉ ocurre + un snippet EXTRAÍDO POR COMANDO que lo
evidencia. Sigue el flujo real de control/datos; ramifica donde el código ramifica.

Formato de cada paso (fallback portable — con Showboat, showboat exec hace lo mismo):
-->

### 1. <título del paso>

<!-- Prosa: qué hace este trozo y por qué, en el flujo. -->

```sh
sed -n '10,25p' ruta/al/archivo.ts
```
```ts
<!-- SALIDA LITERAL del comando anterior. NO editar a mano. -->
```

Evidencia: `ruta/al/archivo.ts:10-25`.

### 2. <título del paso>

<!-- ... mismo formato ... -->

## Variaciones y casos borde

<!-- Otros caminos: errores, datos vacíos, entradas alternativas, y dónde divergen. Cada afirmación con su snippet ejecutado. -->
- <!-- caso --> (`ruta:línea`)

## Cómo encajan las piezas

<!-- Síntesis breve: módulos involucrados y cómo se conectan. Un diagrama pequeño o lista ordenada va bien. -->
- <!-- ... -->

## Desviaciones de alcance

<!-- Cualquier cosa leída fuera de "En alcance", y por qué. Vacío si no hubo. -->
- Ninguna
