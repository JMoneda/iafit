# IAFIT MCP Server

Servidor MCP de EAFIT que centraliza, como tools para agentes de IA (Claude Code, GitHub
Copilot y cualquier cliente MCP):

- **Reglas de ingeniería** de la empresa (arquitectura, estándares de código, seguridad,
  observabilidad, pruebas, CI/CD, ADRs y migración).
- **Schemas de OpenSpec** para el flujo de migración/actualización de proyectos.
- **Acceso a Azure DevOps** (work items y pull requests).

Toda la documentación y los artefactos que produce el flujo se generan en **español**.

## Qué expone

### Tools

| Tool | Qué hace |
|------|----------|
| `list_rule_categories` | Lista las categorías de reglas y cuántas hay en cada una |
| `list_rules` | Lista las reglas de una categoría |
| `get_rule` | Devuelve el contenido completo de una regla |
| `search_rules` | Búsqueda por texto libre en todas las reglas |
| `list_schemas` | Lista los schemas de OpenSpec que provee IAFIT |
| `get_schema` | Devuelve un schema (schema.yaml + plantillas) para instalarlo en un proyecto |
| `get_work_item` · `query_work_items` | Azure DevOps: work items |
| `list_pull_requests` · `get_pr_threads` · `add_pr_comment` | Azure DevOps: pull requests |
| `create_work_item` · `update_work_item` | Azure DevOps: escritura de work items (soportan **campos personalizados**; ver [Work items](#work-items-campos-personalizados-y-confirmación)) |

### Prompts

| Prompt | Qué hace |
|--------|----------|
| `iafit-inicio` | Saludo y orientación (desarrollar vs migrar) |
| `iafit-migracion` | Onboarding de migración: entrevista, configura OpenSpec y arranca las fases |

> Nota: los clientes MCP soportan **tools** de forma universal; el soporte de **prompts**
> es más nuevo en VS Code/Copilot. Las tools funcionan en todos.

## Instalación

Las reglas y los schemas **no requieren autenticación**. Solo las tools de Azure DevOps
necesitan las variables `AZURE_AD_*`.

### Opción recomendada: Node local, global para todos tus proyectos

```bash
npm install
npm run build

# Claude Code — disponible en cualquier proyecto (scope de usuario):
claude mcp add iafit -s user -- node C:/Repos/Estudio/iafit/dist/index.js
```

Para **GitHub Copilot / VS Code**, agrega el servidor en tu `settings.json` de usuario (o
en `.vscode/mcp.json` del proyecto; ojo: la clave es `servers`, no `mcpServers`):

```json
{
  "servers": {
    "iafit": { "type": "stdio", "command": "node", "args": ["C:/Repos/Estudio/iafit/dist/index.js"] }
  }
}
```

> Tras cambiar el código de IAFIT: `npm run build` y reinicia el MCP en el cliente.

### Con tools de Azure DevOps

Hay dos formas de autenticarse (elige una); solo entonces hacen falta variables extra.

**Opción 1 — PAT (recomendada, sin admin de Entra ID):** cada quien crea su Personal
Access Token en Azure DevOps → *User settings* → *Personal access tokens* (scope mínimo:
**Work Items ▸ Read**). Es un **secreto**: va en el `env` o en `.env`, nunca en el repo.

```json
"iafit": {
  "type": "stdio",
  "command": "node",
  "args": ["C:/Repos/Estudio/iafit/dist/index.js"],
  "env": { "AZURE_DEVOPS_ORG": "eafit-dinfo", "AZURE_DEVOPS_PROJECT": "SolucionesIA", "AZURE_DEVOPS_PAT": "..." }
}
```

**Opción 2 — OAuth/Entra ID (requiere un registro de app en Entra ID):** login interactivo
en el navegador, sin secretos en config.

```json
"iafit": {
  "type": "stdio",
  "command": "node",
  "args": ["C:/Repos/Estudio/iafit/dist/index.js"],
  "env": { "AZURE_AD_CLIENT_ID": "...", "AZURE_AD_TENANT_ID": "...", "AZURE_DEVOPS_ORG": "eafit-dinfo" }
}
```

### Opción Docker

Útil para aislamiento o para persistir los tokens de Azure DevOps en un volumen.

```bash
cp .env.example .env   # completa AZURE_AD_CLIENT_ID y AZURE_AD_TENANT_ID
docker build -t iafit-mcp:latest .
```

```json
{
  "mcpServers": {
    "iafit": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--hostname", "iafit",
        "-p", "3456:3456",
        "-v", "iafit-tokens:/root/.iafit",
        "--env-file", "/ruta/absoluta/a/.env",
        "iafit-mcp:latest"
      ]
    }
  }
}
```

- `-i` es obligatorio para que el stdio fluya entre el cliente y el contenedor.
- `--rm` limpia el contenedor al cerrar; el volumen `iafit-tokens` persiste los tokens.
- `--hostname iafit` mantiene estable el host para reutilizar los tokens cifrados.
- **Reconstruye la imagen** (`docker build …`) cada vez que actualices el código.

## Solución de problemas

### `MCP error -32000: Connection closed`

El cliente cerró la conexión porque el servidor no completó el handshake. En un servidor
MCP con transport **stdio**, casi siempre es una de estas causas (en orden de frecuencia):

1. **Algo escribió en `stdout` que no era JSON-RPC.** En stdio, **stdout es exclusivamente
   el canal del protocolo**: un `console.log`, o un banner de una librería (p. ej. el aviso
   `◇ injected env … from .env` de `dotenv` v17), corrompe el handshake. La carga del `.env`
   se silencia con `quiet: true` (ver `src/loadEnv.ts`); si agregas código, respeta la
   **regla de oro** de [Desarrollo local](#desarrollo-local).
2. **No compilaste.** Falta `dist/index.js` o está desactualizado → `npm install && npm run build`.
3. **`node` no está en el PATH** del proceso que lanza el MCP (típico con **nvm-windows**):
   usa la ruta absoluta como `command`, p. ej. `C:/Program Files/nodejs/node.exe`, o activa
   una versión con `nvm use 20` antes de arrancar el cliente.
4. **Node < 18** (requisito de `engines`) → `node -v` debe ser ≥ 18. La v16 de nvm no sirve.

**Diagnóstico rápido** — ejecuta el servidor a mano y confirma que **stdout sale vacío** al
arrancar (queda esperando stdin, que es lo correcto):

```bash
node dist/index.js
# No debe imprimir NADA en stdout. Si aparece texto, ESA es la causa del -32000.
# Ctrl+C para salir.
```

## Reglas

Viven en `rules/<categoría>/<slug>.md` (Markdown con frontmatter). Categorías actuales:

| Categoría | Contenido |
|-----------|-----------|
| `architecture` | Clean Architecture .NET, Frontend SPA Angular, plataforma Azure |
| `code-standards` | .NET, Angular, TypeScript |
| `security` | Identidad/acceso (Entra ID, RBAC, MSI), secretos (Key Vault), red/perímetro (Front Door + WAF) |
| `observabilidad` | Logging y auditoría con Application Insights |
| `pruebas` | Pruebas unitarias (xUnit, Moq) y calidad (SonarQube) |
| `cicd` | CI/CD con Azure DevOps (pipelines, Bicep, ACR) |
| `adrs` | Architecture Decision Records |
| `migration` | Convención de ramas, proceso, **preservar comportamiento** (actualizar sin alterar conexiones/lógica), **línea base compila** (verificar build antes de migrar), **línea base de contrato** (snapshots del API + diff por salto), **compuertas de salto** (definition of done por salto), **reversibilidad por salto** (commit aislado + rollback), **verificar fuente oficial** (re-confirmar EOL/breaking changes contra la doc oficial), **serialización como vector de ruptura** (Newtonsoft → System.Text.Json), matriz Angular (`angular-a-13…22`), matriz .NET (`dotnet-a-5…10`, ruta `3.1→…→10`), **Azure Functions** (`azure-functions-a-v4-inproc` → `azure-functions-a-isolated`), documentación estilo walkthrough, **sugerencias de refactor** al cierre (vulnerabilidades/mejoras → changes/HU futuros), **documentación del API** al cerrar el apply (README + Swagger/OpenAPI, implementarlo si falta) |

**Agregar una regla:** crea `rules/<categoría>/<slug>.md` con frontmatter
(`title`, `category`, `slug`, `version`, `last_updated`, `applies_to`, `status`) y
actualiza el `_index.md` de la categoría.

**Agregar una categoría:** una sola línea en `src/utils/rulesReader.ts` (los enums de las
tools se derivan de `VALID_CATEGORIES`).

## Schemas de migración (OpenSpec)

IAFIT provee tres schemas en `schemas/`, servibles vía `get_schema`:

| Schema | Fase | Produce |
|--------|------|---------|
| `inventario-tecnico` | 0–1 — arranque + inventario (solo lectura) | `estado-ramas.md` (dev vs master) → `inventario.md` → `ruta.md` |
| `research` | 2 — comprensión (solo lectura) | `scope.md` → `walkthrough.md` → specs |
| `migracion-incremental` | 3 — ejecutar un salto | `plan.md` → `tasks.md` (+ `notas-migracion.md`) |

### Instalación global de los schemas (una vez)

Para que **todos** tus proyectos los vean sin copiarlos, instálalos en el directorio global
de OpenSpec (Windows):

```bash
cp -r schemas/research schemas/inventario-tecnico schemas/migracion-incremental \
  "$LOCALAPPDATA/openspec/schemas/"
openspec schema validate inventario-tecnico   # verifica
```

OpenSpec los resuelve como *user override*; un schema local del proyecto tiene precedencia
sobre el global. El master versionado vive aquí, en `schemas/`.

## Flujo de migración

Un proyecto por migrar, paso a paso (ver la regla `proceso-migracion`):

```
openspec init --tools claude,github-copilot   # genera los comandos opsx:*
# luego invoca el prompt iafit-migracion, o manualmente:
#   inventario-tecnico (estado-ramas dev↔master → inventario → ruta)
#   →  /opsx:research  →  migracion-incremental (un salto = una rama)  →  README final
```

Regla de oro: **un salto de versión = un change = una rama**
`migration/<componente>-<framework>-<versión>`. El MCP entrega reglas y contenido; el
agente ejecuta git/npm/dotnet y escribe los archivos.

## Autenticación de Azure DevOps

IAFIT soporta dos métodos; usa el que aplique a tu caso. Si `AZURE_DEVOPS_PAT` está
definido, se usa el PAT; si no, cae al flujo OAuth.

### PAT (self-service, sin admin de Entra ID)

1. Azure DevOps → *User settings* → *Personal access tokens* → **New Token**.
2. Org `eafit-dinfo`, expiración corta, y el scope mínimo según lo que uses:
   - solo lectura de work items (`get_work_item`, `query_work_items`) → **Work Items ▸ Read**;
   - crear/actualizar work items (`create_work_item`, `update_work_item`) → **Work Items ▸ Read & Write**;
   - tools de PRs (`list_pull_requests`, `get_pr_threads`, `add_pr_comment`) → **Code ▸ Read & Write**.
3. Copia el token y ponlo en `AZURE_DEVOPS_PAT` (en el `env` del MCP o en `.env`).

> **El PAT caduca.** Cuando expira, Azure DevOps responde 401 y las tools reportan
> `auth_expired` ("la sesión expiró"). No se usa `az login` ni ningún flujo de navegador con
> PAT: se **genera un token nuevo** en la misma pantalla, se reemplaza el valor de
> `AZURE_DEVOPS_PAT` y se **reinicia el servidor MCP** (el `.env` se lee al arrancar).

No hay login interactivo: IAFIT autentica con Basic auth directamente. El PAT es un
**secreto** — nunca lo pongas en `.env.example` ni lo subas al repo; si se expone,
regenéralo en la misma pantalla.

### OAuth / Entra ID (login interactivo)

Al invocar por primera vez una tool de Azure DevOps, el servidor imprime en stderr:

```
[IAFIT] Para autenticarte, abre esta URL en tu navegador:
https://login.microsoftonline.com/...
Esperando autenticación (timeout: 2 minutos)...
```

Abre la URL, completa el login de Microsoft y el servidor recibe el callback por el puerto
mapeado (`3456:3456`). Requiere un registro de app en Entra ID (necesita permisos de admin
del tenant) — ver [DESIGN.md](DESIGN.md) sección 7.

## Work items: campos personalizados y confirmación

### Confirmación explícita (todas las escrituras)

`create_work_item`, `update_work_item` y `add_pr_comment` son **tools de escritura** y exigen
confirmación en dos pasos:

1. Se llama con `confirmed: false` → devuelve un **preview** de lo que se haría, sin tocar
   Azure DevOps.
2. Tras la aprobación explícita del usuario, se llama con `confirmed: true` → ejecuta.

### Campos personalizados (`fields`)

Los procesos de Azure DevOps suelen definir **campos personalizados**, y algunos son
**obligatorios** (p. ej. `Task Type` en el proyecto `SolucionesIA`). Tanto `create_work_item`
como `update_work_item` aceptan un mapa `fields` cuyas claves son el **reference name** del
campo:

```jsonc
{
  "type": "Task",
  "title": "Configurar pipeline",
  "confirmed": true,
  "fields": {
    "Custom.TaskType": "Development",
    "Microsoft.VSTS.Common.Priority": 2
  }
}
```

Los parámetros de conveniencia (`title`, `description`, `assignedTo`, `tags`) mapean a campos
`System.*`; cualquier otro campo va en `fields`. Si no conoces el reference name de un campo,
míralo en Azure DevOps → *Project settings* → *Process* → el tipo de work item → el campo, o
deja que la tool te lo diga (ver abajo).

### Vínculo padre-hijo (`parent`)

En Azure DevOps la relación padre-hijo **no es un campo** (`System.Parent` no funciona): es una
**relación** (link). Por eso ambas tools exponen el parámetro `parent` (el ID del work item
padre) y lo aplican como una operación sobre `/relations/-` con el tipo
`System.LinkTypes.Hierarchy-Reverse`:

```jsonc
// Crear una Task ya vinculada a su User Story 34732:
{ "type": "Task", "title": "Configurar pipeline", "parent": 34732, "confirmed": true }

// Vincular una Task existente (34888) a la HU 34732, sin cambiar más nada:
{ "id": 34888, "parent": 34732, "confirmed": true }
```

`update_work_item` acepta `fields`, `parent` o ambos; con solo `parent` emite únicamente la
relación. Si no pasas ni `fields` ni `parent`, responde `nothing_to_update` sin tocar nada.

### Cuando falta un campo obligatorio

Si intentas crear un work item sin un campo obligatorio del proceso, **la tool no crea nada** y
responde con una estructura `requires_input` que incluye los campos faltantes y sus valores
permitidos:

```jsonc
{
  "requires_input": true,
  "created": false,
  "message": "El proyecto exige campos obligatorios que no se enviaron; el work item NO se creó. Pídele al usuario el valor de cada campo faltante y reintenta con `fields`.",
  "missingFields": [
    {
      "referenceName": "Custom.TaskType",
      "name": "Task Type",
      "allowedValues": ["Development", "Analysis", "Configuration"]
    }
  ]
}
```

El agente usa esa respuesta para **pedirle el dato al usuario** (respetando `allowedValues` si
el campo está limitado a valores) y reintenta `create_work_item` con `confirmed: true`
incluyendo el campo en `fields`. Así el flujo se resuelve sin fallar de forma opaca.

## Desarrollo local

```bash
npm install
npm run build
node dist/index.js
```

> ⚠️ **Regla de oro (transport stdio): stdout está reservado para el protocolo JSON-RPC.**
> Nunca escribas en stdout desde el código del servidor —ni `console.log`, ni banners de
> librerías—. Para trazas y diagnóstico usa `console.error` (stderr). Cualquier byte suelto
> en stdout rompe al cliente con `-32000: Connection closed` (ver
> [Solución de problemas](#solución-de-problemas)).

### Pruebas

La suite usa [vitest](https://vitest.dev). No requiere red ni credenciales reales: el
cliente de Azure DevOps se prueba con `fetch` mockeado y las lecturas de reglas/schemas
usan fixtures.

```bash
npm test           # corre toda la suite una vez
npm run test:watch # modo watch durante el desarrollo
```

Cobertura por área:

| Archivo | Qué protege |
|---------|-------------|
| `tests/rulesReader.test.ts` | Categorías, listado con frontmatter, `getRule`, búsqueda insensible a acentos/mayúsculas |
| `tests/schemasReader.test.ts` | Listado, descripción plegada, obtención con plantillas, rechazo de path traversal |
| `tests/tokenStore.test.ts` | Cifrado (roundtrip, sin secretos en claro, detección de manipulación), `clearTokens` |
| `tests/azureDevOpsClient.test.ts` | Basic auth con PAT, construcción de URL, mapeo de errores HTTP, error de red |
| `tests/confirmacion.test.ts` | Contrato de confirmación: `confirmed:false` nunca escribe; `confirmed:true` ejecuta |
| `tests/toolDefinitions.test.ts` | Catálogo: nombres únicos, schemas bien formados, `confirmed` obligatorio en escrituras |
| `tests/rulesContent.test.ts` | Integridad del contenido real de `rules/` (frontmatter, categorías, slugs únicos, `_index.md`) |
| `tests/usageLog.test.ts` | Telemetría: una línea por llamada, desactivación con `IAFIT_TELEMETRY=0`, fire-and-forget, rotación y `extractMeta` (búsquedas con 0 resultados, sin payloads sensibles) |

## Telemetría de uso (local)

El servidor registra, de forma **local y best-effort**, qué tools se llaman para poder
mejorar el catálogo de reglas con datos en vez de intuición. El caso más valioso son las
búsquedas con **cero resultados**: dicen qué reglas faltan o con qué términos las busca la
gente.

- **Dónde:** `~/.iafit/usage.jsonl` (o `IAFIT_DATA_DIR`), el mismo directorio de los tokens.
  Una línea JSON por llamada; rota a `usage.jsonl.1` al superar 5 MB.
- **Qué se registra:** marca de tiempo, nombre de la tool, si tuvo éxito y **metadata
  mínima** (p. ej. `query`+`total` de una búsqueda, `category`+`slug` de un `get_rule`).
  **Nunca** se registran payloads completos, títulos, ni contenidos de reglas o work items.
- **NUNCA escribe en stdout:** solo al archivo. Un fallo de E/S se ignora en silencio; la
  telemetría jamás interrumpe una llamada (ver la regla de oro de stdout).
- **Privacidad:** el log es local en cada máquina y puede contener términos de búsqueda con
  contexto del proyecto. No se envía a ningún lado.
- **Desactivar:** define `IAFIT_TELEMETRY=0` en el `env` del MCP o en `.env`.

### Ver el reporte

```bash
npm run usage:report
# o con otra ubicación de datos:
IAFIT_DATA_DIR=/ruta node scripts/usage-report.mjs
```

El reporte agrega el JSONL y responde tres preguntas: qué tools se usan (y cuáles fallan),
qué reglas se leen más, y qué búsquedas dieron cero resultados. Es de solo lectura.
