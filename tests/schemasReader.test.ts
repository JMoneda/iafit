import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_SCHEMAS = path.join(__dirname, 'fixtures', 'schemas');

async function loadReader() {
  vi.resetModules();
  process.env.IAFIT_SCHEMAS_DIR = FIXTURES_SCHEMAS;
  return import('../src/utils/schemasReader.js');
}

describe('schemasReader — listado', () => {
  it('lista los schemas con nombre, versión y descripción', async () => {
    const m = await loadReader();
    const schemas = m.listSchemas();
    const names = schemas.map(s => s.name).sort();
    expect(names).toEqual(['demo', 'plegado']);

    const demo = schemas.find(s => s.name === 'demo')!;
    expect(demo.version).toBe('1.0.0');
    expect(demo.description).toBe('Schema de demostración para pruebas');
  });

  it('concatena descripciones con escalar plegado (description: >)', async () => {
    const m = await loadReader();
    const plegado = m.listSchemas().find(s => s.name === 'plegado')!;
    expect(plegado.description).toBe(
      'Descripción en varias líneas que debe concatenarse en una sola.',
    );
    expect(plegado.version).toBe('2.1.0');
  });
});

describe('schemasReader — obtención', () => {
  it('devuelve schema.yaml y sus plantillas', async () => {
    const m = await loadReader();
    const s = m.getSchema('demo');
    expect('error' in s).toBe(false);
    if (!('error' in s)) {
      expect(s.schemaYaml).toContain('name: demo');
      expect(Object.keys(s.templates)).toEqual(['plan.md']);
      expect(s.templates['plan.md']).toContain('# Plan');
    }
  });

  it('schema sin plantillas devuelve templates vacío, sin lanzar', async () => {
    const m = await loadReader();
    const s = m.getSchema('plegado');
    expect('error' in s).toBe(false);
    if (!('error' in s)) {
      expect(s.templates).toEqual({});
    }
  });

  it('devuelve schema_not_found para nombres inexistentes', async () => {
    const m = await loadReader();
    expect(m.getSchema('no-existe')).toMatchObject({ error: 'schema_not_found' });
  });

  it('rechaza nombres con path traversal o caracteres inválidos (frontera de seguridad)', async () => {
    const m = await loadReader();
    for (const malicioso of ['../secreto', '..', 'demo/../../etc', 'demo\\..', 'DEMO', 'a b']) {
      expect(m.getSchema(malicioso), `'${malicioso}' debe rechazarse`).toMatchObject({
        error: 'schema_not_found',
      });
    }
  });
});
