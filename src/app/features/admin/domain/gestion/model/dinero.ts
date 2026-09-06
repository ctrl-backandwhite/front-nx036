/**
 * Importes: conversión entre divisas y presentación.
 *
 * <p>Todo esto son funciones PURAS. Quién es la divisa activa y de dónde salen las tasas es cosa de la
 * capa de aplicación; aquí solo está la aritmética y el formato, que es lo que se puede probar sin
 * montar nada.
 *
 * <p>REGLA DEL NEGOCIO: el panel no calcula precios de venta. Lo que se formatea aquí son importes que
 * YA vienen calculados por el backend —coste, saldo, comisión— y la columna «Precio» de los listados es
 * el COSTE, no lo que paga nadie.
 */

/** Una divisa del registro: `tasaVsUsd` son unidades de esa divisa por 1 USD (USD=1, EUR=0,92). */
export interface Divisa {
  readonly codigo: string;
  readonly nombre: string;
  readonly simbolo: string;
  readonly tasaVsUsd: number;
  readonly activa: boolean;
  readonly locale?: string;
  readonly banderaEmoji?: string;
  readonly paisCodigo?: string;
  readonly sincronizadaEl?: string;
}

/**
 * Idioma con el que formatear cada divisa cuando el registro no trae el suyo.
 *
 * <p>Sin esto, el euro salía a la anglosajona («EUR14.90») porque el respaldo era `en-US`. El separador
 * y la posición del símbolo son parte del precio: un importe mal puntuado se lee como otro importe.
 */
const LOCALE_POR_DIVISA: Readonly<Record<string, string>> = {
  USD: 'en-US', CAD: 'en-CA', MXN: 'es-MX', COP: 'es-CO', BRL: 'pt-BR',
  ARS: 'es-AR', CLP: 'es-CL', PEN: 'es-PE',
  EUR: 'es-ES', GBP: 'en-GB', JPY: 'ja-JP', CNY: 'zh-CN', HKD: 'zh-HK',
  SGD: 'en-SG', KRW: 'ko-KR', AUD: 'en-AU', INR: 'en-IN', CHF: 'de-CH',
  SEK: 'sv-SE', NOK: 'nb-NO', DKK: 'da-DK', PLN: 'pl-PL', TRY: 'tr-TR',
  ZAR: 'en-ZA', AED: 'ar-AE',
};

/** Las divisas sin céntimos. Poner dos decimales al yen multiplica el importe por cien a la vista. */
const SIN_DECIMALES = new Set(['JPY', 'KRW']);

export function localeDeDivisa(codigo: string): string {
  return LOCALE_POR_DIVISA[codigo] ?? 'en-US';
}

/**
 * Pasa un importe de una divisa a otra con las tasas del registro.
 *
 * <p>`tasaVsUsd` son unidades por dólar, igual que en el backend, así que el paso intermedio es siempre
 * el dólar: `importe / tasaOrigen * tasaDestino`. Si falta cualquiera de las dos tasas se devuelve el
 * importe sin tocar — mejor un número sin convertir que uno inventado.
 */
export function convierte(
  importe: number,
  desde: string | null | undefined,
  hasta: string,
  divisas: readonly Divisa[],
): number {
  if (!Number.isFinite(importe)) {
    return 0;
  }
  if (!desde || desde === hasta) {
    return importe;
  }
  const origen = divisas.find((d) => d.codigo === desde)?.tasaVsUsd ?? 1;
  const destino = divisas.find((d) => d.codigo === hasta)?.tasaVsUsd ?? 1;
  if (!origen || !destino) {
    return importe;
  }
  return (importe / origen) * destino;
}

/** El importe ya convertido, escrito en el idioma de la divisa de destino. */
export function formatea(importe: number, divisa: string, locale?: string): string {
  const idioma = locale ?? localeDeDivisa(divisa);
  const decimales = SIN_DECIMALES.has(divisa) ? 0 : 2;
  try {
    return new Intl.NumberFormat(idioma, {
      style: 'currency',
      currency: divisa,
      maximumFractionDigits: decimales,
    }).format(importe);
  } catch {
    // Un código de divisa que `Intl` no conoce hace que lance. Se pinta el número localizado con el
    // código detrás («14,90 XYZ»), que es legible, en vez de dejar el hueco vacío.
    const numero = new Intl.NumberFormat(idioma, {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(importe);
    return `${numero} ${divisa}`;
  }
}

/** Céntimos a unidades. El backend mueve dinero en enteros para no arrastrar errores de coma flotante. */
export function deCentimos(centimos: number | null | undefined): number {
  return (centimos ?? 0) / 100;
}

/** Y de vuelta, redondeando: medio céntimo no existe y `2.005 * 100` no da 200,5 sino 200,49999. */
export function aCentimos(unidades: string | number | null | undefined): number {
  const numero = typeof unidades === 'string' ? Number.parseFloat(unidades) : (unidades ?? 0);
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}
