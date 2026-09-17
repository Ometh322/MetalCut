/**
 * Композитный AI-парсер: правила → (если неуверенно) LLM → валидация по схеме категории.
 * Схема атрибутов — guardrail: значения вне справочника отбрасываются,
 * поэтому ни правила, ни LLM не могут «навести» несуществующие фильтры.
 */
import type { AttributeDef } from "@/data/nomenclature";
import { findCategory, leafCategories } from "@/data/nomenclature";
import { prisma } from "@/lib/db";
import { llmConfigured, llmParser } from "./llm";
import { parseByRules } from "./rule-based";
import type { ParsedAttrFilter, ParsedQuery } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

/** Схемы категорий из БД (админ мог отредактировать) с фолбэком к кодовой номенклатуре */
async function loadSchema(categorySlug: string): Promise<AttributeDef[]> {
  const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (cat?.attributeSchema) return cat.attributeSchema as unknown as AttributeDef[];
  return findCategory(categorySlug)?.attributes ?? [];
}

/** Приводит значения фильтра к допустимым по схеме; возвращает очищенный список */
function validateAgainstSchema(attrs: ParsedAttrFilter[], schema: AttributeDef[]): ParsedAttrFilter[] {
  const out: ParsedAttrFilter[] = [];
  for (const f of attrs) {
    const def = schema.find((d) => d.code === f.code);
    if (!def) continue; // атрибута нет в категории — фильтр не имеет смысла
    if (f.values?.length) {
      const allowed = (def.values ?? []).map(String);
      const ok = f.values.filter((v) => allowed.some((a) => norm(a) === norm(v)));
      if (ok.length) out.push({ code: f.code, values: ok });
    } else if (f.min !== undefined || f.max !== undefined) {
      out.push({
        code: f.code,
        min: f.min !== undefined && Number.isFinite(f.min) ? f.min : undefined,
        max: f.max !== undefined && Number.isFinite(f.max) ? f.max : undefined,
      });
    }
  }
  return out;
}

/** Существует ли листовая категория */
async function categoryExists(slug: string): Promise<boolean> {
  const cat = await prisma.category.findUnique({ where: { slug } });
  return Boolean(cat) || leafCategories().some((c) => c.slug === slug);
}

const confident = (p: ParsedQuery | null): boolean => Boolean(p && p.categorySlug && p.attrs.length > 0);

export interface ParseOutcome {
  parsed: ParsedQuery | null;
  llmTried: boolean;
}

export async function parseQuery(query: string): Promise<ParseOutcome> {
  const q = query.trim();
  if (q.length < 2) return { parsed: null, llmTried: false };

  const rules = parseByRules(q);
  if (confident(rules) && rules!.categorySlug) {
    const schema = await loadSchema(rules!.categorySlug);
    const attrs = validateAgainstSchema(rules!.attrs, schema);
    if (attrs.length) {
      return { parsed: { ...rules!, attrs }, llmTried: false };
    }
  }

  // Правила неуверенны — пробуем LLM, если настроен
  if (llmConfigured()) {
    const llm = await llmParser.parse(q);
    if (llm) {
      let categorySlug = llm.categorySlug;
      if (categorySlug && !(await categoryExists(categorySlug))) categorySlug = undefined;
      if (categorySlug) {
        const schema = await loadSchema(categorySlug);
        const attrs = validateAgainstSchema(llm.attrs, schema);
        if (attrs.length) {
          return { parsed: { categorySlug, attrs, leftover: rules?.leftover ?? "", via: "llm" }, llmTried: true };
        }
      }
      // категорию не распознали, но атрибуты общие (workpiece/material) применимы глобально?
      if (!categorySlug && llm.attrs.length) {
        return { parsed: { attrs: llm.attrs, leftover: q, via: "llm" }, llmTried: true };
      }
    }
  }

  // Финальный фолбэк: правила как есть (даже частичные)
  if (rules?.categorySlug) {
    const schema = await loadSchema(rules.categorySlug);
    const attrs = validateAgainstSchema(rules.attrs, schema);
    if (attrs.length || rules.categorySlug) {
      return { parsed: { ...rules, attrs }, llmTried: llmConfigured() };
    }
  }
  if (rules) return { parsed: { ...rules, attrs: [] }, llmTried: llmConfigured() };
  return { parsed: null, llmTried: llmConfigured() };
}

export type { ParsedQuery, ParsedAttrFilter } from "./types";
export { llmConfigured } from "./llm";
