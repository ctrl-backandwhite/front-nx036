import { Service, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import type { Diccionario, Locale } from '@shared/i18n/translations';
import en from '@shared/i18n/dictionary/en';
import es from '@shared/i18n/dictionary/es';
import { PreferenciasService } from '../preferences/preferencias';

/**
 * Los idiomas que viajan SIEMPRE en el paquete inicial.
 *
 * <p>El español porque es el idioma por defecto y el que se usa al prerenderizar: diferirlo obligaría a
 * esperar una descarga para pintar la primera pantalla del caso mayoritario. El inglés porque es el
 * respaldo de todos los demás —una clave que falte en cualquier idioma se busca aquí—, así que hace
 * falta antes de que el diccionario pedido llegue.
 */
const ESTATICOS: Readonly<Record<string, Diccionario>> = { en, es };

/**
 * Los demás idiomas, cada uno en su propio trozo.
 *
 * <p>Las rutas son literales a propósito: un `import()` con la ruta construida al vuelo el empaquetador
 * no lo puede analizar, y acabaría metiendo los seis diccionarios en el mismo trozo —o de vuelta en el
 * paquete inicial—, que es justo lo que se quiere evitar.
 */
const DIFERIDOS: Readonly<Record<string, () => Promise<{ default: Diccionario }>>> = {
  pt: () => import('@shared/i18n/dictionary/pt'),
  zh: () => import('@shared/i18n/dictionary/zh'),
  fr: () => import('@shared/i18n/dictionary/fr'),
  de: () => import('@shared/i18n/dictionary/de'),
  it: () => import('@shared/i18n/dictionary/it'),
  nl: () => import('@shared/i18n/dictionary/nl'),
};

/**
 * La cadena de respaldo: idioma activo, inglés, y si no, la clave.
 *
 * <p>Vive fuera de la clase para poder probarla SIN montar Angular. Los ocho diccionarios reales tienen
 * exactamente las mismas claves, así que a través del servicio no hay forma de provocar el caso «la
 * clave falta en este idioma pero está en inglés», que es justo el que hay que asegurar: es lo que
 * pasará el día que alguien añada un texto en inglés y las traducciones lleguen una semana después.
 *
 * <p>Devolver la CLAVE y no una cadena vacía es deliberado: un hueco en blanco pasa desapercibido en una
 * revisión, mientras que ver `cart.empty` escrito en la pantalla delata la traducción que falta.
 */
export function buscaTexto(diccionario: Diccionario, respaldo: Diccionario, clave: string): string {
  const texto: string | undefined = diccionario[clave];
  if (texto !== undefined) {
    return texto;
  }
  const alternativo: string | undefined = respaldo[clave];
  return alternativo ?? clave;
}

/** Sustituye los marcadores `{nombre}` de una plantilla ya traducida. */
export function sustituyeMarcadores(
  plantilla: string,
  valores: Readonly<Record<string, string | number>>,
): string {
  return Object.entries(valores).reduce(
    (texto, [nombre, valor]) => texto.replaceAll(`{${nombre}}`, String(valor)),
    plantilla,
  );
}

/**
 * Los textos de la interfaz en el idioma activo.
 *
 * <p>Es una función de traducción reactiva: `t()` se recalcula solo cuando cambia el idioma, porque lee
 * un signal. En una plantilla basta con `{{ t('cart.empty') }}` y al cambiar de idioma se repinta lo
 * justo, sin recargar ni volver a montar nada.
 *
 * <p>Cuando una clave no existe se devuelve la CLAVE misma, no una cadena vacía. Es deliberado: un hueco
 * en blanco pasa desapercibido en una revisión, mientras que ver `cart.empty` escrito en la pantalla
 * delata la traducción que falta. El respaldo intermedio es el inglés.
 *
 * <p>CARGA DIFERIDA. Solo el español y el inglés vienen en el paquete inicial; los otros seis se
 * descargan al elegirlos. La API sigue siendo SÍNCRONA —`t()` devuelve un `string`, no una promesa—
 * porque el diccionario no se espera: se guarda en un signal y, mientras no ha llegado, `t()` responde
 * con el inglés. Así nunca se ve un parpadeo de claves técnicas. Cuando el `import()` termina, escribir
 * el signal invalida el `computed` y Angular repinta solo lo que dependía de él; nadie tiene que
 * suscribirse ni avisar a nadie.
 */
@Service()
export class TraduccionService {
  private readonly preferencias = inject(PreferenciasService);

  readonly idioma: Signal<Locale> = this.preferencias.idioma;

  /**
   * Los diccionarios que ya están en memoria. Es un signal —y no un simple objeto— porque es justo lo
   * que convierte la llegada de una descarga en un repintado: sin él, el diccionario aparecería en
   * memoria y la pantalla seguiría con el respaldo hasta el siguiente cambio de idioma.
   */
  private readonly cargados = signal<Readonly<Record<string, Diccionario>>>(ESTATICOS);

  /** Idiomas cuya descarga ya está en marcha, para no pedir el mismo fichero dos veces. */
  private readonly enCurso = new Set<Locale>();

  /** El diccionario activo. Mientras el pedido no haya llegado, el respaldo: el inglés. */
  private readonly diccionario = computed<Diccionario>(() => {
    const activo: Diccionario | undefined = this.cargados()[this.idioma()];
    return activo ?? en;
  });

  constructor() {
    // El idioma cambia desde muchos sitios —el selector, la cookie al arrancar, el idioma del
    // navegador—, así que la descarga se dispara al VER el cambio y no al pedirlo: un solo punto,
    // imposible de olvidar en la próxima pantalla que llame a `cambiaIdioma`.
    effect(() => {
      const idioma = this.idioma();
      // Sin `untracked` el efecto dependería también de `cargados`, y se volvería a ejecutar cada vez
      // que llega un diccionario: trabajo inútil por cada idioma que se haya visitado.
      untracked(() => this.pideDiccionario(idioma));
    });
  }

  /**
   * Traduce una clave. Se devuelve enlazada (`t = servicio.t`) sin perder el `this`, porque se usa mucho
   * dentro de plantillas y de funciones sueltas.
   */
  readonly t = (clave: string): string => buscaTexto(this.diccionario(), en, clave);

  /**
   * Traduce sustituyendo marcadores `{nombre}`. Los mensajes con cantidades o nombres propios se guardan
   * con marcador en los ocho diccionarios, para que cada idioma pueda colocarlo donde le corresponda.
   */
  readonly tCon = (clave: string, valores: Readonly<Record<string, string | number>>): string =>
    sustituyeMarcadores(this.t(clave), valores);

  cambiaIdioma(idioma: Locale): void {
    this.preferencias.cambiaIdioma(idioma);
  }

  /**
   * Pide el diccionario de un idioma si hace falta y no se ha pedido ya.
   *
   * <p>No devuelve nada ni se espera: quien traduce no puede quedarse bloqueado. El resultado entra por
   * el signal, que es lo que hace que la pantalla se entere.
   */
  private pideDiccionario(idioma: Locale): void {
    if (untracked(this.cargados)[idioma] !== undefined || this.enCurso.has(idioma)) {
      return;
    }
    const carga = DIFERIDOS[idioma];
    if (carga === undefined) {
      // Un idioma sin diccionario propio (`pt-BR`, o cualquier código suelto) no es un error: se queda
      // con el inglés, que es lo que hacía la versión con los ocho diccionarios en memoria.
      return;
    }
    this.enCurso.add(idioma);
    carga()
      .then((modulo) => {
        this.cargados.update((previos) => ({ ...previos, [idioma]: modulo.default }));
      })
      .catch(() => {
        // Si la descarga falla —red caída, despliegue que renombró el trozo— se sigue viendo el inglés.
        // Se saca de la lista de pendientes para poder reintentarlo al volver a elegir ese idioma.
        this.enCurso.delete(idioma);
      });
  }
}
