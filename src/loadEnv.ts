import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carga el .env desde la RAÍZ del proyecto iafit (no desde el cwd), para que las
// variables estén disponibles aunque el MCP se lance desde cualquier otro proyecto.
// Compilado: dist/loadEnv.js -> ../.env = <iafit>/.env
// Debe importarse ANTES que cualquier módulo que lea process.env al cargarse.
// dotenv NO sobreescribe variables ya definidas (p. ej. las del `env` del MCP),
// así que la config explícita del cliente tiene precedencia sobre el .env.
// `quiet: true` es OBLIGATORIO: sin él, dotenv v17 imprime un banner en stdout
// ("injected env … tip: suppress logs") que corrompe el canal JSON-RPC de MCP
// (transport stdio) y el cliente cierra la conexión con "-32000: Connection closed".
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env'), quiet: true });
