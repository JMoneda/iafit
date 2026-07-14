import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_RULES = path.join(__dirname, 'fixtures', 'rules');

/**
 * rulesReader lee IAFIT_RULES_DIR al importarse, por eso cada test resetea
 * los módulos y lo importa dinámicamente tras fijar la variable de entorno.
 */
async function loadReader() {
  vi.resetModules();
  process.env.IAFIT_RULES_DIR = FIXTURES_RULES;
  return import('../src/utils/rulesReader.js');
}

describe('rulesReader — categorías', () => {
  beforeEach(() => {
    delete process.env.IAFIT_RULES_DIR;
  });

  it('valida categorías conocidas y rechaza desconocidas', async () => {
    const m = await loadReader();
    expect(m.isValidCategory('security')).toBe(true);
    expect(m.isValidCategory('migration')).toBe(true);
    expect(m.isValidCategory('inexistente')).toBe(false);
    expect(m.isValidCategory('')).toBe(false);
  });

  it('toda categoría válida tiene descripción', async () => {
    const m = await loadReader();
    for (const cat of m.VALID_CATEGORIES) {
      expect(m.CATEGORY_DESCRIPTIONS[cat]).toBeTruthy();
    }
  });

  it('cuenta reglas por categoría excluyendo _index.md', async () => {
    const m = await loadReader();
    // fixtures/security tiene 2 reglas + _index.md (que no cuenta)
    expect(m.countRulesInCategory('security')).toBe(2);
    expect(m.countRulesInCategory('architecture')).toBe(1);
    // categoría válida sin directorio en fixtures → 0, sin lanzar excepción
    expect(m.countRulesInCategory('cicd')).toBe(0);
  });
});

describe('rulesReader — listado y lectura', () => {
  it('lista reglas con metadatos del frontmatter', async () => {
    const m = await loadReader();
    const rules = m.listRulesInCategory('security');
    const slugs = rules.map(r => r.slug).sort();
    expect(slugs).toEqual(['gestion-secretos', 'sin-slug']);

    const secretos = rules.find(r => r.slug === 'gestion-secretos')!;
    expect(secretos.title).toBe('Gestión de secretos');
    expect(secretos.applies_to).toEqual(['backend']);
    expect(secretos.status).toBe('active');
    expect(secretos.last_updated).toBe('2026-06-15');
  });

  it('aplica valores por defecto cuando el frontmatter es parcial', async () => {
    const m = await loadReader();
    const rules = m.listRulesInCategory('security');
    const sinSlug = rules.find(r => r.slug === 'sin-slug')!;
    // slug derivado del nombre de archivo, defaults de status y applies_to
    expect(sinSlug.status).toBe('active');
    expect(sinSlug.applies_to).toEqual(['all']);
  });

  it('getRule encuentra por slug del frontmatter y devuelve contenido', async () => {
    const m = await loadReader();
    const r = m.getRule('security', 'gestion-secretos');
    expect('error' in r).toBe(false);
    if (!('error' in r)) {
      expect(r.frontmatter.title).toBe('Gestión de secretos');
      expect(r.content).toContain('Azure Key Vault');
    }
  });

  it('getRule encuentra por nombre de archivo cuando no hay slug', async () => {
    const m = await loadReader();
    const r = m.getRule('security', 'sin-slug');
    expect('error' in r).toBe(false);
  });

  it('getRule devuelve rule_not_found estructurado, sin lanzar', async () => {
    const m = await loadReader();
    const r = m.getRule('security', 'no-existe');
    expect(r).toMatchObject({ error: 'rule_not_found' });
  });
});

describe('rulesReader — búsqueda', () => {
  it('encuentra coincidencias exactas y devuelve excerpt con contexto', async () => {
    const m = await loadReader();
    const matches = m.searchRules('Key Vault');
    expect(matches).toHaveLength(1);
    expect(matches[0].slug).toBe('gestion-secretos');
    expect(matches[0].category).toBe('security');
    expect(matches[0].excerpt).toContain('Key Vault');
  });

  it('es insensible a mayúsculas y a acentos (migracion ≡ Migración)', async () => {
    const m = await loadReader();
    // el fixture contiene "Migración" con tilde y mayúscula
    for (const q of ['migracion', 'MIGRACIÓN', 'Migración', 'migraciÓn']) {
      const matches = m.searchRules(q);
      expect(matches.length, `query '${q}' debería encontrar la regla`).toBe(1);
      expect(matches[0].slug).toBe('gestion-secretos');
    }
  });

  it('el excerpt conserva el texto original (no lo pasa a minúsculas)', async () => {
    const m = await loadReader();
    const [match] = m.searchRules('migracion');
    expect(match.excerpt).toContain('Migración');
  });

  it('respeta el filtro por categoría', async () => {
    const m = await loadReader();
    expect(m.searchRules('capas', 'architecture')).toHaveLength(1);
    expect(m.searchRules('capas', 'security')).toHaveLength(0);
  });

  it('query vacía o de solo espacios no devuelve resultados', async () => {
    const m = await loadReader();
    expect(m.searchRules('')).toHaveLength(0);
    expect(m.searchRules('   ')).toHaveLength(0);
  });

  it('no busca dentro de los _index.md', async () => {
    const m = await loadReader();
    expect(m.searchRules('debe excluirse')).toHaveLength(0);
  });
});
