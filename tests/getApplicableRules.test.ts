import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures', 'applicable-rules');

/**
 * getApplicableRules recorre el corpus por tags de applies_to. Los fixtures de
 * este test (fixtures/applicable-rules) son dedicados y NO comparten conteos con
 * los de rulesReader.test.ts, para no acoplar ambas suites.
 */
async function loadReader() {
  vi.resetModules();
  process.env.IAFIT_RULES_DIR = FIXTURES;
  return import('../src/utils/rulesReader.js');
}

async function loadHandler() {
  vi.resetModules();
  process.env.IAFIT_RULES_DIR = FIXTURES;
  return import('../src/tools/rules/getApplicableRules.js');
}

describe('rulesReader — vocabulario de tags', () => {
  beforeEach(() => {
    delete process.env.IAFIT_RULES_DIR;
  });

  it('reconoce los tags válidos y rechaza los desconocidos', async () => {
    const m = await loadReader();
    for (const t of m.VALID_TAGS) expect(m.isValidTag(t)).toBe(true);
    expect(m.isValidTag('net')).toBe(false);
    expect(m.isValidTag('')).toBe(false);
  });

  it('todo tag válido tiene descripción', async () => {
    const m = await loadReader();
    for (const t of m.VALID_TAGS) expect(m.TAG_DESCRIPTIONS[t]).toBeTruthy();
  });
});

describe('appliesToTags', () => {
  it('una regla ["all"] aplica a cualquier contexto', async () => {
    const m = await loadReader();
    expect(m.appliesToTags(['all'], ['angular'])).toBe(true);
    expect(m.appliesToTags(['all'], [])).toBe(true);
  });

  it('aplica solo si hay intersección de tags', async () => {
    const m = await loadReader();
    expect(m.appliesToTags(['frontend', 'angular'], ['angular'])).toBe(true);
    expect(m.appliesToTags(['backend', 'dotnet'], ['angular'])).toBe(false);
  });
});

describe('getApplicableRules', () => {
  it('trae las reglas de frontend + las transversales ["all"], excluyendo backend', async () => {
    const m = await loadReader();
    const rules = m.getApplicableRules(['frontend']);
    const slugs = rules.map(r => r.slug).sort();
    // frontend-spa (frontend), angular (frontend), secretos (all) → sí
    // dotnet (backend) → no; legacy-karma (deprecated) → no
    expect(slugs).toEqual(['angular', 'frontend-spa', 'secretos']);
  });

  it('excluye reglas deprecated/superseded aunque el tag matchee', async () => {
    const m = await loadReader();
    const rules = m.getApplicableRules(['angular']);
    expect(rules.find(r => r.slug === 'legacy-karma')).toBeUndefined();
  });

  it('las reglas transversales ["all"] quedan al final del orden', async () => {
    const m = await loadReader();
    const rules = m.getApplicableRules(['frontend']);
    expect(rules[rules.length - 1].slug).toBe('secretos');
  });

  it('mode="summary" (default) trae excerpt y no content', async () => {
    const m = await loadReader();
    const [r] = m.getApplicableRules(['backend']);
    expect(r.slug).toBe('dotnet');
    expect(r.excerpt).toContain('Clean Architecture');
    expect(r.content).toBeUndefined();
  });

  it('mode="full" trae content y no excerpt', async () => {
    const m = await loadReader();
    const [r] = m.getApplicableRules(['backend'], 'full');
    expect(r.content).toContain('Clean Architecture');
    expect(r.excerpt).toBeUndefined();
  });

  it('tags sin coincidencia devuelven solo las transversales (nunca lanza)', async () => {
    const m = await loadReader();
    // 'data' no matchea ninguna regla salvo las ['all']
    const rules = m.getApplicableRules(['data']);
    expect(rules.map(r => r.slug)).toEqual(['secretos']);
  });
});

describe('handler get_applicable_rules', () => {
  it('devuelve { tags, mode, total, rules } en el camino feliz', async () => {
    const h = await loadHandler();
    const res = h.handler({ tags: ['frontend'] }) as {
      tags: string[];
      mode: string;
      total: number;
      rules: unknown[];
    };
    expect(res.mode).toBe('summary');
    expect(res.total).toBe(3);
    expect(res.rules).toHaveLength(3);
  });

  it('rechaza tags vacíos con error estructurado', async () => {
    const h = await loadHandler();
    expect(h.handler({ tags: [] })).toMatchObject({ error: 'invalid_tags' });
    expect(h.handler({})).toMatchObject({ error: 'invalid_tags' });
  });

  it('rechaza tags fuera del vocabulario', async () => {
    const h = await loadHandler();
    expect(h.handler({ tags: ['frontend', 'net'] })).toMatchObject({
      error: 'invalid_tags',
    });
  });

  it('rechaza mode inválido', async () => {
    const h = await loadHandler();
    expect(h.handler({ tags: ['frontend'], mode: 'verbose' })).toMatchObject({
      error: 'invalid_mode',
    });
  });
});
