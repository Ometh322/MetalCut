/**
 * Rule-based разбор запроса: словари отраслевой номенклатуры + регулярные выражения.
 * Работает без внешних зависимостей и ключей — фундамент AI-подбора.
 */
import type { ParsedAttrFilter, ParsedQuery, QueryParser } from "./types";

/** Подсказки категории: специфичные — раньше, общие («фрез», «сверл») — в конце */
const CATEGORY_HINTS: [RegExp, string][] = [
  [/концев/i, "end-mills"],
  [/шпоночн/i, "keyway-mills"],
  [/торц|торцев/i, "face-mills"],
  [/дисков|пильн|тр[ое]хсторон/i, "disc-mills"],
  [/резьбофрез|резьбов[а-я]*\s+фрез|фрез[а-я]*\s+для\s+резьб/i, "thread-mills"],
  [/ступенчат/i, "step-drills"],
  [/центровочн/i, "center-drills"],
  [/кольцев|коронк/i, "core-drills"],
  [/зенков|зенкер/i, "countersinks"],
  [/разв[её]ртк/i, "reamers"],
  [/метчик/i, "taps"],
  [/плашк/i, "dies"],
  [/сменн[а-я]*\s+пластин|пластин[а-я]*/i, "inserts"],
  [/цанг/i, "er-collets"],
  [/державк/i, "mill-holders"],
  [/сверлильн[а-я]*\s+патрон|патрон[а-я]*\s+сверл/i, "drill-chucks"],
  [/резц[а-я]*|проходн|расточн|борштанг/i, "turning-tools"],
  [/спиральн[а-я]*\s+сверл|сверл/i, "twist-drills"],
  [/фрез/i, "end-mills"],
];

/** Обрабатываемый материал */
const WORKPIECE_HINTS: [RegExp, string][] = [
  [/нержаве[йю]|нерж/i, "Нержавеющая сталь"],
  [/алюмин/i, "Алюминий"],
  [/чугун/i, "Чугун"],
  [/титан/i, "Титан"],
  [/закал[её]нн/i, "Закалённая сталь"],
  [/жаропрочн/i, "Жаропрочные сплавы"],
  [/цветн[а-я]*\s+сплав/i, "Цветные сплавы"],
  [/(?:по|для|под)\s+стал/i, "Сталь"],
];

/** Материал режущей части */
const MATERIAL_HINTS: [RegExp, string][] = [
  [/hss[-\s]?e|р6м5к5/i, "HSS-E"],
  [/hss[-\s]?co|кобальт/i, "HSS-Co"],
  [/твердосплав|карбид|вк8|вк6|т15к6|т5к10/i, "Твёрдый сплав"],
  [/hss|быстрорез|р6м5/i, "HSS"],
];

const COATING_HINTS: [RegExp, string][] = [
  [/tialn/i, "TiAlN"],
  [/altin/i, "AlTiN"],
  [/ticn/i, "TiCN"],
  [/alcrn/i, "AlCrN"],
  [/\btin\b/i, "TiN"],
  [/\bcrn\b/i, "CrN"],
  [/\bzrn\b/i, "ZrN"],
  [/\bdlc\b/i, "DLC"],
];

/** Формы сменных пластин по ISO-кодам */
const SHAPE_HINTS: [RegExp, string][] = [
  [/(?:cnmg|wnmg|ccgt|ccmt)/i, "Ромб 80° (C/W)"],
  [/(?:dnmg|dcmt)/i, "Ромб 55° (D)"],
  [/(?:vnmg|vcgt|vbmt)/i, "Ромб 35° (V)"],
  [/(?:tnmg|tcgt|tpgt)/i, "Треугольник (T)"],
  [/(?:snmg|scgt)/i, "Квадрат (S)"],
  [/(?:rnmg|rcgt)/i, "Круглая (R)"],
];

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

export function parseByRules(query: string): ParsedQuery | null {
  let text = " " + query.toLowerCase() + " ";
  const attrs: ParsedAttrFilter[] = [];
  const consumed: string[] = [];

  // --- Диаметр: «10 мм», «⌀8», «диаметр 12», диапазон «6-12 мм» ---
  // (мм не совпадает с \w из-за кириллицы — используем негативный просмотр)
  const MM = "(?:мм|mm)(?![а-яёa-z])";
  const range = text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*[-–—]\\s*(\\d+(?:[.,]\\d+)?)\\s*${MM}`, "i"));
  if (range) {
    const min = Number(range[1].replace(",", "."));
    const max = Number(range[2].replace(",", "."));
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      attrs.push({ code: "diameter", min, max });
      consumed.push(range[0]);
    }
  } else {
    const dia = text.match(new RegExp(`(?:[⌀φ]|диаметр[а-я]*|d\\s*[=:])?\\s*(\\d+(?:[.,]\\d+)?)\\s*${MM}`, "i"));
    if (dia) {
      const d = Number(dia[1].replace(",", "."));
      if (Number.isFinite(d) && d > 0 && d < 400) {
        attrs.push({ code: "diameter", min: d, max: d });
        consumed.push(dia[0]);
      }
    }
  }

  // --- Резьба: M8, M10×1.5, G1/2 ---
  const thread = text.match(/\b([mg])\s?(\d+(?:[.,]\d+)?|\d+\/\d+)(?:\s?[хx×]\s?(\d+(?:[.,]\d+)?))?\b/);
  if (thread) {
    const type = thread[1].toUpperCase();
    const size = thread[2].replace(",", ".");
    const nominal = type === "M" ? `M${size}` : `G${size}`;
    attrs.push({ code: "thread_nominal", values: [nominal] });
    if (thread[3]) attrs.push({ code: "pitch", min: Number(thread[3].replace(",", ".")), max: Number(thread[3].replace(",", ".")) });
    consumed.push(thread[0]);
  }

  // --- Число зубьев: «z4», «4 зуба» ---
  const flutes = text.match(/\bz\s?(\d)\b|(\d)\s*зуб/);
  if (flutes) {
    const z = Number(flutes[1] ?? flutes[2]);
    if (z > 0 && z < 13) {
      attrs.push({ code: "flutes", values: [String(z)] });
      consumed.push(flutes[0]);
    }
  }

  // --- Словари значений: в каждом словаре побеждает первое совпадение (специфичные — раньше) ---
  for (const [hints, code] of [
    [WORKPIECE_HINTS, "workpiece"],
    [MATERIAL_HINTS, "material"],
    [COATING_HINTS, "coating"],
    [SHAPE_HINTS, "shape"],
  ] as const) {
    for (const [re, value] of hints) {
      const m = text.match(re);
      if (m) {
        attrs.push({ code, values: [value] });
        if (m[0].length > 2) consumed.push(m[0]);
        break;
      }
    }
  }

  // --- Категория ---
  let categorySlug: string | undefined;
  for (const [re, slug] of CATEGORY_HINTS) {
    const m = text.match(re);
    if (m) {
      categorySlug = slug;
      if (m[0].length > 2) consumed.push(m[0]);
      break;
    }
  }

  // --- Остаток текста (для FTS): убираем слова, целиком захваченные распознанными фрагментами ---
  const frags = consumed.map((f) => f.toLowerCase().trim()).filter((f) => f.length > 2);
  const kept = query
    .split(/\s+/)
    .filter((t) => !frags.some((f) => t.toLowerCase().includes(f) || f.includes(t.toLowerCase())));
  let leftover = kept.join(" ").replace(/\s+/g, " ").trim();
  if (leftover.length < 3) leftover = "";

  if (!categorySlug && attrs.length === 0) return null;

  return { categorySlug, attrs, leftover: norm(leftover) === norm(query) ? query : leftover, via: "rules" };
}

export const ruleBasedParser: QueryParser = {
  name: "rules",
  async parse(query) {
    return parseByRules(query);
  },
};
