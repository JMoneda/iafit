---
title: "Constitución institucional de ingeniería EAFIT (heredable por SpecKit)"
category: sdd
slug: constitucion-institucional
version: "1.0"
last_updated: "2026-07-30"
applies_to: ["all"]
status: active
---

## Regla

**Todo proyecto EAFIT que use SpecKit DEBE instalar esta constitución antes de su primera
feature.** El bloque de abajo es un `constitution.md` completo y válido: se copia tal cual
a `.specify/memory/constitution.md`, sin reescribirlo ni resumirlo. Los proyectos pueden
**añadir** principios propios; **no pueden debilitar ni eliminar** los que vienen aquí.

Los proyectos OpenSpec no necesitan instalarla: sus principios ya los aplica el MCP a
través de las reglas de las que esta constitución deriva.

## Justificación

SpecKit tiene una pieza que OpenSpec no tiene: una constitución versionada que `plan` y
`tasks` **leen en runtime**, y contra la que `/speckit.analyze` valida antes de
implementar. Es el único punto del framework donde se puede inyectar gobernanza que la
herramienta haga cumplir sola.

Por eso la constitución es el vehículo natural para dos cosas a la vez: las políticas
transversales de EAFIT (seguridad, pruebas, documentación, español) y el invariante que a
SpecKit le falta de fábrica — la spec como línea base viva, que en OpenSpec resuelve
`openspec archive` (ver [[equivalencias-openspec-speckit]]).

**Deriva del corpus de reglas, no lo sustituye.** Cada principio apunta a la regla de la
que sale; la regla sigue siendo la fuente de verdad y el detalle operativo.

## Constitución (copiar tal cual)

````markdown
# Constitución de Ingeniería — EAFIT

## Core Principles

### I. Español como idioma de trabajo
Todo artefacto —specs, planes, tareas, código, comentarios, mensajes de commit y
documentación— se redacta en español. Se exceptúan únicamente los identificadores que la
convención del lenguaje exija en inglés, y los nombres de capacidad en kebab-case cuando
el código ya los usa así. Un artefacto en inglés se devuelve para traducción; no se
aprueba "por esta vez".

### II. Ninguna línea de producción sin especificación aprobada
El orden es spec → plan → tareas → implementación, y no se invierte ni se comprime.
Antes de redactar la spec se cargan las reglas institucionales aplicables al stack
(MCP iafit, `get_applicable_rules`). Implementar con la spec "en paralelo" o "a
posteriori" no cumple este principio.

### III. Requisitos verificables o no son requisitos
Cada requisito se enuncia con SHALL o MUST —nunca *should* ni *may*— y lleva al menos un
escenario en formato WHEN / THEN. El formato es obligatorio y literal:

- Requisito: encabezado de 3 numerales, `### Requirement: <nombre>`
- Escenario: encabezado de **exactamente 4 numerales**, `#### Scenario: <nombre>`

Tres numerales o viñetas en un escenario lo invalidan. Criterio de aceptación: un revisor
debe poder nombrar, para cada requisito, la prueba que lo verificaría.

### IV. La especificación es línea base viva
Las specs describen lo que el sistema hace hoy, no lo que se propuso alguna vez. Al cerrar
una feature, sus requisitos se reconcilian contra la carpeta de specs de capacidad del
proyecto: si la capacidad ya estaba especificada, se actualiza esa spec; no se crea una
segunda descripción de lo mismo. Una feature cerrada que deja la baseline desactualizada
no está cerrada.

### V. La seguridad no se negocia en una spec
Ninguna especificación, plan o tarea puede autorizar lo que las políticas de seguridad
institucionales prohíben: gestión de secretos fuera de Key Vault, identidad y control de
acceso al margen de Entra ID/RBAC/MSI, o exposición sin la protección de borde definida.
Ante conflicto entre una spec y una política de seguridad, la política gana y la spec se
corrige. Referencia normativa: reglas de la categoría `security` del MCP iafit.

### VI. La documentación viaja con el cambio
Todo cambio que altere comportamiento visible, configuración, contrato o forma de ejecutar
el proyecto actualiza el README en el mismo cambio. Si el README no lo refleja, el cambio
no está terminado. Referencia normativa: `code-standards:documentacion-readme`.

### VII. Pruebas y observabilidad son parte del entregable
Las pruebas acompañan a la implementación en el mismo cambio; no son una fase posterior ni
un ticket aparte. El comportamiento nuevo queda instrumentado (telemetría y errores) según
la regla de observabilidad institucional. Una feature sin pruebas no pasa la compuerta de
cierre, aunque funcione. Referencias normativas: categorías `pruebas` y `observabilidad`
del MCP iafit.

## Restricciones de plataforma y stack

La arquitectura de referencia es la plataforma Azure institucional. Los estándares
concretos por stack —Clean Architecture en .NET, SPA en Angular, estándares de TypeScript,
CI/CD sobre Azure DevOps— **no se reproducen aquí**: viven en el MCP iafit y se consultan
con `get_applicable_rules(tags=[...])` al inicio de cada feature, porque cambian a un ritmo
distinto al de esta constitución.

Esta constitución fija el marco; el MCP entrega el detalle vigente. Si un plan contradice
una regla del MCP, el plan se corrige.

## Flujo de desarrollo y compuertas

1. **Antes de especificar** — cargar las reglas aplicables al stack desde el MCP iafit.
2. **Antes de planificar** — la spec cumple los principios II y III.
3. **Antes de implementar** — ejecutar `/speckit.analyze`; no se implementa con
   inconsistencias abiertas entre spec, plan y tareas.
4. **Antes de cerrar** — build y pruebas en verde, README actualizado (principio VI),
   specs de capacidad reconciliadas (principio IV) y `/speckit.converge` sin hallazgos.

Saltarse una compuerta requiere aprobación arquitectural explícita y queda registrada en
el cambio.

## Governance

Esta constitución es la norma superior del proyecto: prevalece sobre convenciones locales,
preferencias de equipo y sobre cualquier plan o spec que la contradiga. Un proyecto puede
**añadir** principios más estrictos; no puede relajar los aquí definidos.

**Origen y sincronización.** Deriva de la regla `sdd:constitucion-institucional` del MCP
iafit. La copia local declara en su cabecera de qué versión deriva. Cuando la regla suba de
versión, el proyecto actualiza su copia; una copia que va por detrás es deuda declarada, no
una variante legítima.

**Enmiendas.** Los principios institucionales solo se modifican en el MCP, y el cambio se
propaga a los proyectos. Los principios añadidos localmente se enmiendan en el proyecto,
documentando qué cambió y por qué.

**Versionado semántico.** MAJOR: se elimina o redefine un principio de forma incompatible.
MINOR: se añade un principio o se amplía materialmente una guía. PATCH: aclaraciones,
redacción, correcciones sin efecto semántico. Ante duda sobre la categoría, se razona la
propuesta antes de fijarla.

**Cumplimiento.** Se verifica en las compuertas del flujo anterior y en la revisión de
código. El incumplimiento de los principios V, VI y VII bloquea la aprobación del cambio.

**Version**: 1.0.0 | **Ratified**: 2026-07-30 | **Last Amended**: 2026-07-30
````

## Instalación en un proyecto SpecKit

1. Copia el bloque anterior a `.specify/memory/constitution.md`.
2. Añade como primera línea del archivo la cabecera de trazabilidad, para que el drift sea
   detectable:

   ```text
   <!-- Derivada de iafit sdd:constitucion-institucional v1.0 — no editar los principios I–VII localmente -->
   ```

3. Si el proyecto necesita principios propios, agrégalos **después** del VII, numerados en
   continuación, y sube la MINOR de la copia local.
4. Registra en el README que el proyecto usa SpecKit y hereda esta constitución
   ([[eleccion-de-framework]]).

> **Sobre `/speckit.constitution`:** el comando genera una constitución desde la plantilla
> del framework. Si lo ejecutas después de instalar esta, **sobrescribe el archivo**. El
> orden correcto es instalar esta constitución y no volver a ejecutar el comando, o
> ejecutarlo primero y reemplazar su salida por este contenido.

## Verificación

1. El archivo existe y conserva los siete principios:

   ```bash
   grep -c '^### [IVX]\+\.' .specify/memory/constitution.md   # >= 7
   ```

2. La cabecera de trazabilidad declara una versión que coincide con la vigente en el MCP
   (`get_rule(category="sdd", slug="constitucion-institucional")` → campo `version`).
3. El README del proyecto declara la herencia.

**Criterio de aceptación:** la constitución local no contradice ningún principio
institucional, y su versión declarada permite saber en una lectura si va por detrás del
MCP.

## Evolución prevista

La vía nativa de distribución en SpecKit son los **presets** (`specify preset add`, que
sobrescriben plantillas incluida `constitution-template.md`, apilables por prioridad). El
siguiente paso natural es empaquetar esta constitución como preset institucional para que
la herencia deje de ser copia manual. Hasta entonces, la copia con cabecera de
trazabilidad es el mecanismo autorizado.
