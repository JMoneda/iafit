import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

/**
 * Integridad de wikilinks: todo enlace [[slug]] o [[categoria:slug]] en el
 * contenido de las reglas debe resolver a una regla existente. Un enlace pelado
 * [[slug]] cuyo slug exista en más de una categoría es AMBIGUO y también falla:
 * hay que desambiguar con [[categoria:slug]].
 *
 * Esto evita que renombrar o mover una regla deje referencias muertas que nadie
 * detecta hasta que un agente sigue el enlace y no encuentra nada.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.join(__dirname, '..', 'rules');

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

interface Violacion {
  archivo: string;
  link: string;
  motivo: 'inexistente' | 'ambiguo' | 'categoria-invalida';
}

/** Construye el mapa slug -> categorías donde aparece. */
function indexarSlugs(rulesDir: string): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  const cats = fs
    .readdirSync(rulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  for (const cat of cats) {
    for (const archivo of fs.readdirSync(path.join(rulesDir, cat))) {
      if (!archivo.endsWith('.md') || archivo === '_index.md') continue;
      let slug = archivo.replace(/\.md$/, '');
      try {
        const { data } = matter(fs.readFileSync(path.join(rulesDir, cat, archivo), 'utf8'));
        if (typeof data.slug === 'string') slug = data.slug;
      } catch {
        // frontmatter roto: lo cazan otros tests
      }
      const arr = idx.get(slug) ?? [];
      arr.push(cat);
      idx.set(slug, arr);
    }
  }
  return idx;
}

/** Analiza todos los wikilinks del corpus y devuelve las violaciones. */
function analizarWikilinks(rulesDir: string): Violacion[] {
  const idx = indexarSlugs(rulesDir);
  const violaciones: Violacion[] = [];

  const cats = fs
    .readdirSync(rulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const cat of cats) {
    for (const archivo of fs.readdirSync(path.join(rulesDir, cat))) {
      if (!archivo.endsWith('.md')) continue;
      const ref = `${cat}/${archivo}`;
      const raw = fs.readFileSync(path.join(rulesDir, cat, archivo), 'utf8');
      for (const m of raw.matchAll(WIKILINK_RE)) {
        const link = m[1].trim();
        if (link === '') continue;
        if (link.includes(':')) {
          const [c, slug] = link.split(':', 2);
          const cats2 = idx.get(slug);
          if (!cats2 || !cats2.includes(c)) {
            violaciones.push({ archivo: ref, link, motivo: 'categoria-invalida' });
          }
          continue;
        }
        const cats2 = idx.get(link);
        if (!cats2) {
          violaciones.push({ archivo: ref, link, motivo: 'inexistente' });
        } else if (cats2.length > 1) {
          violaciones.push({ archivo: ref, link, motivo: 'ambiguo' });
        }
      }
    }
  }
  return violaciones;
}

function fx(nombre: string): string {
  return path.join(__dirname, 'fixtures', nombre);
}

describe('analizarWikilinks (con fixtures)', () => {
  it('no reporta violaciones cuando todos los enlaces resuelven', () => {
    expect(analizarWikilinks(fx('wikilinks-ok'))).toEqual([]);
  });

  it('detecta un enlace a un slug inexistente', () => {
    const v = analizarWikilinks(fx('wikilinks-broken'));
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ link: 'no-existe', motivo: 'inexistente' });
  });

  it('detecta un enlace pelado ambiguo (slug en 2 categorías)', () => {
    const v = analizarWikilinks(fx('wikilinks-amb'));
    const amb = v.find(x => x.link === 'dup');
    expect(amb).toBeDefined();
    expect(amb!.motivo).toBe('ambiguo');
  });
});

describe('integridad de wikilinks del corpus real', () => {
  it('todo [[wikilink]] de rules/ resuelve a una regla existente y no ambigua', () => {
    const violaciones = analizarWikilinks(RULES_DIR);
    const detalle = violaciones
      .map(v => `${v.archivo}: [[${v.link}]] (${v.motivo})`)
      .join('\n');
    expect(violaciones, `\n${detalle}`).toEqual([]);
  });
});
