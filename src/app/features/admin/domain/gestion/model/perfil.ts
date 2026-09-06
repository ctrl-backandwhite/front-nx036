/**
 * La cuenta de quien administra: sus datos, su segundo factor y sus sesiones abiertas.
 */

/** Una sesión abierta en un dispositivo. `actual` es la que está usando la pestaña de ahora mismo. */
export interface SesionAbierta {
  readonly id: string;
  readonly dispositivo: string;
  readonly ip?: string;
  readonly creadaEl: string;
  readonly vistaEl: string;
  readonly actual: boolean;
}

/** Lo que devuelve el alta del segundo factor: el secreto en base32 y la dirección `otpauth`. */
export interface AltaDeSegundoFactor {
  readonly secreto: string;
  readonly urlOtpauth: string;
}

/** Lo editable del perfil. El correo y el papel no se tocan desde aquí. */
export interface CambiosDePerfil {
  readonly nombreVisible?: string;
  readonly empresa?: string;
  readonly pais?: string;
}

/**
 * Nombres de país en los idiomas con diccionario propio.
 *
 * <p>Es una lista corta a propósito: son los países con presencia real. Un código que no esté cae al
 * inglés y, si tampoco, al propio código —nunca a un hueco.
 */
const PAISES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  en: { ES: 'Spain', US: 'United States', MX: 'Mexico', BR: 'Brazil', CN: 'China', GB: 'United Kingdom', DE: 'Germany', FR: 'France', IT: 'Italy', JP: 'Japan' },
  es: { ES: 'España', US: 'Estados Unidos', MX: 'México', BR: 'Brasil', CN: 'China', GB: 'Reino Unido', DE: 'Alemania', FR: 'Francia', IT: 'Italia', JP: 'Japón' },
  pt: { ES: 'Espanha', US: 'Estados Unidos', MX: 'México', BR: 'Brasil', CN: 'China', GB: 'Reino Unido', DE: 'Alemanha', FR: 'França', IT: 'Itália', JP: 'Japão' },
  zh: { ES: '西班牙', US: '美国', MX: '墨西哥', BR: '巴西', CN: '中国', GB: '英国', DE: '德国', FR: '法国', IT: '意大利', JP: '日本' },
};

const IDIOMAS: Readonly<Record<string, string>> = {
  en: 'English', es: 'Español', pt: 'Português', zh: '中文',
  fr: 'Français', de: 'Deutsch', it: 'Italiano', nl: 'Nederlands',
};

export function nombreDePais(codigo: string | undefined, idioma: string): string {
  if (!codigo) {
    return '—';
  }
  return PAISES[idioma]?.[codigo] ?? PAISES['en'][codigo] ?? codigo;
}

export function nombreDeIdioma(codigo: string | undefined): string {
  return codigo ? (IDIOMAS[codigo] ?? codigo) : '—';
}

/** Las iniciales para el hueco del avatar cuando no hay foto. */
export function iniciales(texto: string | undefined): string {
  if (!texto) {
    return '?';
  }
  const piezas = texto.split(/[\s@]/).filter(Boolean);
  return ((piezas[0]?.[0] ?? '') + (piezas[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** ¿Es un dispositivo de mano? Decide qué icono se pinta junto a la sesión. */
export function esMovil(dispositivo: string): boolean {
  return /iphone|ipad|android|ios|mobile/i.test(dispositivo);
}

/**
 * Hace cuánto fue, escrito como lo diría una persona.
 *
 * <p>Por debajo del minuto se dice «ahora» en vez de «hace 0 segundos», que se lee como un fallo.
 */
export function haceCuanto(fecha: Date, idioma: string, ahoraMs: number, textoAhora: string): string {
  const segundos = Math.round((ahoraMs - fecha.getTime()) / 1000);
  if (segundos < 60) {
    return textoAhora;
  }
  const relativo = new Intl.RelativeTimeFormat(idioma, { numeric: 'auto' });
  const absoluto = Math.abs(segundos);
  if (absoluto < 3600) {
    return relativo.format(-Math.round(segundos / 60), 'minute');
  }
  if (absoluto < 86400) {
    return relativo.format(-Math.round(segundos / 3600), 'hour');
  }
  if (absoluto < 86400 * 30) {
    return relativo.format(-Math.round(segundos / 86400), 'day');
  }
  if (absoluto < 86400 * 365) {
    return relativo.format(-Math.round(segundos / 2592000), 'month');
  }
  return relativo.format(-Math.round(segundos / 31536000), 'year');
}

/** Las dos contraseñas nuevas tienen que coincidir, y el mínimo lo fija la política del backend. */
export const LARGO_MINIMO_DE_CONTRASENA = 12;

export function cambioDeContrasenaValido(nueva: string, repetida: string): boolean {
  return nueva.length >= LARGO_MINIMO_DE_CONTRASENA && nueva === repetida;
}
