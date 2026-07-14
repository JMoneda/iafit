---
title: "CI/CD con Azure DevOps (pipelines, Bicep, ACR)"
category: cicd
slug: azure-devops
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["all"]
status: active
---

## Regla

El ciclo de vida usa **Azure DevOps**: código en **Azure Repos (Git)**, automatización con
**Azure Pipelines (YAML reutilizables)**, imágenes en **Azure Container Registry (ACR)** e
infraestructura por **Bicep** versionado. Despliegue automatizado y controlado con **gates
por entorno** hacia **Dev, QA y Producción**. Los secretos se obtienen **solo de Key Vault**
(ver [[secrets-management]]).

## Justificación

Un pipeline estandarizado con gates y plantillas reutilizables da trazabilidad, control de
calidad y gobernabilidad, reduce errores manuales y asegura consistencia entre servicios y
entornos.

## Flujo

**a) Desarrollo y control de versiones**
- Trabajo en **ramas feature**; cambios sujetos a **Pull Request** y validaciones
  automáticas antes de integrarse a ramas protegidas (`main`/`develop`).

**b) Pipeline de PR** (al abrir PR hacia ramas protegidas)
- Escaneo de **seguridad estática**, compilación y **pruebas unitarias**; preparación para
  revisión de código.

**c) Continuous Integration (CI)** (tras aprobar el PR)
- Obtención segura de secretos desde **Key Vault**, compilación completa (backend y
  frontend), pruebas unitarias y publicación de artefactos.

**d) Continuous Deployment (CD)** (con gates)
- **Staging**: descarga de artefactos, despliegue a recursos de prueba, **validación
  funcional**.
- **Producción**: despliegue final con su gate de aprobación.

## Reglas específicas

- **Plantillas YAML reutilizables** para consistencia entre todos los servicios.
- **Despliegue modular**: pipelines separados para presentación (Static Web App) y negocio
  (Container Apps), habilitando actualizaciones independientes y **rollback selectivo**.
- **Infraestructura como Código con Bicep**, versionado en Azure DevOps: nada de recursos
  creados a mano; reproducibilidad y auditoría.
- **ACR** como registro privado de imágenes del backend, con integración a Container Apps.
- **SonarQube** integrado como gate de calidad/cobertura: **bloquea el ascenso de ambiente**
  si no se cumple el umbral (ver [[pruebas-unitarias]], [[pruebas-frontend-angular]]).
- **Secretos exclusivamente desde Key Vault**, nunca persistidos en código o variables.
- Tres entornos (**Dev/QA/Prod**) con la misma estructura de recursos y variaciones de
  escala/acceso/monitoreo (ver [[plataforma-azure]]).

## Los scripts del pipeline son agnósticos de plataforma

Todo lo que ejecuta el pipeline corre en un **agente Linux**, no en el Windows de quien lo
escribió. Un script que funciona en la máquina del desarrollador y falla en el agente es un
pipeline roto que nadie ve hasta que ya está en `main`.

- **Nada de comandos de `cmd.exe`** en los scripts de `package.json`. `copy`, `xcopy`, `del`,
  rutas con `\` y `%VAR%` no existen en el agente. Se usan herramientas multiplataforma
  (`cpy-cli`, `shx`, `rimraf`) o scripts de Node.
- **Ninguna versión hardcodeada** en un script. Si el script hay que editarlo a mano en cada
  bump, alguien va a olvidarlo y el pipeline publicará el artefacto anterior.
- **Una sola fuente de versión.** El `package.json` de la raíz y el de la librería no se
  sincronizan a mano: divergen (ver [[librerias-publicadas]]).
- **Las pruebas corren headless, sin watch y terminan solas**, o el agente se cuelga hasta el
  timeout (ver [[pruebas-frontend-angular]]).
- **Autenticación del feed privado por token del pipeline** (`npm authenticate` /
  `NpmAuthenticate@0`), no por `vsts-npm-auth` (que es solo Windows y solo interactivo).

```jsonc
// ❌ Real, de @shared/pipes: los dos fallan en un agente Linux
"copy-readme":  "copy .\\README.md .\\dist\\pipes",              // cmd.exe
"publish_pack": "npm publish ./dist/pipes/shared-pipes-17.3.7.tgz", // versión a mano

// ✅ Multiplataforma y sin versión hardcodeada
"copy-readme":  "cpy README.md dist/pipes",
"publish_pack": "cd dist/pipes && npm publish"   // npm resuelve el paquete y su versión
```

## Verificación

```bash
# 1. Comandos de cmd.exe en scripts que corre el pipeline (debe salir vacío)
grep -nE '"[^"]*":\s*"[^"]*\b(copy|xcopy|del|move|rmdir)\b' package.json
grep -nE '"[^"]*":\s*"[^"]*\\\\' package.json          # rutas con backslash

# 2. Versiones hardcodeadas en scripts (debe salir vacío)
grep -nE '"scripts"' -A20 package.json | grep -E '[0-9]+\.[0-9]+\.[0-9]+'

# 3. La versión no está duplicada a mano entre manifiestos
grep -n '"version"' package.json projects/*/package.json

# 4. Las pruebas del pipeline terminan solas (no cuelgan el agente)
grep -nE '"test(:ci)?"' package.json

# 5. Secretos: ninguno versionado (ver 'secrets-management')
git grep -nE "(password|api[_-]?key|connectionstring)\s*[:=]\s*['\"]" -- \
  ':!*.md' ':!package-lock.json'
```

**Criterio de aceptación:** los comandos 1, 2 y 5 salen vacíos. El script de pruebas del
comando 4 corre headless y sin watch.
