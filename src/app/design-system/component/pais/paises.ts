import { COUNTRIES } from '@shared/data/countries';

/** Emoji de bandera a partir del código ISO 3166-1 alfa-2: dos letras a dos indicadores regionales. */
export function banderaDePais(codigo?: string): string {
  if (!codigo || codigo.length !== 2) {
    return '';
  }
  return codigo.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Nombre del país (local más inglés). Si no está en el catálogo, se devuelve el propio código. */
export function nombreDePais(codigo?: string): string {
  if (!codigo) {
    return '';
  }
  return COUNTRIES.find((c) => c.code === codigo)?.name ?? codigo;
}
