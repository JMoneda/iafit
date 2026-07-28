---
title: "README al día en cada cambio"
category: code-standards
slug: documentacion-readme
version: "1.0"
last_updated: "2026-07-24"
applies_to: ["all"]
status: active
---

## Regla

**Todo cambio en una aplicación DEBE actualizar su `README.md` en el mismo cambio.**
Si tocas comportamiento visible, configuración, contrato o forma de ejecutar el
proyecto y el README no lo refleja, el cambio **no está terminado**. No se cierra
la tarea (ni se marca lista para PR) hasta que el README quede consistente con lo
nuevo. Si el agente detecta que falta, **está obligado a actualizarlo antes de
finalizar**, no a pedir permiso ni a dejarlo como pendiente.

## Justificación

El README es el contrato de entrada del proyecto: cómo se instala, se configura, se
ejecuta y qué hace. Un cambio que altera cualquiera de esas cosas y deja el README
igual produce documentación que **miente**, y una doc que miente es peor que no
tenerla: el siguiente desarrollador (o agente) actúa sobre información falsa. Acoplar
la actualización del README al cambio que la causa es la única forma de que no se
quede atrás: la doc se mantiene sola porque nunca se separa del código que describe.

## Cuándo aplica (qué obliga a tocar el README)

- **Funcionalidad nueva o modificada** que el README describe o debería describir.
- **Comandos** de instalar / build / correr / probar (scripts de `package.json`, etc.).
- **Variables de entorno / configuración** nuevas, renombradas o eliminadas
  (mantener sincronizado también `.env.example` si existe).
- **Endpoints, tools, comandos de CLI o API pública** que se agregan o cambian.
- **Dependencias o requisitos** (versión de runtime, servicios externos, puertos).
- **Estructura de carpetas o puntos de entrada** que el README menciona.

## Cuándo NO aplica

Cambios que no alteran nada de lo que el README documenta: refactor interno sin
efecto observable, formato/estilo, comentarios, o tests que no cambian el contrato.
Ante la duda, revisa el README: si alguna sección quedó desactualizada por tu cambio,
aplica la regla.

## Verificación (obligatoria antes de cerrar)

1. Enumera qué tocó el cambio respecto a la lista "Cuándo aplica".

   ```bash
   git diff --name-only    # ¿qué archivos cambiaron?
   ```

2. Si algo de esa lista cambió, confirma que el README fue editado en el mismo cambio:

   ```bash
   git diff --name-only | grep -i 'readme' || echo "README NO tocado — revisar"
   ```

3. Si el README no cambió pese a que el cambio lo ameritaba, **actualízalo ahora** y
   vuelve al paso 2. Verifica de paso que comandos y variables citados en el README
   coincidan con el estado real del repo (`package.json`, `.env.example`).

**Criterio de aceptación:** no queda ninguna sección del README contradicha por el
cambio; los comandos y variables documentados ejecutan/existen tal como se describen.
Si el cambio caía en "Cuándo aplica", el diff incluye la edición del README.
