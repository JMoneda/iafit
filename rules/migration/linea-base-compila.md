---
title: "La línea base debe compilar antes de migrar"
category: migration
slug: linea-base-compila
version: "1.0"
last_updated: "2026-07-11"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Antes de iniciar **cualquier** cambio, se descarga/`checkout` la rama base y se verifica que
el código **compila/buildea (y pasa las pruebas, si existen) tal cual está**. Eso es la
**línea base**. Compilar es solo lectura sobre el código: no se corrige ni edita nada aquí.

**Si la línea base NO compila:** se documenta de forma **explícita** (en `inventario.md`,
sección "Compilación de línea base") como **bloqueador**, con el error exacto y su causa
aparente, y **se decide con el usuario** antes de continuar:

- **(a) Arreglar la base primero**, en un cambio **separado** de la migración (preferido).
- **(b) Dejar constancia y proceder** con conocimiento del riesgo, solo si el usuario lo
  aprueba.

Nunca se empieza a migrar asumiendo "ya estaba roto" sin dejar constancia.

## Justificación

La verificación de paridad ([[preservar-comportamiento]], [[proceso-migracion]]) compara el
comportamiento antes y después de cada salto. Si la base no compila, no hay "antes" válido:
ante un fallo tras migrar sería imposible saber si lo introdujo la versión nueva o ya existía.
La línea base que compila es el punto de referencia de toda la migración.

## Reglas específicas

- **Registrar** el comando exacto, el resultado (✅ compila / ❌ falla) y la versión del
  toolchain usada (SDK .NET, Node/npm, etc.).
- **Distinguir causa**: si falla por **toolchain faltante** (SDK/Node no instalado, versión
  incorrecta), es un prerequisito de entorno, no un defecto del código — documéntalo como tal.
- **Antes de tocar nada**: esta verificación ocurre en la fase de inventario (solo lectura);
  ninguna corrección de la base se hace dentro del cambio de migración.
- **Gotcha .NET Core 3.1 / Azure Functions v3**: el build puede fallar en el post-build del
  generador de Functions v3 (app 3.1) pidiendo el runtime 3.1 aunque las librerías compilen.
  Antes de declarar bloqueador, **reintenta con `DOTNET_ROLL_FORWARD=LatestMajor`** (variable
  de entorno solo para el build; no instala nada ni edita el repo). Ver
  [[azure-functions-a-v4-inproc]].

## Ejemplo

```
✅ Base compila
  - Backend: `dotnet build -c Release` → OK (SDK 3.1.426)
  - Frontend: `npm ci && npm run build` → OK (Node 16.20)

❌ Base NO compila → bloqueador documentado en inventario.md
  - `dotnet build` falla: paquete X 2.1.0 no restaura (feed privado caído).
    Decisión con usuario: arreglar en cambio separado antes de migrar.
```
