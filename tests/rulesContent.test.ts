import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

/**
 * Integridad del contenido: valida TODAS las reglas reales de rules/.
 * Esto convierte el repositorio de reglas en contenido verificado: si alguien
 * agrega una regla con frontmatter roto, slug duplicado o categoría equivocada,
 * la suite lo detecta antes de que llegue a los agentes.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.join(__dirname, '..', 'rules');

const STATUS_VALIDOS = ['active', 'deprecated', 'draft', 'superseded'];

function categoriasExistentes(): string[] {
  return fs
    .readdirSync(RULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
}

function reglasDe(categoria: string): string[] {
  return fs
    .readdirSync(path.join(RULES_DIR, categoria))
    .filter(f => f.endsWith('.md') && f !== '_index.md');
}

describe('integridad del contenido de rules/', () => {
  it('el directorio de reglas existe y tiene al menos una categoría con reglas', () => {
    expect(fs.existsSync(RULES_DIR), `No existe ${RULES_DIR}`).toBe(true);
    const total = categoriasExistentes().reduce((n, c) => n + reglasDe(c).length, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('cada categoría tiene su _index.md', () => {
    const faltantes = categoriasExistentes().filter(
      c => !fs.existsSync(path.join(RULES_DIR, c, '_index.md')),
    );
    expect(faltantes, `Categorías sin _index.md: ${faltantes.join(', ')}`).toEqual([]);
  });

  it('toda regla tiene frontmatter válido: title, category correcta, slug sano y status permitido', () => {
    const violaciones: string[] = [];

    for (const categoria of categoriasExistentes()) {
      for (const archivo of reglasDe(categoria)) {
        const ruta = path.join(RULES_DIR, categoria, archivo);
        const ref = `${categoria}/${archivo}`;
        let data: Record<string, unknown>;
        let content: string;
        try {
          ({ data, content } = matter(fs.readFileSync(ruta, 'utf8')));
        } catch (e) {
          violaciones.push(`${ref}: frontmatter ilegible (${(e as Error).message})`);
          continue;
        }

        if (typeof data.title !== 'string' || data.title.trim() === '') {
          violaciones.push(`${ref}: falta 'title'`);
        }
        if (data.category !== categoria) {
          violaciones.push(
            `${ref}: 'category' es '${String(data.category)}' pero está en la carpeta '${categoria}'`,
          );
        }
        if (data.slug !== undefined && !/^[a-z0-9-]+$/.test(String(data.slug))) {
          violaciones.push(`${ref}: slug '${String(data.slug)}' inválido (usa [a-z0-9-])`);
        }
        if (data.status !== undefined && !STATUS_VALIDOS.includes(String(data.status))) {
          violaciones.push(`${ref}: status '${String(data.status)}' no es ${STATUS_VALIDOS.join('|')}`);
        }
        if (content.trim() === '') {
          violaciones.push(`${ref}: la regla no tiene contenido`);
        }
      }
    }

    expect(violaciones, `\n${violaciones.join('\n')}`).toEqual([]);
  });

  it('los slugs son únicos dentro de cada categoría', () => {
    const duplicados: string[] = [];

    for (const categoria of categoriasExistentes()) {
      const vistos = new Map<string, string>();
      for (const archivo of reglasDe(categoria)) {
        const ruta = path.join(RULES_DIR, categoria, archivo);
        let slug = archivo.replace(/\.md$/, '');
        try {
          const { data } = matter(fs.readFileSync(ruta, 'utf8'));
          if (typeof data.slug === 'string') slug = data.slug;
        } catch {
          continue; // ya reportado en el test de frontmatter
        }
        const previo = vistos.get(slug);
        if (previo) {
          duplicados.push(`${categoria}: slug '${slug}' duplicado en ${previo} y ${archivo}`);
        }
        vistos.set(slug, archivo);
      }
    }

    expect(duplicados, `\n${duplicados.join('\n')}`).toEqual([]);
  });
});
