import { Injectable, Signal, computed, inject } from '@angular/core';
import { Locale, translations } from '@shared/i18n/translations';
import { PreferenciasService } from '../preferences/preferencias';

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
 */
@Injectable({ providedIn: 'root' })
export class TraduccionService {
  private readonly preferencias = inject(PreferenciasService);

  readonly idioma: Signal<Locale> = this.preferencias.idioma;

  /** El diccionario activo, recalculado solo al cambiar de idioma. */
  private readonly diccionario = computed<Record<string, string>>(
    () => translations[this.idioma()] ?? translations['en'],
  );

  /**
   * Traduce una clave. Se devuelve enlazada (`t = servicio.t`) sin perder el `this`, porque se usa mucho
   * dentro de plantillas y de funciones sueltas.
   */
  readonly t = (clave: string): string =>
    this.diccionario()[clave] ?? translations['en'][clave] ?? clave;

  /**
   * Traduce sustituyendo marcadores `{nombre}`. Los mensajes con cantidades o nombres propios se guardan
   * con marcador en los ocho diccionarios, para que cada idioma pueda colocarlo donde le corresponda.
   */
  readonly tCon = (clave: string, valores: Readonly<Record<string, string | number>>): string => {
    const plantilla = this.t(clave);
    return Object.entries(valores).reduce(
      (texto, [nombre, valor]) => texto.replaceAll(`{${nombre}}`, String(valor)),
      plantilla,
    );
  };

  cambiaIdioma(idioma: Locale): void {
    this.preferencias.cambiaIdioma(idioma);
  }
}
