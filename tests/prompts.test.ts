import { describe, it, expect, vi } from 'vitest';

/**
 * Contrato del catálogo de prompts: nombres únicos, build() bien formado, y que
 * el prompt de desarrollo dirija realmente al agente a cargar las reglas antes de
 * codificar (get_applicable_rules). Protege el camino "Desarrollar" que antes
 * quedaba huérfano en iafit-inicio.
 */
async function loadPrompts() {
  vi.resetModules();
  return import('../src/prompts/index.js');
}

describe('catálogo de prompts', () => {
  it('registra iafit-inicio, iafit-migracion, iafit-desarrollo e iafit-sdd con nombres únicos', async () => {
    const { prompts, promptMap } = await loadPrompts();
    const nombres = prompts.map(p => p.name);
    expect(nombres).toContain('iafit-inicio');
    expect(nombres).toContain('iafit-migracion');
    expect(nombres).toContain('iafit-desarrollo');
    expect(nombres).toContain('iafit-sdd');
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const n of nombres) expect(promptMap.get(n)).toBeDefined();
  });

  it('todo prompt tiene descripción y build() devuelve messages no vacío', async () => {
    const { prompts } = await loadPrompts();
    for (const p of prompts) {
      expect(p.description, `${p.name} sin descripción`).toBeTruthy();
      const built = p.build();
      expect(built.description).toBeTruthy();
      expect(Array.isArray(built.messages)).toBe(true);
      expect(built.messages.length).toBeGreaterThan(0);
      for (const m of built.messages) {
        expect(m.role).toBe('user');
        expect(m.content.type).toBe('text');
        expect(m.content.text.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('prompt iafit-desarrollo', () => {
  it('instruye a cargar las reglas con get_applicable_rules antes de codificar', async () => {
    const { desarrollo } = await import('../src/prompts/desarrollo.js');
    const texto = desarrollo.build().messages[0].content.text;
    expect(texto).toContain('get_applicable_rules');
    // debe dejar claro que las reglas se cargan ANTES de escribir código
    expect(texto).toMatch(/ANTES de codificar|ANTES de escribir|sin haber cargado/i);
    // y que el trabajo se documenta en español
    expect(texto).toContain('ESPAÑOL');
  });
});

describe('prompt iafit-inicio', () => {
  it('ya no deja huérfano el camino "Desarrollar": referencia iafit-desarrollo', async () => {
    const { inicio } = await import('../src/prompts/inicio.js');
    const texto = inicio.build().messages[0].content.text;
    expect(texto).toContain('iafit-desarrollo');
    expect(texto).toContain('iafit-migracion');
  });

  it('ofrece el camino SDD y lo enruta a iafit-sdd', async () => {
    const { inicio } = await import('../src/prompts/inicio.js');
    const texto = inicio.build().messages[0].content.text;
    expect(texto).toContain('iafit-sdd');
  });
});

describe('prompt iafit-sdd', () => {
  /**
   * El valor de este prompt está en NO hardcodear el catálogo: si enumera los
   * schemas o las reglas en su texto, queda desactualizado a la primera adición.
   * Estos tests fijan ese contrato.
   */
  it('consulta el catálogo real al MCP en vez de enumerarlo', async () => {
    const { sdd } = await import('../src/prompts/sdd.js');
    const texto = sdd.build().messages[0].content.text;
    expect(texto).toContain('list_schemas');
    expect(texto).toMatch(/list_rules|get_applicable_rules/);
    expect(texto).toMatch(/NUNCA hardcodees|no de tu memoria/i);
  });

  it('detecta los cuatro casos posibles, incluido el conflicto de ambas raíces', async () => {
    const { sdd } = await import('../src/prompts/sdd.js');
    const texto = sdd.build().messages[0].content.text;
    expect(texto).toContain('openspec/config.yaml');
    expect(texto).toContain('.specify/');
    expect(texto).toContain('CONFLICTO');
  });

  it('enruta la conversión al schema en vez de improvisarla, y advierte de la pérdida', async () => {
    const { sdd } = await import('../src/prompts/sdd.js');
    const texto = sdd.build().messages[0].content.text;
    expect(texto).toContain('cambio-de-framework-sdd');
    expect(texto).toMatch(/NO improvises/i);
    expect(texto).toContain('equivalencias-openspec-speckit');
  });

  it('no actúa sin confirmación y avisa de que /speckit.constitution sobrescribe', async () => {
    const { sdd } = await import('../src/prompts/sdd.js');
    const texto = sdd.build().messages[0].content.text;
    expect(texto).toMatch(/sin confirmación explícita/i);
    expect(texto).toContain('/speckit.constitution');
    expect(texto).toMatch(/SOBRESCRIBE/i);
  });

  it('se redacta en español', async () => {
    const { sdd } = await import('../src/prompts/sdd.js');
    expect(sdd.build().messages[0].content.text).toContain('ESPAÑOL');
  });
});
