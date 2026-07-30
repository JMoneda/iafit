import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures', 'status-rules');

async function loadReader() {
  vi.resetModules();
  process.env.IAFIT_RULES_DIR = FIXTURES;
  return import('../src/utils/rulesReader.js');
}

describe('filtrado por estado — listRulesInCategory', () => {
  it('por defecto omite reglas deprecated/superseded', async () => {
    const m = await loadReader();
    const adrs = m.listRulesInCategory('adrs').map(r => r.slug);
    expect(adrs).toEqual(['0002-sql']); // 0001-postgres (superseded) excluido
    const sec = m.listRulesInCategory('security').map(r => r.slug).sort();
    expect(sec).toEqual(['secretos']); // karma-viejo (deprecated) excluido
  });

  it('include=true incluye las obsoletas y expone superseded_by', async () => {
    const m = await loadReader();
    const adrs = m.listRulesInCategory('adrs', true);
    const viejo = adrs.find(r => r.slug === '0001-postgres')!;
    expect(viejo.status).toBe('superseded');
    expect(viejo.superseded_by).toBe('adrs:0002-sql');
  });
});

describe('reglas archivadas en subcarpeta (adrs/superseded/)', () => {
  // El fixture 0001-postgres vive en adrs/superseded/: archivar un ADR reemplazado
  // NO puede sacarlo del corpus, o se pierde la trazabilidad y sus wikilinks mueren.
  it('una regla en subcarpeta sigue siendo legible por su slug, sin prefijo de ruta', async () => {
    const m = await loadReader();
    const r = m.getRule('adrs', '0001-postgres');
    expect('error' in r).toBe(false);
    const archivada = m.listRulesInCategory('adrs', true).find(x => x.slug === '0001-postgres');
    expect(archivada, 'la regla archivada debe seguir listándose con include=true').toBeDefined();
  });

  it('la subcarpeta no crea una regla nueva ni altera el conteo', async () => {
    const m = await loadReader();
    expect(m.countRulesInCategory('adrs')).toBe(2); // 0002-sql + el archivado
  });
});

describe('filtrado por estado — searchRules', () => {
  it('por defecto no devuelve reglas obsoletas', async () => {
    const m = await loadReader();
    const matches = m.searchRules('decision');
    // solo 0002-sql (active) casa "Decision vigente"; 0001-postgres está superseded
    expect(matches.every(x => x.status === 'active')).toBe(true);
    expect(matches.find(x => x.slug === '0001-postgres')).toBeUndefined();
  });

  it('includeInactive=true sí las devuelve', async () => {
    const m = await loadReader();
    const matches = m.searchRules('decision', { includeInactive: true });
    expect(matches.find(x => x.slug === '0001-postgres')).toBeDefined();
  });
});

describe('getRule — aviso de regla obsoleta', () => {
  it('regla superseded devuelve warning + mensaje que apunta al reemplazo', async () => {
    const m = await loadReader();
    const r = m.getRule('adrs', '0001-postgres');
    expect('error' in r).toBe(false);
    if (!('error' in r)) {
      expect(r.warning).toBe('superseded');
      expect(r.message).toContain('adrs:0002-sql');
      // el contenido sigue devolviéndose (a veces se necesita leer la histórica)
      expect(r.content).toContain('reemplazada');
    }
  });

  it('regla deprecated sin superseded_by avisa sin reemplazo', async () => {
    const m = await loadReader();
    const r = m.getRule('security', 'karma-viejo');
    if (!('error' in r)) {
      expect(r.warning).toBe('deprecated');
      expect(r.message).toMatch(/reemplazo|verifica/i);
    }
  });

  it('regla activa NO trae warning', async () => {
    const m = await loadReader();
    const r = m.getRule('security', 'secretos');
    if (!('error' in r)) {
      expect(r.warning).toBeUndefined();
    }
  });
});
