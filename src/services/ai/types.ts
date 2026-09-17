/**
 * Контракт AI-слоя подбора: превращает естественный запрос в фильтры каталога.
 * Реализации: rule-based (всегда доступен) и LLM (OpenAI-совместимый API).
 */
export interface ParsedAttrFilter {
  code: string;
  values?: string[];
  min?: number;
  max?: number;
}

export interface ParsedQuery {
  /** slug листовой категории, если распознана */
  categorySlug?: string;
  /** атрибутные фильтры (коды валидированы по схеме категории) */
  attrs: ParsedAttrFilter[];
  /** осмысленный остаток запроса для текстового поиска */
  leftover: string;
  /** чем разобрано — для отображения и отладки */
  via: "rules" | "llm";
}

export interface QueryParser {
  readonly name: string;
  parse(query: string): Promise<ParsedQuery | null>;
}
