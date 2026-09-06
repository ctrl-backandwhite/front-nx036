import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { LOCALE_OPTIONS } from '@shared/i18n/translations';

/**
 * Idioma, moneda y tema: lo que hay que saber de quien mira para pintarle la página en su idioma y con
 * sus precios.
 *
 * <p>Viajan en COOKIE y no en el almacenamiento del navegador. El almacenamiento solo existe en el
 * navegador, así que al PRERENDERIZAR no se puede leer y el HTML saldría siempre en español y a dólares.
 * La cookie, en cambio, llega con la petición, de modo que —el día que estas páginas se sirvan
 * personalizadas— los dos lados parten del mismo valor. Hoy, además, es lo que evita el parpadeo: la
 * preferencia se aplica antes de que la aplicación arranque del todo.
 *
 * <p>SEGURIDAD. Una cookie la escribe el cliente y puede llevar cualquier cosa, así que nada de esto se
 * usa tal cual:
 * <ul>
 *   <li>Todo valor se comprueba y, si no casa, se sustituye por el de por defecto. Nunca se interpola en
 *       el HTML lo que venga escrito en la cookie.
 *   <li>Solo decide PRESENTACIÓN: no autentica, no da permisos y no interviene en el precio. El margen lo
 *       fija el país de registro, que el backend saca de la cuenta y no de aquí. Quien manipule su cookie
 *       consigue, como mucho, ver la web en otro idioma.
 *   <li>No lleva `HttpOnly` porque el propio navegador tiene que poder cambiarla al pulsar el selector; por
 *       eso mismo no guarda nada sensible. Va con `SameSite=Lax`, que impide que un sitio ajeno la imponga.
 * </ul>
 */
export const COOKIE_IDIOMA = 'nx036-locale';
export const COOKIE_MONEDA = 'nx036-currency';
export const COOKIE_TEMA = 'nx036-theme';

export const IDIOMA_POR_DEFECTO = 'es';
export const MONEDA_POR_DEFECTO = 'USD';
export const TEMA_POR_DEFECTO = 'nx036-pastel';

/**
 * Los idiomas con diccionario de interfaz. NO es una lista de lo permitido: es la de los que se saben
 * pintar, y sirve para elegir entre los que pide el navegador.
 *
 * <p>La aplicación acepta CUALQUIER código de idioma a propósito —el contenido de producto se traduce
 * aparte y crece por su cuenta—; lo que no tenga diccionario cae al inglés en los textos de la interfaz.
 */
const IDIOMAS_CON_DICCIONARIO = new Set(LOCALE_OPTIONS.map((o) => o.code));

/**
 * La FORMA de un código de idioma: dos o tres letras, con región opcional. Se comprueba esto en vez de la
 * pertenencia a una lista, y basta para lo que hay que impedir —que la cookie meta texto arbitrario donde
 * después va el atributo `lang` del documento: unas comillas o un `<` no pasan de aquí.
 */
const IDIOMA_VALIDO = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

/**
 * Los temas, tal como los espera `data-theme`. Se aceptan también los nombres del esquema anterior
 * —'corporate' y 'business'— porque hay gente con ese valor guardado de antes.
 */
const TEMAS = new Set(['nx036-pastel', 'nx036-pastel-dark', 'corporate', 'business']);

/** Un código de moneda ISO 4217: exactamente tres letras. */
const MONEDA_VALIDA = /^[A-Z]{3}$/;

export function idiomaValido(valor: string | undefined | null): string {
  return valor && IDIOMA_VALIDO.test(valor) ? valor : IDIOMA_POR_DEFECTO;
}

export function monedaValida(valor: string | undefined | null): string {
  // Se comprueba la FORMA y no una lista fija: las monedas se administran desde el panel y una lista
  // escrita aquí quedaría desfasada al añadir la siguiente.
  return valor && MONEDA_VALIDA.test(valor) ? valor : MONEDA_POR_DEFECTO;
}

export function temaValido(valor: string | undefined | null): string {
  return valor && TEMAS.has(valor) ? valor : TEMA_POR_DEFECTO;
}

/**
 * El primer idioma pedido por el navegador que tenga diccionario.
 *
 * <p>La lista viene ordenada por preferencia, así que se recorre en orden. Se compara solo la parte del
 * idioma: quien pide `fr-CH` entiende `fr`. Hay un tope de trozos para que una lista absurdamente larga
 * no dé trabajo gratis.
 */
export function idiomaDelNavegador(idiomasPedidos: readonly string[]): string {
  for (const trozo of idiomasPedidos.slice(0, 20)) {
    const codigo = trozo.split(';')[0].trim().split('-')[0].toLowerCase();
    if (IDIOMAS_CON_DICCIONARIO.has(codigo)) {
      return codigo;
    }
  }
  return IDIOMA_POR_DEFECTO;
}

/** Convierte una cabecera `Cookie` en pares. No interpreta nada: de eso se encargan las validaciones. */
export function parseaCookies(cabecera: string | null | undefined): Record<string, string> {
  const salida: Record<string, string> = {};
  if (!cabecera) {
    return salida;
  }
  for (const trozo of cabecera.split(';')) {
    const igual = trozo.indexOf('=');
    if (igual < 0) {
      continue;
    }
    const nombre = trozo.slice(0, igual).trim();
    if (!nombre) {
      continue;
    }
    try {
      salida[nombre] = decodeURIComponent(trozo.slice(igual + 1).trim());
    } catch {
      // Un porcentaje suelto hace que `decodeURIComponent` lance. Se ignora esa cookie y se usará el
      // valor por defecto: una preferencia mal escrita no puede tumbar la página.
    }
  }
  return salida;
}

export interface Preferencias {
  readonly idioma: string;
  readonly moneda: string;
  readonly tema: string;
}

/**
 * Las preferencias activas, como signals.
 *
 * <p>Es el único sitio que lee y escribe estas tres cookies. Todo lo demás —el selector de idioma, la
 * cabecera `X-Currency` del cliente HTTP, el atributo `data-theme` del documento— consulta AQUÍ. Tener
 * dos lecturas distintas del mismo dato fue justo lo que provocó, en el front de React, que la página se
 * pintara en un idioma y los precios llegaran en la moneda de otro.
 */
@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  private readonly documento = inject(DOCUMENT);
  private readonly enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _idioma = signal(this.leeInicial(COOKIE_IDIOMA, idiomaValido, () => this.idiomaSugerido()));
  private readonly _moneda = signal(this.leeInicial(COOKIE_MONEDA, monedaValida, () => MONEDA_POR_DEFECTO));
  /**
   * El tema ELEGIDO, o `null` si nadie ha elegido.
   *
   * <p>La diferencia entre «no ha elegido» y «ha elegido el claro» es justo lo que hacía falta. Al
   * arrancar se ponía siempre `data-theme="nx036-pastel"`, y ese atributo GANA sobre la preferencia del
   * sistema: quien tiene el equipo en modo oscuro veía la web en claro y no había forma de que saliera
   * oscura sola. Sin atributo, daisyUI elige por `prefers-color-scheme`, que es lo que hace el front
   * anterior.
   */
  private readonly _tema = signal<string | null>(
    this.leeCookieInicial(COOKIE_TEMA, temaValido),
  );

  readonly idioma = this._idioma.asReadonly();
  readonly moneda = this._moneda.asReadonly();
  readonly tema = this._tema.asReadonly();

  /** El tema que de verdad se está pintando, para quien necesite el nombre y no el hecho de la elección. */
  readonly temaEfectivo = computed(() => this._tema() ?? TEMA_POR_DEFECTO);

  readonly todas = computed<Preferencias>(() => ({
    idioma: this._idioma(),
    moneda: this._moneda(),
    tema: this.temaEfectivo(),
  }));

  cambiaIdioma(valor: string): void {
    const limpio = idiomaValido(valor);
    this.guarda(COOKIE_IDIOMA, limpio);
    this._idioma.set(limpio);
    this.documento.documentElement.lang = limpio;
  }

  cambiaMoneda(valor: string): void {
    const limpio = monedaValida(valor);
    this.guarda(COOKIE_MONEDA, limpio);
    this._moneda.set(limpio);
  }

  cambiaTema(valor: string): void {
    const limpio = temaValido(valor);
    this.guarda(COOKIE_TEMA, limpio);
    this._tema.set(limpio);
    this.documento.documentElement.setAttribute('data-theme', limpio);
  }

  /** El valor de la cookie ya comprobado, o `null` si no la hay. No inventa un valor por defecto. */
  private leeCookieInicial(cookie: string, valida: (v: string | null) => string): string | null {
    const guardado = this.leeCookie(cookie);
    return guardado ? valida(guardado) : null;
  }

  private leeInicial(cookie: string, valida: (v: string | null) => string, sugerido: () => string): string {
    const guardado = this.leeCookie(cookie);
    return guardado ? valida(guardado) : sugerido();
  }

  private idiomaSugerido(): string {
    if (!this.enNavegador) {
      return IDIOMA_POR_DEFECTO;
    }
    try {
      return idiomaDelNavegador(navigator.languages ?? [navigator.language]);
    } catch {
      return IDIOMA_POR_DEFECTO;
    }
  }

  private leeCookie(nombre: string): string | null {
    if (!this.enNavegador) {
      return null;
    }
    return parseaCookies(this.documento.cookie)[nombre] ?? null;
  }

  /**
   * Un año de vigencia: es una preferencia, no una sesión. `Secure` se añade solo bajo HTTPS — en el
   * desarrollo local, que va por HTTP, esa marca haría que el navegador descartara la cookie sin avisar.
   */
  private guarda(nombre: string, valor: string): void {
    if (!this.enNavegador) {
      return;
    }
    const seguro = this.documento.location.protocol === 'https:' ? '; Secure' : '';
    this.documento.cookie =
      `${nombre}=${encodeURIComponent(valor)}; Path=/; Max-Age=31536000; SameSite=Lax${seguro}`;
  }
}
