import type { AttributeDef } from "@/data/nomenclature";

/** Форматирование цены: 1 234 ₽ */
export function fmtPrice(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(v)) + " ₽";
}

/** Русская плюрализация: plural(3, ["предложение", "предложения", "предложений"]) */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (d > 1 && d < 5) return forms[1];
  if (d === 1) return forms[0];
  return forms[2];
}

/** Значение атрибута в человекочитаемом виде */
export function formatAttrValue(def: AttributeDef, value: unknown): string {
  if (typeof value === "number") {
    const s = (Number.isInteger(value) ? String(value) : String(value).replace(".", ",")) + (def.unit ? ` ${def.unit}` : "");
    if (def.code === "diameter") return `⌀${s}`;
    if (def.code === "flutes") return `Z${Number.isInteger(value) ? value : value}`;
    if (def.code === "nose_radius") return `R${String(value).replace(".", ",")}${def.unit ? " " + def.unit : ""}`;
    return s;
  }
  return String(value);
}

/** Ключевые характеристики товара (для строки списка/карточки) */
export function keySpecs(
  schema: AttributeDef[],
  attributes: Record<string, unknown> | null | undefined,
  limit = 4,
): string[] {
  if (!attributes) return [];
  const out: string[] = [];
  for (const def of schema) {
    if (!def.isKey) continue;
    const v = attributes[def.code];
    if (v === undefined || v === null || v === "") continue;
    out.push(formatAttrValue(def, v));
    if (out.length >= limit) break;
  }
  return out;
}
