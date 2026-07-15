---
title: "El README del API queda completo al cerrar (checklist de completitud)"
category: migration
slug: readme-api-completo
version: "1.0"
last_updated: "2026-07-15"
applies_to: ["backend", "frontend"]
status: active
---

## Regla

Al **finalizar** —el último salto de un API/componente, o el cierre del `apply`— el **README
general** del proyecto queda **completo**: no "actualizado a medias", sino con todo lo que
alguien nuevo necesita para **entenderlo, correrlo, configurarlo, probarlo y desplegarlo** sin
preguntarle a nadie. "Revisar el README" no es opinión: se contrasta contra el **checklist de
completitud** de esta regla.

Es el complemento de [[documentacion-api-cierre]] (que define **cuándo** se documenta y añade
Swagger/OpenAPI): esta regla define **qué** significa que el README esté *totalmente*
documentado.

## Justificación

El README es la puerta de entrada del proyecto. La fase de cierre existe porque
([[proceso-migracion]], fase 5) **muchos proyectos EAFIT no tienen documentación o la tienen
deficiente**: durante `research` y los walkthroughs se levantó el conocimiento del sistema, y
si no aterriza en el README se **pierde** al archivar el change. Un README incompleto —o peor,
el **boilerplate del generador**— hace que el siguiente equipo vuelva a hacer arqueología sobre
el código en vez de leer.

## Checklist de completitud (qué es "totalmente documentado")

El README general debe cubrir **todas** estas secciones. Lo que no aplique al proyecto se
marca explícitamente como "No aplica: <motivo>", no se omite en silencio.

1. **Propósito** — qué es el API/componente y qué problema resuelve, en 2–3 frases. **No** el
   texto del generador ("This project was generated with Angular CLI").
2. **Requisitos previos** — runtime y versión (**.NET SDK / Node**), herramientas, accesos
   necesarios (feed privado, suscripción Azure). Tras una migración, la versión **nueva**.
3. **Cómo correr en local** — comandos exactos (`restore`/`build`/`run` o `npm ci`/`start`),
   URL local, y cómo se levantan las dependencias (BD, storage, colas) o sus mocks.
4. **Configuración** — tabla de variables de entorno / `appsettings` requeridas: nombre, para
   qué sirve, si es obligatoria y **de dónde sale** (Key Vault para secretos, **nunca** el
   valor real — ver [[secrets-management]]).
5. **Endpoints / API pública** — resumen de los principales y **enlace a Swagger/OpenAPI**
   (ver [[documentacion-api-cierre]]); no se duplica Swagger, se orienta hacia él. En una
   librería: la superficie pública que se exporta (ver [[librerias-publicadas]]).
6. **Autenticación** — cómo se autentica un consumidor (esquema, dónde obtener el token), sin
   secretos ni tokens de ejemplo reales.
7. **Cómo se prueba** — comando para correr las pruebas y ver cobertura
   (ver [[revision-pruebas-cobertura]]).
8. **Cómo se despliega** — a alto nivel: pipeline, ambientes y gates (ver [[azure-devops]]).
9. **Estructura / arquitectura** — mapa breve de capas o carpetas para ubicarse
   (ver [[clean-architecture-dotnet]] en backend).
10. **Estado / versión** — framework y versión actual (clave **tras una migración**), y enlace
    a las notas o al historial de cambios relevante.
11. **Propiedad** — equipo dueño / cómo pedir soporte.

## Reglas específicas

- **El boilerplate del generador NO es documentación.** Si el README todavía dice "This
  project was generated with…" o solo lista `ng serve` / `ng e2e`, la fase de documentación
  **no se hizo**. Es exactamente lo que quedó en `@shared/pipes` tras migrar (ver
  [[proceso-migracion]]).
- **El README se deriva, no se inventa.** Se construye a partir de las specs de `research` y
  los walkthroughs acumulados (ver [[proceso-migracion]], [[documentacion-walkthrough]]), no se
  redacta de memoria.
- **Los comandos del README están ejecutados de verdad.** Todo comando de "correr" / "probar"
  se ejecuta y se confirma que funciona tal cual está escrito, con la evidencia del patrón
  *linear walkthrough* (ver [[documentacion-walkthrough]]). Un README con comandos que no
  corren es peor que no tener README.
- **Sin comandos ni rutas muertas.** Nada de referencias a `ng e2e` sin e2e, scripts que ya no
  existen, o endpoints removidos. La migración pudo eliminar cosas que el README aún menciona
  (ver [[residuos-de-migracion]]).
- **Sin secretos ni datos internos.** Ningún connection string, key, token o URL interna sin
  protección en ejemplos (ver [[secrets-management]], [[documentacion-api-cierre]]).
- **Es documentación, no comportamiento.** Escribir el README no altera lógica ni conexiones
  (ver [[preservar-comportamiento]]); va en **su propio commit** dentro del change.
- **Lo que falte y no se pueda completar ahora** se anota como pendiente con motivo (ver
  [[sugerencias-post-migracion]]); no se deja el hueco sin registrar.

## Verificación

```bash
# 1. ¿Sigue siendo el boilerplate del generador? (debe salir vacío)
grep -lE "This project was generated with|Run \`ng serve\`|npm run eject" README.md

# 2. Las secciones obligatorias están presentes (cada faltante se completa)
for s in "Propósito|## Qué|## Acerca" "Requisitos|Prerequisit|Prerrequisit" \
         "local|Cómo correr|Getting started" "Configuración|Variables|appsettings|## Config" \
         "Endpoints|Swagger|OpenAPI|API" "Prueba|Test|cobertura" \
         "Despliegue|Deploy|Pipeline" "Estructura|Arquitectura" ; do
  grep -qiE "$s" README.md && echo "OK  $s" || echo "FALTA $s"
done

# 3. Secretos o datos internos en el README (debe salir vacío)
grep -nEi "(password|api[_-]?key|secret|token|connectionstring|AccountKey=)\s*[:=]" README.md
grep -nE "https?://[^ )]*\.(internal|local|azurewebsites)" README.md

# 4. Rutas/comandos muertos: lo que el README dice correr, ¿existe? (revisar cada uno)
grep -oE "npm run [a-z:-]+|ng [a-z]+|dotnet [a-z]+" README.md | sort -u
#    contrastar contra package.json / el proyecto real

# 5. Los comandos de "correr" y "probar" del README se ejecutan y funcionan
#    (evidencia estilo linear walkthrough — ver 'documentacion-walkthrough')

# 6. El README quedó en su propio commit, sin cambios de código (debe salir vacío)
git show --stat HEAD -- ':!README.md' ':!*.md'
```

**Criterio de aceptación:** el comando 1 sale vacío; el comando 2 no reporta ninguna sección
"FALTA" (o cada falta está marcada como "No aplica" en el README); el comando 3 sale vacío; los
comandos del comando 4 existen en el proyecto; y los comandos de correr/probar se ejecutaron
con éxito.
