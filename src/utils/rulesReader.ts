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
/**
 * Vocabulario CERRADO de tags para `applies_to`. Existe para que el matching de
 * get_applicable_rules sea confiable: si un frontmatter escribiera "net" y otro
 * "dotnet", el filtrado por intersección fallaría en silencio. El test de
 * integridad (rulesContent.test.ts) rechaza cualquier tag fuera de esta lista,
 * así que ampliar el vocabulario es un cambio deliberado (editar aquí) y no un
 * typo que se cuela.
 *
 * `all` es especial: una regla con applies_to:["all"] aplica a CUALQUIER contexto
 * (ver appliesToTags). No se pide como tag de búsqueda; se usa en las reglas
 * transversales (seguridad, observabilidad, cicd).
 */
export type Tag =
  | 'all'
  | 'backend'
  | 'frontend'
  | 'data'
  | 'dotnet'
  | 'angular'
  | 'typescript'
  | 'libreria';

export const VALID_TAGS: Tag[] = [
  'all',
  'backend',
  'frontend',
  'data',
  'dotnet',
  'angular',
  'typescript',
  'libreria',
];

export const TAG_DESCRIPTIONS: Record<Tag, string> = {
  all: 'Regla transversal: aplica a cualquier stack o contexto',
  backend: 'Servicios backend (independiente del lenguaje)',
  frontend: 'Aplicaciones y librerías de front-end',
  data: 'Persistencia y modelado de datos',
  dotnet: 'Stack .NET / C#',
  angular: 'Stack Angular',
  typescript: 'Código TypeScript (front o back)',
  libreria: 'Librería publicada (feed privado / npm)',
};

export function isValidTag(tag: string): tag is Tag {
  return VALID_TAGS.includes(tag as Tag);
}

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

export interface ApplicableRule {
  category: Category;
  slug: string;
  title: string;
  applies_to: string[];
  status: string;
  /** Presente solo en mode='full'. */
  content?: string;
  /** Presente solo en mode='summary': primeras líneas útiles del cuerpo. */
  excerpt?: string;
}

/**
 * Decide si una regla, según su `applies_to`, aplica a un conjunto de tags de
 * contexto. Una regla `["all"]` aplica siempre; en caso contrario, aplica si hay
 * intersección entre sus tags y los pedidos. El match es exacto sobre el
 * vocabulario cerrado (VALID_TAGS), no por substring.
 */
export function appliesToTags(ruleTags: string[], requested: string[]): boolean {
  if (ruleTags.includes('all')) return true;
  return ruleTags.some(t => requested.includes(t));
}

/** Extrae un excerpt corto del cuerpo: la primera línea de prosa no vacía. */
function firstProseLine(content: string): string {
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#') || line.startsWith('>')) continue;
    return line.length > 160 ? `${line.slice(0, 157)}...` : line;
  }
  return '';
}

/**
 * Devuelve, en UNA sola pasada por todo el corpus, las reglas activas que aplican
 * a los tags de contexto dados. Es el atajo pensado para el arranque de una tarea
 * de desarrollo: en vez de encadenar list_rule_categories → list_rules → get_rule,
 * el agente pide de golpe todo lo que aplica a, p. ej., ["angular","frontend"].
 *
 * - mode='summary' (default): título, slug, applies_to y un excerpt de una línea.
 *   Pensado para que el agente decida qué leer sin saturar su contexto.
 * - mode='full': incluye el contenido completo de cada regla.
 *
 * Excluye reglas deprecated/superseded: nunca se sugiere aplicar una regla obsoleta.
 * El orden prioriza las reglas más específicas (menos tags 'all') primero.
 */
export function getApplicableRules(
  tags: string[],
  mode: 'summary' | 'full' = 'summary',
): ApplicableRule[] {
  const results: ApplicableRule[] = [];

  for (const cat of VALID_CATEGORIES) {
    for (const file of listMarkdownFiles(cat)) {
      try {
        const raw = fs.readFileSync(path.join(RULES_DIR, cat, file), 'utf8');
        const { data, content } = matter(raw);
        const fm = data as Partial<RuleFrontmatter>;

        const status = fm.status ?? 'active';
        if (status === 'deprecated' || status === 'superseded') continue;

        const ruleTags = fm.applies_to ?? ['all'];
        if (!appliesToTags(ruleTags, tags)) continue;

        const base: ApplicableRule = {
          category: cat,
          slug: fm.slug ?? file.replace('.md', ''),
          title: fm.title ?? file,
          applies_to: ruleTags,
          status,
        };
        if (mode === 'full') base.content = content;
        else base.excerpt = firstProseLine(content);

        results.push(base);
      } catch {
        // se omiten archivos ilegibles; rulesContent.test.ts los cazaría
      }
    }
  }

  // Reglas específicas antes que transversales (['all'] al final).
  results.sort((a, b) => {
    const aAll = a.applies_to.includes('all') ? 1 : 0;
    const bAll = b.applies_to.includes('all') ? 1 : 0;
    if (aAll !== bAll) return aAll - bAll;
    return a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug);
  });

  return results;
}
