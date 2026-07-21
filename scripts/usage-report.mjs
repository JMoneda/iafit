#!/usr/bin/env node
/**
 * Reporte de uso de IAFIT. Agrega el JSONL de telemetría (~/.iafit/usage.jsonl,
 * o IAFIT_DATA_DIR) y responde tres preguntas que guían el backlog de reglas:
 *   1. ¿Qué tools se usan y cuáles no?
 *   2. ¿Qué reglas se leen más (get_rule)?
 *   3. ¿Qué búsquedas dieron CERO resultados? (candidatas a reglas faltantes)
 *
 * Uso:
 *   node scripts/usage-report.mjs
 *   IAFIT_DATA_DIR=/ruta node scripts/usage-report.mjs
 *
 * Es de solo lectura y corre en Node puro (no requiere compilar). Escribe el
 * reporte en stdout: NO lo ejecuta el servidor MCP, así que aquí stdout es seguro.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const DATA_DIR = process.env.IAFIT_DATA_DIR ?? path.join(os.homedir(), '.iafit');
const LOG_FILE = path.join(DATA_DIR, 'usage.jsonl');

function leerEntradas(file) {
  if (!fs.existsSync(file)) return [];
  const entradas = [];
  for (const linea of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!linea.trim()) continue;
    try {
      entradas.push(JSON.parse(linea));
    } catch {
      // línea corrupta: se ignora
    }
  }
  return entradas;
}

function ordenarPorConteoDesc(mapa) {
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

function main() {
  const entradas = leerEntradas(LOG_FILE);
  if (entradas.length === 0) {
    console.log(`Sin datos de uso en ${LOG_FILE}.`);
    console.log('(El servidor registra uso automáticamente salvo que IAFIT_TELEMETRY=0.)');
    return;
  }

  const desde = entradas[0].ts;
  const hasta = entradas[entradas.length - 1].ts;
  console.log(`# Reporte de uso de IAFIT`);
  console.log(`Archivo: ${LOG_FILE}`);
  console.log(`Entradas: ${entradas.length}  ·  Rango: ${desde} → ${hasta}\n`);

  // 1. Tools: conteo total y fallos
  const porTool = new Map();
  const fallosPorTool = new Map();
  for (const e of entradas) {
    porTool.set(e.tool, (porTool.get(e.tool) ?? 0) + 1);
    if (e.ok === false) fallosPorTool.set(e.tool, (fallosPorTool.get(e.tool) ?? 0) + 1);
  }
  console.log('## Tools por uso');
  for (const [tool, n] of ordenarPorConteoDesc(porTool)) {
    const fallos = fallosPorTool.get(tool) ?? 0;
    const sufijo = fallos > 0 ? `  (${fallos} con error)` : '';
    console.log(`  ${String(n).padStart(5)}  ${tool}${sufijo}`);
  }

  // 2. Reglas más leídas (get_rule con found=true)
  const porRegla = new Map();
  for (const e of entradas) {
    if (e.tool !== 'get_rule' || !e.meta || e.meta.found === false) continue;
    const clave = `${e.meta.category ?? '?'}:${e.meta.slug ?? '?'}`;
    porRegla.set(clave, (porRegla.get(clave) ?? 0) + 1);
  }
  console.log('\n## Reglas más leídas (get_rule)');
  const reglas = ordenarPorConteoDesc(porRegla).slice(0, 15);
  if (reglas.length === 0) console.log('  (ninguna todavía)');
  for (const [regla, n] of reglas) console.log(`  ${String(n).padStart(5)}  ${regla}`);

  // 3. Búsquedas con CERO resultados (candidatas a reglas faltantes)
  const cero = new Map();
  for (const e of entradas) {
    if (e.tool !== 'search_rules' || !e.meta || e.meta.zero !== true) continue;
    const q = String(e.meta.query ?? '').trim();
    if (q) cero.set(q, (cero.get(q) ?? 0) + 1);
  }
  console.log('\n## Búsquedas con CERO resultados (posibles reglas faltantes)');
  const ceroOrden = ordenarPorConteoDesc(cero).slice(0, 20);
  if (ceroOrden.length === 0) console.log('  (ninguna: toda búsqueda encontró algo)');
  for (const [q, n] of ceroOrden) console.log(`  ${String(n).padStart(5)}  "${q}"`);
}

main();
