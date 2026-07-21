import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * usageLog lee IAFIT_DATA_DIR al importarse, por eso cada test resetea módulos y
 * lo importa dinámicamente tras fijar un directorio temporal. Así nunca se toca
 * el ~/.iafit real de la máquina.
 */
let tmpDir: string;

async function loadLogger() {
  vi.resetModules();
  process.env.IAFIT_DATA_DIR = tmpDir;
  delete process.env.IAFIT_TELEMETRY;
  return import('../src/utils/usageLog.js');
}

function readLines(file: string): unknown[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l));
}

describe('usageLog', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iafit-usage-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.IAFIT_DATA_DIR;
    delete process.env.IAFIT_TELEMETRY;
  });

  it('escribe una línea JSONL por llamada registrada', async () => {
    const m = await loadLogger();
    m.logUsage({ ts: '2026-07-21T00:00:00Z', tool: 'get_rule', ok: true });
    m.logUsage({ ts: '2026-07-21T00:00:01Z', tool: 'search_rules', ok: true });
    const lines = readLines(m.usageLogPath()) as Array<Record<string, unknown>>;
    expect(lines).toHaveLength(2);
    expect(lines[0].tool).toBe('get_rule');
    expect(lines[1].tool).toBe('search_rules');
  });

  it('no escribe nada cuando IAFIT_TELEMETRY=0', async () => {
    vi.resetModules();
    process.env.IAFIT_DATA_DIR = tmpDir;
    process.env.IAFIT_TELEMETRY = '0';
    const m = await import('../src/utils/usageLog.js');
    m.logUsage({ ts: 't', tool: 'get_rule', ok: true });
    expect(fs.existsSync(m.usageLogPath())).toBe(false);
  });

  it('no lanza aunque el directorio no se pueda crear (fire-and-forget)', async () => {
    vi.resetModules();
    // Apunta IAFIT_DATA_DIR a una ruta imposible (un archivo como "directorio")
    const archivo = path.join(tmpDir, 'soy-un-archivo');
    fs.writeFileSync(archivo, 'x');
    process.env.IAFIT_DATA_DIR = path.join(archivo, 'sub');
    delete process.env.IAFIT_TELEMETRY;
    const m = await import('../src/utils/usageLog.js');
    expect(() => m.logUsage({ ts: 't', tool: 'get_rule', ok: true })).not.toThrow();
  });

  it('rota el log al superar el umbral', async () => {
    const m = await loadLogger();
    // Precarga un archivo por encima del umbral (5MB) para forzar rotación
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(m.usageLogPath(), 'x'.repeat(5 * 1024 * 1024 + 10));
    m.logUsage({ ts: 't', tool: 'get_rule', ok: true });
    expect(fs.existsSync(`${m.usageLogPath()}.1`)).toBe(true);
    // El nuevo log arranca solo con la última entrada
    expect(readLines(m.usageLogPath())).toHaveLength(1);
  });
});

describe('extractMeta', () => {
  it('search_rules: marca zero=true cuando total es 0', async () => {
    const m = await loadLogger();
    const meta = m.extractMeta('search_rules', { query: 'kubernetes' }, { total: 0 });
    expect(meta).toMatchObject({ query: 'kubernetes', total: 0, zero: true });
  });

  it('search_rules: zero=false cuando hay resultados', async () => {
    const m = await loadLogger();
    const meta = m.extractMeta('search_rules', { query: 'jwt' }, { total: 3 });
    expect(meta).toMatchObject({ total: 3, zero: false });
  });

  it('get_applicable_rules: captura tags, mode y total', async () => {
    const m = await loadLogger();
    const meta = m.extractMeta(
      'get_applicable_rules',
      { tags: ['angular'], mode: 'summary' },
      { total: 4 },
    );
    expect(meta).toMatchObject({ tags: ['angular'], mode: 'summary', total: 4 });
  });

  it('get_rule: found=false ante error estructurado', async () => {
    const m = await loadLogger();
    const meta = m.extractMeta(
      'get_rule',
      { category: 'security', slug: 'no-existe' },
      { error: 'rule_not_found' },
    );
    expect(meta).toMatchObject({ category: 'security', slug: 'no-existe', found: false });
  });

  it('tools de escritura: solo registra el código de error, nunca payload', async () => {
    const m = await loadLogger();
    const conError = m.extractMeta('create_work_item', { title: 'secreto' }, { error: 'forbidden' });
    expect(conError).toEqual({ error: 'forbidden' });
    const ok = m.extractMeta('create_work_item', { title: 'secreto' }, { id: 42 });
    expect(ok).toBeUndefined(); // sin error → no se registra metadata (nada sensible)
  });
});
