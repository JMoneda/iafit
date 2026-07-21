import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const RULES_DIR =
  process.env.IAFIT_RULES_DIR ?? path.join(__dirname, '../../rules');

export type Category =
  | 'architecture'
  | 'code-standards'
  | 'adrs'
  | 'security'
  | 'migration'
  | 'observabilidad'
  | 'pruebas'
  | 'cicd';

export const VALID_CATEGORIES: Category[] = [
  'architecture',
  'code-standards',
  'adrs',
  'security',
  'migration',
  'observabilidad',
  'pruebas',
  'cicd',
];

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  architecture: 'Reglas de arquitectura por tipo de proyecto',
  'code-standards': 'Estándares de código por lenguaje o stack',
  adrs: 'Architecture Decision Records',
  security: 'Políticas de seguridad de desarrollo',
  migration: 'Reglas y matrices para migrar/actualizar proyectos entre versiones de framework',
  observabilidad: 'Logging, telemetría, auditoría y monitoreo',
  pruebas: 'Estándares de pruebas y calidad de código',
  cicd: 'CI/CD, DevOps e Infraestructura como Código',
};

export function isValidCategory(cat: string): cat is Category {
  return VALID_CATEGORIES.includes(cat as Category);
}

/** Estados que NO se sugieren por defecto: la regla ya no es la vigente. */
const INACTIVE_STATUSES = new Set(['deprecated', 'superseded']);

export interface RuleFrontmatter {
  title: string;
  category: string;
  slug: string;
  version?: string;
  last_updated?: string;
  applies_to?: string[];
  /** `superseded`: reemplazada por otra regla/ADR (vocabulario estándar de ADRs). */
  status?: 'active' | 'deprecated' | 'draft' | 'superseded';
  /**
   * Regla/ADR que reemplaza a esta cuando status es 'superseded' (o 'deprecated').
   * Formato `slug` o `categoria:slug`. Lo valida tests/wikilinks (si se enlaza en
   * el cuerpo) y sirve para redirigir en getRule.
   */
  superseded_by?: string;
}

export interface RuleEntry {
  slug: string;
  title: string;
  applies_to: string[];
  status: string;
  last_updated: string;
  superseded_by?: string;
}

export type RuleError = { error: string; message: string };

function listMarkdownFiles(category: Category): string[] {
  const dir = path.join(RULES_DIR, category);
  try {
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.md') && f !== '_index.md');
  } catch {
    return [];
  }
}

function readFrontmatter(filePath: string): Partial<RuleFrontmatter> {
  try {
    const { data } = matter(fs.readFileSync(filePath, 'utf8'));
    return data as Partial<RuleFrontmatter>;
  } catch {
    return {};
  }
}

export function countRulesInCategory(category: Category): number {
  return listMarkdownFiles(category).length;
}

/**
 * Lista las reglas de una categoría. Por defecto excluye las inactivas
 * (deprecated/superseded): no se sugiere aplicar una regla obsoleta. Pasa
 * includeInactive=true para verlas todas (p. ej. auditoría o trazabilidad).
 */
export function listRulesInCategory(
  category: Category,
  includeInactive = false,
): RuleEntry[] {
  return listMarkdownFiles(category)
    .map(file => {
      const fm = readFrontmatter(path.join(RULES_DIR, category, file));
      return {
        slug: fm.slug ?? file.replace('.md', ''),
        title: fm.title ?? file,
        applies_to: fm.applies_to ?? ['all'],
        status: fm.status ?? 'active',
        last_updated: fm.last_updated ?? '',
        ...(fm.superseded_by ? { superseded_by: fm.superseded_by } : {}),
      };
    })
    .filter(r => includeInactive || !INACTIVE_STATUSES.has(r.status));
}

export function getRule(
  category: Category,
  slug: string,
):
  | { frontmatter: RuleFrontmatter; content: string; warning?: string; message?: string }
  | RuleError {
  const dir = path.join(RULES_DIR, category);
  const files = listMarkdownFiles(category);

  const file = files.find(f => {
    const fm = readFrontmatter(path.join(dir, f));
    return fm.slug === slug || f === `${slug}.md`;
  });

  if (!file) {
    return {
      error: 'rule_not_found',
      message: `No existe regla con slug '${slug}' en categoría '${category}'.`,
    };
  }

  try {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    const fm = data as RuleFrontmatter;
    // La regla se devuelve igual, pero si está obsoleta se antepone un aviso
    // estructurado para que el agente prefiera la vigente (nudge, no prohibición).
    if (fm.status && INACTIVE_STATUSES.has(fm.status)) {
      const destino = fm.superseded_by
        ? `Usa '${fm.superseded_by}' en su lugar.`
        : 'No hay reemplazo declarado; verifica antes de aplicarla.';
      return {
        warning: fm.status,
        message: `Esta regla está '${fm.status}'. ${destino}`,
        frontmatter: fm,
        content,
      };
    }
    return { frontmatter: fm, content };
  } catch {
    return {
      error: 'rule_not_found',
      message: `No se pudo leer la regla '${slug}' en categoría '${category}'.`,
    };
  }
}

export interface SearchMatch {
  category: Category;
  slug: string;
  title: string;
  excerpt: string;
  score: number;
  applies_to: string[];
  status: string;
}

/**
 * Pliega un code point para búsqueda: quita diacríticos (migración → migracion)
 * y pasa a minúsculas. Garantiza mapeo 1:1 en code points para que los índices
 * del texto plegado coincidan con los del texto original.
 */
function foldCodePoint(c: string): string {
  const folded = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const points = Array.from(folded);
  return points.length === 1 ? points[0] : c;
}

function foldStr(s: string): string {
  return Array.from(s).map(foldCodePoint).join('');
}

/** Tokeniza el query: pliega acentos, minúsculas, separa por espacios. */
function tokenize(query: string): string[] {
  return foldStr(query.trim())
    .split(/\s+/)
    .filter(Boolean);
}

/** Peso de cada campo donde puede aparecer un token. */
const W_TITLE = 10;
const W_TAG = 5;
const W_BODY = 1;

export interface SearchOptions {
  category?: Category;
  limit?: number;
  includeInactive?: boolean;
}

/**
 * Búsqueda por TOKENS con ranking. A diferencia de una subcadena literal,
 * "paginacion tablas" encuentra reglas donde ambas palabras aparezcan aunque no
 * estén contiguas. Cada token suma según dónde aparezca (título > tag > cuerpo),
 * una sola vez por campo (no por ocurrencia), y el score se multiplica por la
 * COBERTURA (tokens_encontrados / tokens_totales): una regla que casa todos los
 * términos rankea por encima de otra que casa solo uno.
 *
 * Insensible a acentos y mayúsculas (reusa el folding probado). Excluye reglas
 * inactivas salvo includeInactive. Devuelve como máximo `limit` resultados
 * (default 10), ordenados por score descendente.
 */
export function searchRules(query: string, options: SearchOptions = {}): SearchMatch[] {
  const { category, limit = 10, includeInactive = false } = options;
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const categories = category ? [category] : VALID_CATEGORIES;
  const results: SearchMatch[] = [];

  for (const cat of categories) {
    for (const file of listMarkdownFiles(cat)) {
      try {
        const raw = fs.readFileSync(path.join(RULES_DIR, cat, file), 'utf8');
        const { data, content } = matter(raw);
        const fm = data as Partial<RuleFrontmatter>;
        const status = fm.status ?? 'active';
        if (!includeInactive && INACTIVE_STATUSES.has(status)) continue;

        const title = fm.title ?? '';
        const appliesTo = fm.applies_to ?? [];
        const foldedTitle = foldStr(title);
        const foldedTags = foldStr(appliesTo.join(' '));
        const foldedBody = foldStr(content);

        let score = 0;
        let matched = 0;
        let firstBodyIdx = -1;

        for (const tok of tokens) {
          let hit = false;
          if (foldedTitle.includes(tok)) {
            score += W_TITLE;
            hit = true;
          }
          if (foldedTags.includes(tok)) {
            score += W_TAG;
            hit = true;
          }
          const bIdx = foldedBody.indexOf(tok);
          if (bIdx !== -1) {
            score += W_BODY;
            hit = true;
            if (firstBodyIdx === -1) firstBodyIdx = bIdx;
          }
          if (hit) matched += 1;
        }

        if (matched === 0) continue;

        // Cobertura: premia casar todos los términos, penaliza los parciales.
        score = score * (matched / tokens.length);

        // Excerpt alrededor de la primera aparición en el cuerpo (o el inicio).
        const originalBody = Array.from(content);
        const anchor = firstBodyIdx === -1 ? 0 : firstBodyIdx;
        const start = Math.max(0, anchor - 80);
        const end = Math.min(originalBody.length, anchor + 120);
        const excerpt = `...${originalBody.slice(start, end).join('').trim()}...`;

        results.push({
          category: cat,
          slug: fm.slug ?? file.replace('.md', ''),
          title,
          excerpt,
          score: Math.round(score * 100) / 100,
          applies_to: appliesTo.length ? appliesTo : ['all'],
          status,
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  results.sort(
    (a, b) => b.score - a.score || a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug),
  );
  return results.slice(0, Math.max(1, limit));
}
