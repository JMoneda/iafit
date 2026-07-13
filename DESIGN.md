# DESIGN.md — IAFIT MCP Server

## 1. Tools expuestas

### Grupo A: Reglas y contenido

| Tool | Propósito |
|------|-----------|
| `list_rule_categories` | Lista las cuatro categorías disponibles con un resumen de cuántos archivos hay en cada una |
| `list_rules` | Lista los archivos de una categoría (`architecture`, `code-standards`, `adrs`, `security`) con título y descripción breve |
| `get_rule` | Devuelve el contenido completo de un archivo de reglas por categoría y slug |
| `search_rules` | Búsqueda por texto libre sobre todos los archivos de reglas — devuelve fragmentos relevantes con contexto |

Las cuatro categorías tienen exactamente el mismo peso: `architecture`, `code-standards`, `adrs`, `security`. No hay jerarquía entre ellas.

### Grupo B: Azure DevOps

**Lectura** (sin confirmación requerida):

| Tool | Propósito |
|------|-----------|
| `get_work_item` | Lee un work item por ID |
| `query_work_items` | Ejecuta una query WIQL y devuelve lista de work items |
| `list_pull_requests` | Lista PRs de un repositorio con filtros opcionales |
| `get_pr_threads` | Devuelve los hilos de comentarios de un PR específico |

**Escritura** (confirmación explícita requerida):

| Tool | Propósito |
|------|-----------|
| `create_work_item` | Crea un work item — requiere confirmación antes de ejecutar |
| `update_work_item` | Actualiza campos de un work item existente — requiere confirmación |
| `add_pr_comment` | Agrega un comentario a un PR — requiere confirmación |

---

## 2. Estructura del contenido de reglas

```
rules/
├── architecture/
│   ├── _index.md
│   └── microservices.md
├── code-standards/
│   ├── _index.md
│   └── typescript.md
├── adrs/
│   ├── _index.md
│   └── 0001-use-postgres.md
└── security/
    ├── _index.md
    └── secrets-management.md
```

### Formato de cada archivo

```markdown
---
title: "Gestión de secretos"
category: security
slug: secrets-management
version: "1.2"
last_updated: "2026-06-15"
applies_to: ["all"]
status: active             # active | deprecated | draft
---

## Regla
...
## Justificación
...
## Ejemplos
...
```

El `_index.md` de cada categoría lista los slugs disponibles con título y resumen de una línea.
El versionado es el historial de git — no hay sistema de versiones propio en el MVP.

---

## 3. Integración con Azure DevOps

### Endpoints REST

Base URL: `https://dev.azure.com/eafit-dinfo/{project}/_apis/`  
API version: `7.1`

| Operación | Método | Endpoint |
|-----------|--------|----------|
| Leer work item | GET | `wit/workitems/{id}` |
| Query WIQL | POST | `wit/wiql` |
| Batch work items | GET | `wit/workitems?ids=...` |
| Listar PRs | GET | `git/repositories/{repo}/pullrequests` |
| Leer hilos PR | GET | `git/repositories/{repo}/pullrequests/{prId}/threads` |
| Crear work item | POST | `wit/workitems/${type}` (`application/json-patch+json`) |
| Actualizar work item | PATCH | `wit/workitems/{id}` (`application/json-patch+json`) |
| Agregar comentario PR | POST | `git/repositories/{repo}/pullrequests/{prId}/threads` |

### Autenticación: OAuth 2.0 Authorization Code + PKCE (Microsoft Entra ID)

Variables de entorno requeridas:
- `AZURE_AD_CLIENT_ID` — Client ID de la app registrada en Entra ID
- `AZURE_AD_TENANT_ID` — Tenant ID del tenant de EAFIT
- `AZURE_DEVOPS_ORG` — `eafit-dinfo`
- `AZURE_DEVOPS_PROJECT` — Proyecto por defecto

#### Flujo al invocar una tool del Grupo B

```
1. ¿Hay access token válido en disco (cifrado)?
   └─ Sí, vigente → adjunta como Bearer, continúa

2. ¿Hay refresh token?
   └─ Sí → solicita nuevo access token silenciosamente
   └─ Éxito → persiste, continúa
   └─ refresh expirado → borra tokens, cae a paso 3
   └─ error de red → devuelve network_error

3. Login interactivo:
   ├─ Genera PKCE (code_verifier + code_challenge SHA-256)
   ├─ Intenta puertos 3456, 3457, 3458 para el callback HTTP (bind: 0.0.0.0)
   │   └─ Ninguno disponible → error auth_port_unavailable
   ├─ Imprime la URL de autorización completa en stderr con un mensaje claro
   │   (el usuario la copia y la abre manualmente en su navegador)
   ├─ Espera callback (timeout 2 minutos)
   │   └─ Timeout → error auth_timeout
   ├─ Intercambia código → access_token + refresh_token
   └─ Persiste cifrado → continúa
```

Scopes solicitados: `https://app.vssps.visualstudio.com/user_impersonation offline_access`

#### Persistencia de tokens

Archivo: `${IAFIT_DATA_DIR}/tokens.enc`  
Variable de entorno: `IAFIT_DATA_DIR` — default `~/.iafit` en local, `/root/.iafit` en Docker.  
En Docker: montar como volumen nombrado (`-v iafit-tokens:/root/.iafit`) para que los tokens sobrevivan reinicios del contenedor.  
Cifrado: AES-256-GCM con clave derivada de `hostname:username` via scrypt. Para que el cifrado sea estable entre contenedores, el hostname debe ser fijo: usar `--hostname iafit` en el `docker run`.

### Mecanismo de confirmación para escrituras

Parámetro `confirmed: boolean` en todas las tools de escritura:
- `confirmed: false` → devuelve preview estructurado, **no ejecuta nada**
- `confirmed: true` → ejecuta y devuelve resultado real de la API

---

## 4. Transporte

### MVP: stdio via Docker

Claude Code lanza el contenedor directamente como proceso stdio. Configuración en `.mcp.json`:

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

- `-i` es obligatorio: mantiene stdin abierto para que el protocolo MCP por stdio fluya correctamente.
- `--rm` limpia el contenedor al cerrar, pero el volumen nombrado persiste los tokens.
- `--hostname iafit` fija el hostname para que la clave de cifrado de tokens sea estable entre reinicios.
- `-p 3456:3456` mapea el puerto de callback OAuth del host al contenedor.
- El servidor de callback escucha en `0.0.0.0` dentro del contenedor para recibir el tráfico mapeado desde el host.

La imagen se construye una sola vez y se reconstruye cada vez que cambia el código fuente:

```bash
docker build -t iafit-mcp:latest .
```

### Futuro: HTTP/SSE

Cambiar `StdioServerTransport` por `StreamableHTTPServerTransport`. Añadir autenticación al servidor y manejo de sesiones OAuth por usuario. La lógica de tools no cambia.

---

## 5. Esquema de cada tool

### list_rule_categories
- **Parámetros:** ninguno
- **Retorna:** `{ categories: [{ name, description, count }] }`
- **Confirmación:** no

### list_rules
- **Parámetros:** `{ category: "architecture"|"code-standards"|"adrs"|"security" }`
- **Retorna:** `{ rules: [{ slug, title, applies_to, status, last_updated }] }`
- **Confirmación:** no

### get_rule
- **Parámetros:** `{ category: string, slug: string }`
- **Retorna:** `{ frontmatter: {...}, content: string }`
- **Confirmación:** no

### search_rules
- **Parámetros:** `{ query: string, category?: string }`
- **Retorna:** `{ matches: [{ category, slug, title, excerpt }], total: number }`
- **Confirmación:** no

### get_work_item
- **Parámetros:** `{ id: number, project?: string }`
- **Retorna:** `{ id, title, type, state, assignedTo, description, acceptanceCriteria, url }`
- **Confirmación:** no

### query_work_items
- **Parámetros:** `{ wiql: string, project?: string, maxResults?: number }`
- **Retorna:** `{ items: [{ id, title, type, state }], totalCount }`
- **Confirmación:** no

### list_pull_requests
- **Parámetros:** `{ repository: string, status?: "active"|"completed"|"abandoned"|"all", createdBy?: string, project?: string }`
- **Retorna:** `{ pullRequests: [{ id, title, status, createdBy, sourceBranch, targetBranch, url }] }`
- **Confirmación:** no

### get_pr_threads
- **Parámetros:** `{ repository: string, pullRequestId: number, project?: string }`
- **Retorna:** `{ threads: [{ id, status, comments: [{ id, author, content, date }] }] }`
- **Confirmación:** no

### create_work_item
- **Parámetros:** `{ type: string, title: string, description?: string, assignedTo?: string, tags?: string[], project?: string, confirmed: boolean }`
- **Retorna (false):** `{ requires_confirmation: true, preview: {...}, message: string }`
- **Retorna (true):** `{ id, title, state, url }`
- **Confirmación:** sí

### update_work_item
- **Parámetros:** `{ id: number, fields: Record<string, unknown>, project?: string, confirmed: boolean }`
- **Retorna (false):** `{ requires_confirmation: true, preview: { id, currentFields, changes }, message: string }`
- **Retorna (true):** `{ id, url, updatedFields }`
- **Confirmación:** sí

### add_pr_comment
- **Parámetros:** `{ repository: string, pullRequestId: number, comment: string, threadId?: number, project?: string, confirmed: boolean }`
- **Retorna (false):** `{ requires_confirmation: true, preview: {...}, message: string }`
- **Retorna (true):** `{ threadId, commentId, url }`
- **Confirmación:** sí

---

## 6. Manejo de errores

El servidor nunca lanza una excepción no capturada. Toda condición de error se devuelve como respuesta estructurada con campos `error` (código) y `message` (descripción legible).

| Condición | error | message |
|-----------|-------|---------|
| `AZURE_AD_CLIENT_ID` o `AZURE_AD_TENANT_ID` no definidas | `missing_config` | Faltan variables de entorno: AZURE_AD_CLIENT_ID y/o AZURE_AD_TENANT_ID. |
| Error inesperado en login interactivo | `auth_required` | No se pudo completar la autenticación. Verifica los logs del servidor para obtener la URL de autorización. |
| Access token expirado + refresh token expirado | `auth_expired` | La sesión expiró. Se requiere iniciar sesión de nuevo. |
| Puerto base y los 2 siguientes ocupados | `auth_port_unavailable` | No se pudo iniciar el servidor de autenticación local. Verifica que el puerto 3456 (o cercanos) esté disponible. |
| Timeout de 2 min esperando el callback OAuth | `auth_timeout` | No se completó el inicio de sesión a tiempo. Intenta de nuevo. |
| Usuario sin permisos (403) | `forbidden` | Tu cuenta no tiene permisos para esta operación en Azure DevOps. |
| Recurso no encontrado (404) | `not_found` | Recurso no encontrado: {url} |
| Timeout o red caída | `network_error` | No se pudo conectar a Azure DevOps. Reintenta en unos segundos. |
| Rate limit (429) | `rate_limited` | Azure DevOps respondió 429. Espera antes de reintentar. |
| Regla local no encontrada | `rule_not_found` | No existe regla con slug '{slug}' en categoría '{category}'. |
| Categoría inválida | `invalid_category` | Categorías válidas: architecture, code-standards, adrs, security. |

---

## 7. Prerrequisitos de infraestructura

Las tools de Azure DevOps admiten **dos métodos de autenticación**. Elige uno:

- **7.0 PAT (recomendado, self-service):** no requiere admin de Entra ID. Cualquier
  usuario crea su token y funciona de inmediato. Ver abajo.
- **7.1–7.3 OAuth / Entra ID:** login interactivo con SSO, sin secretos en config, pero
  **requiere permisos de administrador** del tenant para registrar la app (una sola vez).

Si `AZURE_DEVOPS_PAT` está definido, IAFIT usa el PAT; si no, usa OAuth.

### 7.0 Alternativa sin admin: Personal Access Token (PAT)

1. Azure DevOps → **User settings → Personal access tokens → New Token**.
2. Organization `eafit-dinfo`, expiración corta, scope mínimo: **Work Items ▸ Read**
   (agrega más scopes solo si usarás tools de escritura/PRs).
3. Copia el token y ponlo en la variable `AZURE_DEVOPS_PAT` (en el `env` del cliente MCP o
   en `.env`). IAFIT autentica con Basic auth (`Authorization: Basic base64(":"+PAT)`), sin
   login interactivo.

> El PAT es un **secreto**: nunca en `.env.example` ni versionado. `.env` está en
> `.gitignore`. Si se expone, regenéralo en la misma pantalla (invalida el anterior).

### 7.1 Registro de aplicación en Microsoft Entra ID

Los siguientes pasos (7.1–7.3) **requieren permisos de administrador** en el tenant de
Entra ID de EAFIT y están fuera del alcance del código. Omítelos si usas PAT (7.0).

1. En el portal de Azure: **Entra ID → App registrations → New registration**
2. Nombre sugerido: `IAFIT MCP Server`
3. Tipo de cuenta: **Accounts in this organizational directory only** (single tenant)
4. Redirect URIs: `http://localhost:3456/auth/callback`, `http://localhost:3457/auth/callback`, `http://localhost:3458/auth/callback`

   > En el flujo Docker, el navegador del host accede a `localhost:3456` que Docker mapea al contenedor. Los redirect URIs registrados no cambian.

### 7.2 Configurar permisos de Azure DevOps en la app

1. **API permissions → Add a permission → APIs my organization uses**
2. Buscar `Azure DevOps` (app ID: `499b84ac-1321-427f-aa17-267ca6975798`)
3. Agregar scopes delegados: `user_impersonation`
4. Si el tenant lo requiere: **Grant admin consent**

> Los scopes `vso.work`, `vso.work_write`, `vso.code`, `vso.code_write` se resuelven implícitamente via `user_impersonation` al solicitar el token de Azure DevOps. No es necesario agregarlos explícitamente en la registración.

### 7.3 Obtener los valores para el entorno

- `AZURE_AD_CLIENT_ID` → **Overview → Application (client) ID**
- `AZURE_AD_TENANT_ID` → **Overview → Directory (tenant) ID**

> No se genera ningún client secret. IAFIT usa flujo público con PKCE — no hay secreto que exponer.

---

*Versión del diseño: 0.4 — dockerización MVP.*
