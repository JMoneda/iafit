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
  it('registra iafit-inicio, iafit-migracion e iafit-desarrollo con nombres únicos', async () => {
    const { prompts, promptMap } = await loadPrompts();
    const nombres = prompts.map(p => p.name);
    expect(nombres).toContain('iafit-inicio');
    expect(nombres).toContain('iafit-migracion');
    expect(nombres).toContain('iafit-desarrollo');
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
});
