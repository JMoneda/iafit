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
| `create_work_item` · `update_work_item` | Azure DevOps: escritura de work items |

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
| `migration` | Convención de ramas, proceso, **preservar comportamiento** (actualizar sin alterar conexiones/lógica), **línea base compila** (verificar build antes de migrar), matriz Angular (`angular-a-13…22`), matriz .NET (`dotnet-a-5…10`, ruta `3.1→…→10`), **Azure Functions** (`azure-functions-a-v4-inproc` → `azure-functions-a-isolated`), documentación estilo walkthrough, **sugerencias de refactor** al cierre (vulnerabilidades/mejoras → changes/HU futuros), **documentación del API** al cerrar el apply (README + Swagger/OpenAPI, implementarlo si falta) |

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
2. Org `eafit-dinfo`, expiración corta, scope **Work Items ▸ Read** (mínimo privilegio).
3. Copia el token y ponlo en `AZURE_DEVOPS_PAT` (en el `env` del MCP o en `.env`).

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

## Desarrollo local

```bash
npm install
npm run build
node dist/index.js
```
