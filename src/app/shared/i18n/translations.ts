// Locale es un string libre (idiomas ILIMITADOS). Los diccionarios de UI cubren los principales;
// cualquier idioma sin diccionario hace fallback a inglés (ver store/locale.ts). El contenido de
// producto se traduce por separado (product_translation, cualquier idioma).
export type Locale = string

export const LOCALE_OPTIONS: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'zh', label: '中文',        flag: '🇨🇳' },
  // DROP-444: stubs de FR/DE/IT/NL — sólo claves esenciales traducidas, el
  // resto hace fallback a EN vía el store de locale. Para producción,
  // completar cada diccionario o conectarlo a un servicio i18n externo.
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'it', label: 'Italiano',   flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
]

/** La forma de un diccionario de interfaz: clave técnica -> texto ya traducido. */
export type Diccionario = Record<string, string>
