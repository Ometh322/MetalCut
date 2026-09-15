/**
 * Номенклатура металлорежущего инструмента: дерево категорий + схемы атрибутов.
 *
 * Единый источник истины для:
 *  - seed БД и админки (категории, Category.attributeSchema)
 *  - формы карточки товара селлера (генерируется из схемы)
 *  - фасетных фильтров каталога (DNS-подобная левая панель)
 *  - цели AI-разбора запроса (LLM возвращает коды атрибутов)
 *  - маппинга колонок CSV/Excel при импорте
 *
 * Спроектировано по отраслевой номенклатуре (ГОСТ/ISO); подлежит корректировке
 * после получения реальных прайсов селлеров.
 */

export type AttributeType = "enum" | "number" | "bool" | "string";

/** Как атрибут показывается в панели фильтров каталога */
export type FilterKind = "checkbox" | "range" | "none";

export interface AttributeDef {
  /** Ключ в Product.attributes (JSONB) */
  code: string;
  /** Отображаемое название */
  label: string;
  type: AttributeType;
  /** Единица измерения (мм, шт., ...) */
  unit?: string;
  required?: boolean;
  /** Допустимые значения для enum; для number — дискретные значения (тогда чекбоксы вместо диапазона) */
  values?: (string | number)[];
  /** Границы для number-инпутов */
  min?: number;
  max?: number;
  step?: number;
  filter: FilterKind;
  /** Показывать в строке списка товаров, чипсах и расчёте «похожих» */
  isKey?: boolean;
  /** Не для ручного ввода селлером (вычисляется/подтягивается) */
  readOnly?: boolean;
}

export interface CategoryNode {
  slug: string;
  name: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Схема задётся на листовых категориях */
  attributes?: AttributeDef[];
  children?: CategoryNode[];
}

// ---------------------------------------------------------------------------
// Общие словари значений
// ---------------------------------------------------------------------------

const MATERIAL: AttributeDef = {
  code: "material",
  label: "Материал режущей части",
  type: "enum",
  values: ["HSS", "HSS-E", "HSS-Co", "Твёрдый сплав"],
  filter: "checkbox",
  isKey: true,
  required: true,
};

const COATING: AttributeDef = {
  code: "coating",
  label: "Покрытие",
  type: "enum",
  values: ["Без покрытия", "TiN", "TiCN", "TiAlN", "AlTiN", "AlCrN", "CrN", "ZrN", "DLC"],
  filter: "checkbox",
  isKey: true,
};

const WORKPIECE: AttributeDef = {
  code: "workpiece",
  label: "Обрабатываемый материал",
  type: "enum",
  values: [
    "Универсальный",
    "Сталь",
    "Нержавеющая сталь",
    "Чугун",
    "Алюминий",
    "Цветные сплавы",
    "Титан",
    "Закалённая сталь",
    "Жаропрочные сплавы",
  ],
  filter: "checkbox",
  isKey: true,
};

const SHANK_MILL: AttributeDef = {
  code: "shank",
  label: "Тип хвостовика",
  type: "enum",
  values: ["Цилиндрический", "Weldon", "Whistle Notch", "Конус Морзе"],
  filter: "checkbox",
  isKey: true,
};

const SHANK_DRILL: AttributeDef = {
  code: "shank",
  label: "Тип хвостовика",
  type: "enum",
  values: ["Цилиндрический", "Шестигранный", "Конус Морзе", "SDS-plus", "Резьбовой"],
  filter: "checkbox",
  isKey: true,
};

const SHANK_LATHE: AttributeDef = {
  code: "shank",
  label: "Хвостовик",
  type: "enum",
  values: ["Цилиндрический", "Конус Морзе"],
  filter: "checkbox",
  isKey: true,
};

const THREAD_STANDARD: AttributeDef = {
  code: "thread_standard",
  label: "Тип резьбы",
  type: "enum",
  values: ["Метрическая ISO (M)", "Дюймовая UNC", "Дюймовая UNF", "Трубная цилиндрическая (G)"],
  filter: "checkbox",
  isKey: true,
  required: true,
};

const THREAD_NOMINAL: AttributeDef = {
  code: "thread_nominal",
  label: "Номинальный диаметр резьбы",
  type: "enum",
  values: [
    "M3", "M4", "M5", "M6", "M8", "M10", "M12", "M14", "M16", "M18", "M20", "M22",
    "M24", "M27", "M30", "M36", "M42", '1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '1"',
    "G1/8", "G1/4", "G3/8", "G1/2", "G3/4", "G1",
  ],
  filter: "checkbox",
  isKey: true,
  required: true,
};

const diameter = (min: number, max: number, step: number): AttributeDef => ({
  code: "diameter",
  label: "Диаметр",
  type: "number",
  unit: "мм",
  min,
  max,
  step,
  filter: "range",
  isKey: true,
  required: true,
});

const gost = (): AttributeDef => ({
  code: "gost",
  label: "Стандарт",
  type: "string",
  filter: "none",
});

// ---------------------------------------------------------------------------
// Дерево категорий
// ---------------------------------------------------------------------------

export const NOMENCLATURE: CategoryNode[] = [
  {
    slug: "milling",
    name: "Фрезы",
    children: [
      {
        slug: "end-mills",
        name: "Фрезы концевые",
        attributes: [
          diameter(0.5, 25, 0.5),
          {
            code: "tip",
            label: "Форма рабочей части",
            type: "enum",
            values: ["Плоская (торцевая)", "Шаровая", "Радиусная (галтельная)"],
            filter: "checkbox",
            isKey: true,
          },
          {
            code: "flutes",
            label: "Число зубьев",
            type: "number",
            values: [1, 2, 3, 4, 6],
            filter: "checkbox",
            isKey: true,
          },
          MATERIAL,
          COATING,
          SHANK_MILL,
          {
            code: "flute_length",
            label: "Длина режущей части",
            type: "number",
            unit: "мм",
            filter: "range",
          },
          {
            code: "overall_length",
            label: "Общая длина",
            type: "number",
            unit: "мм",
            filter: "none",
          },
          WORKPIECE,
          { ...gost(), values: undefined },
        ],
      },
      {
        slug: "keyway-mills",
        name: "Фрезы шпоночные",
        attributes: [
          diameter(2, 40, 0.5),
          MATERIAL,
          COATING,
          { ...SHANK_MILL, values: ["Цилиндрический", "Weldon", "Конус Морзе"] },
          WORKPIECE,
          gost(),
        ],
      },
      {
        slug: "face-mills",
        name: "Фрезы торцевые",
        attributes: [
          diameter(40, 315, 5),
          {
            code: "construction",
            label: "Конструкция",
            type: "enum",
            values: ["Монолитная", "Под сменные пластины"],
            filter: "checkbox",
            isKey: true,
            required: true,
          },
          {
            code: "teeth",
            label: "Число зубьев",
            type: "number",
            values: [3, 4, 5, 6, 8, 10, 12],
            filter: "checkbox",
          },
          {
            code: "mounting",
            label: "Крепление",
            type: "enum",
            values: ["Цилиндрический хвостовик", "Конус 7:24 (BT/SK/CAT)", "Конус Морзе", "Центровочное отверстие"],
            filter: "checkbox",
            isKey: true,
          },
          WORKPIECE,
          gost(),
        ],
      },
      {
        slug: "disc-mills",
        name: "Фрезы дисковые",
        attributes: [
          diameter(50, 315, 5),
          {
            code: "disc_kind",
            label: "Тип дисковой фрезы",
            type: "enum",
            values: ["Отрезная (пильная)", "Прорезная", "Трёхсторонняя"],
            filter: "checkbox",
            isKey: true,
          },
          {
            code: "width",
            label: "Толщина диска",
            type: "number",
            unit: "мм",
            min: 1,
            max: 20,
            step: 0.5,
            filter: "range",
            isKey: true,
          },
          {
            code: "bore",
            label: "Посадочное отверстие",
            type: "number",
            unit: "мм",
            values: [13, 16, 22, 27, 32, 40],
            filter: "checkbox",
            isKey: true,
          },
          MATERIAL,
          WORKPIECE,
          gost(),
        ],
      },
    ],
  },
  {
    slug: "drilling",
    name: "Свёрла и осевой инструмент",
    children: [
      {
        slug: "twist-drills",
        name: "Свёрла спиральные",
        attributes: [
          diameter(0.3, 32, 0.1),
          {
            code: "length_series",
            label: "Серия длины",
            type: "enum",
            values: ["Короткая (сер. 1)", "Средняя (сер. 2)", "Длинная (сер. 3)"],
            filter: "checkbox",
            isKey: true,
          },
          MATERIAL,
          COATING,
          SHANK_DRILL,
          {
            code: "point_angle",
            label: "Угол при вершине",
            type: "number",
            unit: "°",
            values: [118, 135, 140],
            filter: "checkbox",
          },
          {
            code: "overall_length",
            label: "Общая длина",
            type: "number",
            unit: "мм",
            filter: "none",
          },
          {
            code: "working_length",
            label: "Рабочая длина",
            type: "number",
            unit: "мм",
            filter: "none",
          },
          WORKPIECE,
          gost(),
        ],
      },
      {
        slug: "step-drills",
        name: "Свёрла ступенчатые",
        attributes: [
          diameter(4, 40, 1),
          {
            code: "step_count",
            label: "Число ступеней",
            type: "number",
            values: [3, 5, 6, 7, 9],
            filter: "checkbox",
            isKey: true,
          },
          MATERIAL,
          COATING,
          { ...SHANK_DRILL, values: ["Цилиндрический", "Шестигранный"] },
          WORKPIECE,
          gost(),
        ],
      },
      {
        slug: "center-drills",
        name: "Свёрла центровочные",
        attributes: [
          diameter(0.5, 6, 0.5),
          {
            code: "center_angle",
            label: "Угол центровки",
            type: "number",
            unit: "°",
            values: [60, 90, 120],
            filter: "checkbox",
            isKey: true,
          },
          MATERIAL,
          COATING,
          SHANK_LATHE,
          gost(),
        ],
      },
      {
        slug: "core-drills",
        name: "Кольцевые свёрла (коронки)",
        attributes: [
          diameter(12, 150, 1),
          {
            code: "max_depth",
            label: "Макс. глубина сверления",
            type: "number",
            unit: "мм",
            values: [30, 50, 55, 75, 100],
            filter: "checkbox",
            isKey: true,
          },
          { ...MATERIAL, values: ["HSS-Co", "Твёрдый сплав"] },
          {
            code: "shank",
            label: "Тип хвостовика",
            type: "enum",
            values: ["Weldon", "Резьбовой", "Конус Морзе"],
            filter: "checkbox",
            isKey: true,
          },
          WORKPIECE,
        ],
      },
      {
        slug: "countersinks",
        name: "Зенковки и зенкеры",
        attributes: [
          diameter(6, 60, 0.5),
          {
            code: "kind",
            label: "Вид инструмента",
            type: "enum",
            values: ["Зенковка", "Зенкер"],
            filter: "checkbox",
            isKey: true,
          },
          {
            code: "countersink_angle",
            label: "Угол зенковки",
            type: "number",
            unit: "°",
            values: [60, 90, 120],
            filter: "checkbox",
          },
          MATERIAL,
          COATING,
          SHANK_LATHE,
          WORKPIECE,
          gost(),
        ],
      },
      {
        slug: "reamers",
        name: "Развёртки",
        attributes: [
          diameter(3, 50, 0.1),
          {
            code: "reamer_kind",
            label: "Тип развёртки",
            type: "enum",
            values: ["Ручная", "Машинная"],
            filter: "checkbox",
            isKey: true,
          },
          {
            code: "shank",
            label: "Хвостовик",
            type: "enum",
            values: ["Цилиндрический", "Конус Морзе"],
            filter: "checkbox",
            isKey: true,
          },
          MATERIAL,
          COATING,
          WORKPIECE,
          gost(),
        ],
      },
    ],
  },
  {
    slug: "threading",
    name: "Резьбонарезной инструмент",
    children: [
      {
        slug: "taps",
        name: "Метчики",
        attributes: [
          THREAD_STANDARD,
          THREAD_NOMINAL,
          {
            code: "pitch",
            label: "Шаг резьбы",
            type: "number",
            unit: "мм",
            filter: "none",
          },
          {
            code: "tap_kind",
            label: "Тип метчика",
            type: "enum",
            values: ["Машинный", "Машинно-ручной", "Гаечный"],
            filter: "checkbox",
            isKey: true,
          },
          {
            code: "tap_set",
            label: "Комплектность",
            type: "enum",
            values: ["Одиночный", "Комплект 2 шт. (черн./чист.)", "Комплект 3 шт."],
            filter: "checkbox",
            isKey: true,
          },
          {
            code: "flute_kind",
            label: "Исполнение канавок",
            type: "enum",
            values: ["Прямые канавки", "Спиральные канавки"],
            filter: "checkbox",
          },
          {
            code: "thread_direction",
            label: "Направление резьбы",
            type: "enum",
            values: ["Правая", "Левая"],
            filter: "checkbox",
          },
          MATERIAL,
          COATING,
          WORKPIECE,
          gost(),
        ],
      },
      {
        slug: "dies",
        name: "Плашки круглые",
        attributes: [
          THREAD_STANDARD,
          THREAD_NOMINAL,
          {
            code: "pitch",
            label: "Шаг резьбы",
            type: "number",
            unit: "мм",
            filter: "none",
          },
          MATERIAL,
          COATING,
          WORKPIECE,
          gost(),
        ],
      },
      {
        slug: "thread-mills",
        name: "Фрезы резьбовые",
        attributes: [
          diameter(3, 25, 0.5),
          THREAD_STANDARD,
          {
            code: "pitch",
            label: "Шаг резьбы",
            type: "number",
            unit: "мм",
            filter: "none",
          },
          MATERIAL,
          COATING,
          SHANK_MILL,
          WORKPIECE,
        ],
      },
    ],
  },
  {
    slug: "turning",
    name: "Токарный инструмент",
    children: [
      {
        slug: "turning-tools",
        name: "Резцы токарные",
        attributes: [
          {
            code: "tool_kind",
            label: "Тип резца",
            type: "enum",
            values: [
              "Проходной отогнутый",
              "Проходной упорный",
              "Подрезной",
              "Отрезной",
              "Резьбовой",
              "Расточной",
              "Борштанга",
            ],
            filter: "checkbox",
            isKey: true,
            required: true,
          },
          {
            code: "construction",
            label: "Конструкция",
            type: "enum",
            values: ["Напайной", "Под сменные пластины"],
            filter: "checkbox",
            isKey: true,
          },
          {
            code: "holder_section",
            label: "Сечение державки",
            type: "enum",
            values: [
              "10×10", "12×12", "16×10", "16×16", "20×12", "20×20",
              "25×16", "25×25", "32×20", "32×32", "40×25", "40×40",
            ],
            filter: "checkbox",
            isKey: true,
          },
          {
            code: "carbide_grade",
            label: "Марка сплава (напайка/пластина)",
            type: "enum",
            values: ["Т5К10", "Т15К6", "Т30К4", "ВК8", "ВК6"],
            filter: "checkbox",
          },
          WORKPIECE,
          gost(),
        ],
      },
      {
        slug: "inserts",
        name: "Сменные пластины",
        attributes: [
          {
            code: "shape",
            label: "Форма пластины",
            type: "enum",
            values: [
              "Ромб 35° (V)",
              "Ромб 55° (D)",
              "Ромб 80° (C/W)",
              "Треугольник (T)",
              "Квадрат (S)",
              "Круглая (R)",
            ],
            filter: "checkbox",
            isKey: true,
            required: true,
          },
          {
            code: "nose_radius",
            label: "Радиус при вершине",
            type: "number",
            unit: "мм",
            values: [0.2, 0.4, 0.8, 1.2, 1.6, 2.4],
            filter: "checkbox",
            isKey: true,
          },
          { ...MATERIAL, values: ["Твёрдый сплав", "Минералокерамика", "CBN", "PCD"] },
          COATING,
          {
            code: "hole",
            label: "Крепёжное отверстие",
            type: "enum",
            values: ["С отверстием", "Без отверстия"],
            filter: "checkbox",
          },
          {
            code: "iso_designation",
            label: "Обозначение ISO",
            type: "string",
            filter: "none",
          },
          WORKPIECE,
        ],
      },
    ],
  },
  {
    slug: "tooling",
    name: "Оснастка и держатели",
    children: [
      {
        slug: "er-collets",
        name: "Цанги ER",
        attributes: [
          {
            code: "er_size",
            label: "Типоразмер",
            type: "enum",
            values: ["ER11", "ER16", "ER20", "ER25", "ER32", "ER40"],
            filter: "checkbox",
            isKey: true,
            required: true,
          },
          {
            code: "clamp_range",
            label: "Диапазон зажима",
            type: "string",
            filter: "none",
            isKey: true,
          },
          {
            code: "accuracy",
            label: "Точность",
            type: "enum",
            values: ["Стандартная", "Высокоточная (AA)"],
            filter: "checkbox",
          },
        ],
      },
      {
        slug: "mill-holders",
        name: "Державки для фрез",
        attributes: [
          {
            code: "holder_kind",
            label: "Тип державки",
            type: "enum",
            values: ["Цанговая (ER)", "Weldon", "Гидравлическая", "Термозажимная", "Переходная (конус Морзе)"],
            filter: "checkbox",
            isKey: true,
            required: true,
          },
          {
            code: "taper",
            label: "Конус шпинделя",
            type: "enum",
            values: ["BT30", "BT40", "BT50", "SK40", "CAT40", "HSK32A", "HSK63A", "ISO30"],
            filter: "checkbox",
            isKey: true,
          },
          {
            code: "tool_dia_range",
            label: "Диаметр зажимаемого инструмента",
            type: "string",
            filter: "none",
            isKey: true,
          },
          {
            code: "projection",
            label: "Вылет",
            type: "number",
            unit: "мм",
            filter: "none",
          },
        ],
      },
      {
        slug: "drill-chucks",
        name: "Патроны сверлильные",
        attributes: [
          {
            code: "chuck_kind",
            label: "Тип патрона",
            type: "enum",
            values: ["Ключевой", "Быстрозажимной", "Цанговый"],
            filter: "checkbox",
            isKey: true,
            required: true,
          },
          {
            code: "clamp_range",
            label: "Диапазон зажима",
            type: "string",
            filter: "none",
            isKey: true,
          },
          {
            code: "taper",
            label: "Конус",
            type: "enum",
            values: ["Морзе MT1", "Морзе MT2", "Морзе MT3", "B16", "B18", "B22"],
            filter: "checkbox",
            isKey: true,
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Хелперы
// ---------------------------------------------------------------------------

/** Плоский список листовых категорий (со схемами) */
export function leafCategories(): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      if (n.children?.length) walk(n.children);
      else out.push(n);
    }
  };
  walk(NOMENCLATURE);
  return out;
}

/** Поиск категории по slug (включая нелистовые узлы) */
export function findCategory(slug: string): CategoryNode | undefined {
  const walk = (nodes: CategoryNode[]): CategoryNode | undefined => {
    for (const n of nodes) {
      if (n.slug === slug) return n;
      const found = n.children ? walk(n.children) : undefined;
      if (found) return found;
    }
    return undefined;
  };
  return walk(NOMENCLATURE);
}
