---
category: migration
description: Reglas y matrices para migrar/actualizar proyectos entre versiones de framework
---

## Reglas disponibles

| slug | título | aplica a |
|------|--------|----------|
| convencion-ramas | Convención de ramas por versión | frontend, backend |
| proceso-migracion | Proceso de migración incremental (OpenSpec) | frontend, backend |
| preservar-comportamiento | Actualizar sin alterar comportamiento ni conexiones | frontend, backend |
| pruebas-son-linea-base | Las pruebas son línea base: no se debilitan para que pasen | frontend, backend |
| linea-base-compila | La línea base debe compilar antes de migrar | frontend, backend |
| residuos-de-migracion | No dejar configuración a medio migrar (residuos) | frontend, backend |
| alineacion-ecosistema | Los majors del ecosistema siguen al del framework | frontend, backend |
| librerias-publicadas | Migrar una librería publicada: el manifiesto es el contrato | frontend, libreria |
| documentacion-walkthrough | Documentación con snippets ejecutados (Showboat) | frontend, backend |
| sugerencias-post-migracion | Sugerencias de refactor y hallazgos al cerrar la migración | frontend, backend |
| documentacion-api-cierre | Documentar el API al cerrar el apply (README + Swagger/OpenAPI) | backend |
| angular-a-13 | Angular → 13 | frontend |
| angular-a-14 | Angular → 14 | frontend |
| angular-a-15 | Angular → 15 | frontend |
| angular-a-16 | Angular → 16 | frontend |
| angular-a-17 | Angular → 17 | frontend |
| angular-a-18 | Angular → 18 | frontend |
| angular-a-19 | Angular → 19 | frontend |
| angular-a-20 | Angular → 20 | frontend |
| angular-a-21 | Angular → 21 | frontend |
| angular-a-22 | Angular → 22 | frontend |
| dotnet-a-5 | .NET → 5 | backend |
| dotnet-a-6 | .NET → 6 | backend |
| dotnet-a-7 | .NET → 7 | backend |
| dotnet-a-8 | .NET → 8 | backend |
| dotnet-a-9 | .NET → 9 | backend |
| dotnet-a-10 | .NET → 10 | backend |
| azure-functions-a-v4-inproc | Azure Functions → v4 (in-process) | backend |
| azure-functions-a-isolated | Azure Functions → modelo isolated worker | backend |

> Cada salto es una regla `<framework>-a-<N>`: describe el salto desde la versión
> mayor anterior soportada (Angular: `N-1`; .NET: `3.1→5→6→7→8→9→10`, una a la vez).
> Agrega nuevas reglas creando archivos `.md` con frontmatter en este directorio.
> El campo `slug` es el identificador; debe ser único dentro de la categoría.
> Toda regla y todo artefacto derivado se redacta en **español**. Fuente de verdad
> de los pasos exactos: Angular → `https://update.angular.dev/`; .NET → docs de
> compatibilidad de Microsoft (`https://learn.microsoft.com/dotnet/core/compatibility/`)
> y el `upgrade-assistant`.
>
> **Excepción Azure Functions:** el ladder genérico `dotnet-a-*` asume "una mayor = un
> salto de TFM", pero en Functions el eje es el **host runtime** (v3→v4) y el **modelo de
> ejecución** (in-process→isolated). Ruta EAFIT: `azure-functions-a-v4-inproc` (v3/3.1 →
> v4 in-process/net6) → `azure-functions-a-isolated` (in-process → isolated/net8) → luego
> `dotnet-a-9`/`dotnet-a-10` como bumps simples. **`dotnet-a-5` no aplica a Functions.**
