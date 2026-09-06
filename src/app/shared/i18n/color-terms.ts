// DROP-403: diccionario CN → varios idiomas para nombres de variantes que vienen
// del feed 1688 sin traducir (color principalmente). El backend ya guarda valueZh
// y, cuando hay traducción manual, value. Cuando value sigue null (mayoría de
// productos seed) el PDP mostraba 驼色 / 墨绿 / 炭黑 al usuario hispanohablante.
// Este mapping es un fallback heurístico: cubre ~60 términos comunes en moda /
// electronics. Para términos no cubiertos seguimos mostrando el chino original.

type Translations = Record<'en'|'es'|'pt'|'zh'|'fr'|'de'|'it'|'nl', string>

const DICT: Record<string, Translations> = {
  '黑色':  { en: 'Black',     es: 'Negro',         pt: 'Preto',     zh: '黑色', fr: 'Noir',         de: 'Schwarz',    it: 'Nero',        nl: 'Zwart' },
  '炭黑':  { en: 'Charcoal',  es: 'Carbón',        pt: 'Carvão',    zh: '炭黑', fr: 'Anthracite',   de: 'Anthrazit',  it: 'Antracite',   nl: 'Antraciet' },
  '白色':  { en: 'White',     es: 'Blanco',        pt: 'Branco',    zh: '白色', fr: 'Blanc',        de: 'Weiß',       it: 'Bianco',      nl: 'Wit' },
  '米白':  { en: 'Off-white', es: 'Blanco hueso',  pt: 'Branco-osso', zh: '米白', fr: 'Blanc cassé', de: 'Cremeweiß',  it: 'Bianco panna', nl: 'Gebroken wit' },
  '灰色':  { en: 'Grey',      es: 'Gris',          pt: 'Cinza',     zh: '灰色', fr: 'Gris',         de: 'Grau',       it: 'Grigio',      nl: 'Grijs' },
  '银色':  { en: 'Silver',    es: 'Plata',         pt: 'Prata',     zh: '银色', fr: 'Argent',       de: 'Silber',     it: 'Argento',     nl: 'Zilver' },
  '金色':  { en: 'Gold',      es: 'Oro',           pt: 'Dourado',   zh: '金色', fr: 'Or',           de: 'Gold',       it: 'Oro',         nl: 'Goud' },
  '红色':  { en: 'Red',       es: 'Rojo',          pt: 'Vermelho',  zh: '红色', fr: 'Rouge',        de: 'Rot',        it: 'Rosso',       nl: 'Rood' },
  '酒红':  { en: 'Wine red',  es: 'Vino tinto',    pt: 'Vinho',     zh: '酒红', fr: 'Bordeaux',     de: 'Weinrot',    it: 'Bordeaux',    nl: 'Wijnrood' },
  '粉色':  { en: 'Pink',      es: 'Rosa',          pt: 'Rosa',      zh: '粉色', fr: 'Rose',         de: 'Rosa',       it: 'Rosa',        nl: 'Roze' },
  '蓝色':  { en: 'Blue',      es: 'Azul',          pt: 'Azul',      zh: '蓝色', fr: 'Bleu',         de: 'Blau',       it: 'Blu',         nl: 'Blauw' },
  '天蓝':  { en: 'Sky blue',  es: 'Azul cielo',    pt: 'Azul-celeste', zh: '天蓝', fr: 'Bleu ciel',  de: 'Himmelblau', it: 'Azzurro cielo', nl: 'Hemelsblauw' },
  '深蓝':  { en: 'Navy',      es: 'Azul marino',   pt: 'Azul-marinho', zh: '深蓝', fr: 'Bleu marine', de: 'Marineblau', it: 'Blu navy',  nl: 'Marineblauw' },
  '宝蓝':  { en: 'Royal blue', es: 'Azul real',    pt: 'Azul real', zh: '宝蓝', fr: 'Bleu roi',     de: 'Königsblau', it: 'Blu reale',   nl: 'Koningsblauw' },
  '绿色':  { en: 'Green',     es: 'Verde',         pt: 'Verde',     zh: '绿色', fr: 'Vert',         de: 'Grün',       it: 'Verde',       nl: 'Groen' },
  '墨绿':  { en: 'Dark green', es: 'Verde oscuro', pt: 'Verde-escuro', zh: '墨绿', fr: 'Vert foncé', de: 'Dunkelgrün', it: 'Verde scuro', nl: 'Donkergroen' },
  '军绿':  { en: 'Army green', es: 'Verde militar', pt: 'Verde-militar', zh: '军绿', fr: 'Vert kaki', de: 'Olivgrün',  it: 'Verde militare', nl: 'Legergroen' },
  '黄色':  { en: 'Yellow',    es: 'Amarillo',      pt: 'Amarelo',   zh: '黄色', fr: 'Jaune',        de: 'Gelb',       it: 'Giallo',      nl: 'Geel' },
  '橙色':  { en: 'Orange',    es: 'Naranja',       pt: 'Laranja',   zh: '橙色', fr: 'Orange',       de: 'Orange',     it: 'Arancione',   nl: 'Oranje' },
  '紫色':  { en: 'Purple',    es: 'Morado',        pt: 'Roxo',      zh: '紫色', fr: 'Violet',       de: 'Lila',       it: 'Viola',       nl: 'Paars' },
  '棕色':  { en: 'Brown',     es: 'Marrón',        pt: 'Marrom',    zh: '棕色', fr: 'Marron',       de: 'Braun',      it: 'Marrone',     nl: 'Bruin' },
  '驼色':  { en: 'Camel',     es: 'Camel',         pt: 'Camelo',    zh: '驼色', fr: 'Camel',        de: 'Camel',      it: 'Cammello',    nl: 'Camel' },
  '咖啡':  { en: 'Coffee',    es: 'Café',          pt: 'Café',      zh: '咖啡', fr: 'Café',         de: 'Kaffee',     it: 'Caffè',       nl: 'Koffie' },
  '米色':  { en: 'Beige',     es: 'Beige',         pt: 'Bege',      zh: '米色', fr: 'Beige',        de: 'Beige',      it: 'Beige',       nl: 'Beige' },
  '透明':  { en: 'Transparent', es: 'Transparente', pt: 'Transparente', zh: '透明', fr: 'Transparent', de: 'Transparent', it: 'Trasparente', nl: 'Transparant' },
  // Sizes
  '均码':  { en: 'One size',  es: 'Talla única',   pt: 'Tamanho único', zh: '均码', fr: 'Taille unique', de: 'Einheitsgröße', it: 'Taglia unica', nl: 'Eén maat' },
  '小号':  { en: 'Small',     es: 'Pequeño',       pt: 'Pequeno',   zh: '小号', fr: 'Petit',        de: 'Klein',      it: 'Piccolo',     nl: 'Klein' },
  '中号':  { en: 'Medium',    es: 'Mediano',       pt: 'Médio',     zh: '中号', fr: 'Moyen',        de: 'Mittel',     it: 'Medio',       nl: 'Middel' },
  '大号':  { en: 'Large',     es: 'Grande',        pt: 'Grande',    zh: '大号', fr: 'Grand',        de: 'Groß',       it: 'Grande',      nl: 'Groot' },
  '加大':  { en: 'XL',        es: 'Extra grande',  pt: 'Extra grande', zh: '加大', fr: 'Très grand', de: 'Extragroß',  it: 'Extra grande', nl: 'Extra groot' },
  '加大码': { en: 'XXL',      es: 'XXL',           pt: 'XXL',       zh: '加大码', fr: 'XXL',        de: 'XXL',        it: 'XXL',         nl: 'XXL' },
}

type DictLang = 'en'|'es'|'pt'|'zh'|'fr'|'de'|'it'|'nl'
const DICT_LANGS: DictLang[] = ['en', 'es', 'pt', 'zh', 'fr', 'de', 'it', 'nl']

/**
 * Translate a Chinese variant value (color/size) to the given locale (cualquier código; los que no
 * estén en el diccionario caen a inglés). Returns the original input if no mapping exists.
 */
export function translateVariantCN(zh: string | undefined | null, locale: string): string {
  if (!zh) return ''
  const l = (DICT_LANGS.includes(locale as DictLang) ? locale : 'en') as DictLang
  // exact match
  const exact = DICT[zh]
  if (exact) return exact[l] ?? zh
  // partial match: scan substrings (e.g. "驼色M" → "驼色" base)
  for (const key of Object.keys(DICT)) {
    if (zh.includes(key)) {
      const suffix = zh.replace(key, '').trim()
      const head = DICT[key][l] ?? key
      return suffix ? `${head} ${suffix}` : head
    }
  }
  return zh
}

// ── Color del swatch ─────────────────────────────────────────────────────────
// Mapea el NOMBRE de un color (en cualquier idioma del DICT o en chino, y aunque
// venga con sufijos tipo "855 negro [cuero]" / "Negro · algodón 180g") a un color
// CSS, para pintar un borde de 2 px con el color real de la variante.
// Orden IMPORTANTE: los compuestos específicos (navy, verde oscuro, blanco hueso…)
// van ANTES que los genéricos (azul, verde, blanco) para no quedarse en el genérico.
const COLOR_CSS: { terms: string[]; css: string }[] = [
  { css: '#7f1d2d', terms: ['酒红', 'vino tinto', 'vinho', 'bordeaux', 'borgona', 'weinrot', 'wine red', 'wijnrood'] },
  { css: '#1e3a8a', terms: ['深蓝', 'azul marino', 'azul oscuro', 'navy', 'azul-marinho', 'bleu marine', 'marineblau', 'blu navy', 'marineblauw'] },
  { css: '#1d4ed8', terms: ['宝蓝', 'azul real', 'royal blue', 'bleu roi', 'konigsblau', 'blu reale'] },
  { css: '#38bdf8', terms: ['天蓝', 'azul cielo', 'azul claro', 'sky blue', 'light blue', 'azul-celeste', 'bleu ciel', 'himmelblau', 'azzurro', 'celeste'] },
  { css: '#14532d', terms: ['墨绿', 'verde oscuro', 'dark green', 'verde-escuro', 'vert fonce', 'dunkelgrun', 'verde scuro'] },
  { css: '#4d5d2b', terms: ['军绿', 'verde militar', 'army green', 'olivgrun', 'oliva', 'olive'] },
  { css: '#a3a380', terms: ['卡其', 'caqui', 'khaki', 'kaki'] },
  { css: '#374151', terms: ['炭黑', 'charcoal', 'carbon', 'anthracite', 'anthrazit', 'antracite'] },
  { css: '#e7dcc3', terms: ['米白', 'blanco hueso', 'off-white', 'off white', 'branco-osso', 'cremeweiss', 'bianco panna'] },
  { css: '#c19a6b', terms: ['驼色', 'camel', 'camelo', 'cammello'] },
  { css: '#6f4e37', terms: ['咖啡', 'cafe', 'coffee', 'kaffee', 'caffe', 'koffie'] },
  { css: '#92400e', terms: ['棕色', 'marron', 'marrom', 'brown', 'braun', 'marrone', 'bruin'] },
  { css: '#d9c9a3', terms: ['米色', 'beige', 'bege'] },
  { css: '#111827', terms: ['黑色', 'negro', 'black', 'preto', 'noir', 'schwarz', 'nero', 'zwart'] },
  { css: '#e5e7eb', terms: ['白色', 'blanco', 'white', 'branco', 'blanc', 'weiss', 'bianco', 'wit'] },
  { css: '#9ca3af', terms: ['灰色', 'gris', 'grey', 'gray', 'cinza', 'grau', 'grigio', 'grijs'] },
  { css: '#c0c0c0', terms: ['银色', 'plata', 'plateado', 'silver', 'prata', 'argent', 'silber', 'argento', 'zilver'] },
  { css: '#d4af37', terms: ['金色', 'dorado', 'oro', 'gold', 'dourado', 'goud', 'oro rosa', 'rose gold'] },
  { css: '#dc2626', terms: ['红色', 'rojo', 'red', 'vermelho', 'rouge', 'rot', 'rosso', 'rood'] },
  { css: '#ec4899', terms: ['粉色', 'rosa', 'pink', 'rose', 'roze'] },
  { css: '#2563eb', terms: ['蓝色', 'azul', 'blue', 'bleu', 'blau', 'blu', 'blauw'] },
  { css: '#16a34a', terms: ['绿色', 'verde', 'green', 'vert', 'grun', 'groen'] },
  { css: '#eab308', terms: ['黄色', 'amarillo', 'yellow', 'amarelo', 'jaune', 'gelb', 'giallo', 'geel'] },
  { css: '#f97316', terms: ['橙色', 'naranja', 'orange', 'laranja', 'arancione', 'oranje'] },
  { css: '#7c3aed', terms: ['紫色', 'morado', 'purpura', 'purple', 'roxo', 'violet', 'lila', 'viola', 'paars'] },
]

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Devuelve un color CSS para el nombre de variante dado (o undefined si no se
 * reconoce ningún color). Sirve para pintar el borde del swatch con el color real.
 */
export function colorToCss(label: string | undefined | null): string | undefined {
  if (!label) return undefined
  const s = stripAccents(label.toLowerCase())
  for (const { terms, css } of COLOR_CSS) {
    for (const term of terms) {
      if (s.includes(stripAccents(term))) return css
    }
  }
  return undefined
}
