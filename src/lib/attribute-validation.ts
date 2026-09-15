/**
 * Валидация атрибутов товара по схеме категории.
 * Единые правила для: формы селлера, импорта CSV/Excel, будущей админки.
 */
import type { AttributeDef } from "@/data/nomenclature";

export interface AttrValidationErrors {
  [attrCode: string]: string;
}

/** Нормализует сырое значение (строка из формы/файла) к типу атрибута или возвращает ошибку */
function coerce(def: AttributeDef, raw: unknown): { ok: true; value: string | number | boolean } | { ok: false; error: string } {
  if (def.type === "number") {
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim().replace(",", "."));
    if (!Number.isFinite(n)) return { ok: false, error: "Ожидается число" };
    if (def.values && !def.values.map(Number).includes(n)) return { ok: false, error: `Допустимо: ${def.values.join(", ")}` };
    return { ok: true, value: n };
  }
  if (def.type === "bool") {
    if (typeof raw === "boolean") return { ok: true, value: raw };
    const s = String(raw ?? "").trim().toLowerCase();
    return { ok: true, value: ["1", "да", "true", "yes", "+"].includes(s) };
  }
  const s = String(raw ?? "").trim();
  if (def.type === "enum" && def.values && s !== "" && !def.values.map(String).includes(s)) {
    return { ok: false, error: `Допустимо: ${def.values.slice(0, 5).join(", ")}${def.values.length > 5 ? "…" : ""}` };
  }
  return { ok: true, value: s };
}

/**
 * Валидирует и нормализует объект атрибутов.
 * Возвращает errors (пустой = ок) и очищенные attrs (только заполненные значения).
 */
export function validateAttributes(
  schema: AttributeDef[],
  input: Record<string, unknown>,
): { errors: AttrValidationErrors; attrs: Record<string, string | number | boolean> } {
  const errors: AttrValidationErrors = {};
  const attrs: Record<string, string | number | boolean> = {};

  for (const def of schema) {
    const raw = input[def.code];
    const hasValue = raw !== undefined && raw !== null && String(raw).trim() !== "";
    if (!hasValue) {
      if (def.required) errors[def.code] = "Обязательное поле";
      continue;
    }
    const res = coerce(def, raw);
    if (!res.ok) {
      errors[def.code] = res.error;
    } else if (res.value !== "" || def.type === "string") {
      if (res.value !== "") attrs[def.code] = res.value;
    }
  }
  return { errors, attrs };
}
