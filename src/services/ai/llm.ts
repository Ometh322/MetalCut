/**
 * LLM-слой подбора: OpenAI-совместимый /chat/completions.
 * Активируется, если заданы LLM_API_BASE + LLM_API_KEY + LLM_MODEL в окружении.
 * Задача модели — извлечение структурированных данных, не генерация: temperature 0,
 * короткий ответ, жёсткий таймаут. Валидация значений происходит после вызова.
 */
import type { ParsedAttrFilter, ParsedQuery, QueryParser } from "./types";

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_BASE && process.env.LLM_API_KEY && process.env.LLM_MODEL);
}

interface LlmRaw {
  category?: string;
  diameter?: number;
  flutes?: number;
  thread?: string;
  workpiece?: string;
  material?: string;
  coating?: string;
}

const SYSTEM_PROMPT = `Ты — парсер поисковых запросов магазина металлорежущего инструмента (русскоязычный).
Верни ТОЛЬКО валидный JSON без markdown и пояснений, по схеме:
{"category":"slug|null","diameter":число_мм|null,"flutes":число|null,"thread":"M8|null","workpiece":"значение|null","material":"значение|null","coating":"значение|null"}
Выбирай slug только из списка категорий, значения workpiece/material/coating — только из переданных списков.
Если параметр не определён — null. Никаких своих полей.`;

function extractJson(text: string): LlmRaw | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as LlmRaw;
  } catch {
    return null;
  }
}

export const llmParser: QueryParser = {
  name: "llm",
  async parse(query) {
    if (!llmConfigured()) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const resp = await fetch(`${process.env.LLM_API_BASE!.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL,
          temperature: 0,
          max_tokens: 300,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query },
          ],
        }),
        signal: controller.signal,
      });
      if (!resp.ok) return null;
      const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const raw = extractJson(content);
      if (!raw) return null;

      const attrs: ParsedAttrFilter[] = [];
      if (Number.isFinite(raw.diameter) && (raw.diameter as number) > 0) {
        attrs.push({ code: "diameter", min: raw.diameter as number, max: raw.diameter as number });
      }
      if (Number.isFinite(raw.flutes) && (raw.flutes as number) > 0) {
        attrs.push({ code: "flutes", values: [String(raw.flutes)] });
      }
      if (raw.thread) attrs.push({ code: "thread_nominal", values: [raw.thread.toUpperCase()] });
      if (raw.workpiece) attrs.push({ code: "workpiece", values: [raw.workpiece] });
      if (raw.material) attrs.push({ code: "material", values: [raw.material] });
      if (raw.coating) attrs.push({ code: "coating", values: [raw.coating] });

      const categorySlug = typeof raw.category === "string" && /^[a-z0-9-]+$/.test(raw.category) ? raw.category : undefined;
      if (!categorySlug && attrs.length === 0) return null;

      return { categorySlug, attrs, leftover: "", via: "llm" };
    } catch {
      return null; // таймаут/сетевая ошибка — тихо падаем в правила
    } finally {
      clearTimeout(timer);
    }
  },
};
