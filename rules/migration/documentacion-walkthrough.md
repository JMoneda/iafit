---
title: "Documentación con snippets ejecutados (Linear walkthrough / Showboat)"
category: migration
slug: documentacion-walkthrough
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Cuando generes un `walkthrough.md` (o cualquier documento que muestre código del
proyecto), **NUNCA transcribas los fragmentos de código a mano**. Extráelos
ejecutando comandos (`sed -n`, `grep -n`, `cat -n`) y **embebe el comando junto con
su salida real**. La narrativa va en español; el código queda tal cual lo devuelve
el comando.

## Justificación

Copiar código a mano introduce riesgo de **alucinación**: el modelo puede alterar
una línea, un tipo o un número. Si el snippet proviene de la salida de un comando,
es imposible que esté inventado: es el archivo real. Es el núcleo del patrón
"Linear walkthrough" de Simon Willison. Además, mostrar `archivo:línea` como
**evidencia ejecutada** hace el documento auditable y reproducible.

## Herramienta: Showboat (preferida) con fallback portable

**Detección primero.** Al empezar, comprueba si Showboat está disponible:

```
uvx showboat --help
```

- **Si funciona** → usa Showboat:
  - `showboat note "<markdown en español>"` para toda la prosa/comentario.
  - `showboat exec "<comando>"` para incluir snippets: el comando extrae el código
    (`sed -n '10,25p' ruta/al/archivo.ts`, `grep -n "patrón" ruta`, `cat -n ruta`)
    y Showboat pega el comando y su salida en el documento.
  - Aprende los subcomandos exactos desde `uvx showboat --help`; no asumas flags.

- **Si `uvx`/`uv` NO está instalado** → fallback portable (mismo resultado, sin
  dependencia): tú ejecutas los comandos de extracción y pegas en `walkthrough.md`
  un bloque por cada snippet con **el comando y su salida literal**:

  ~~~
  ```sh
  sed -n '10,25p' src/app/foo.ts
  ```
  ```ts
  <salida literal del comando — NO editada a mano>
  ```
  ~~~

## Reglas específicas

- **Un snippet = un comando.** Nada de código pegado sin su comando de origen.
- **Rangos pequeños y precisos** (`sed -n 'A,Bp'`), no volcar archivos enteros.
- **La cita `archivo:línea` debe coincidir** con el rango del comando mostrado.
- **La prosa explica; el comando prueba.** Sin "debería", sin recomendaciones: es
  descripción de lo que el código HACE hoy (ver el schema `research`).
- En Windows, usa la shell Bash (Git Bash) para `sed`/`grep`/`cat`; si sólo hay
  PowerShell, el equivalente es `Get-Content ruta | Select-Object -Skip A -First N`,
  pero muestra igualmente el comando y su salida.

## Ejemplo (fallback portable)

```sh
sed -n '1,8p' src/app/clima/openmeteo.client.ts
```
```ts
export class OpenMeteoClient {
  private readonly base = 'https://api.open-meteo.com/v1';
  constructor(private http: HttpClient) {}
  // ...
}
```
> El bloque `ts` es la salida del `sed`, no texto tecleado. Así se garantiza que el
> snippet es fiel al archivo real (`src/app/clima/openmeteo.client.ts:1-8`).
