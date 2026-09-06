import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Dónde se está ejecutando el código: en el navegador de quien mira, o en Node al construir.
 *
 * <p>Hace falta porque las páginas públicas se PRERENDERIZAN: el mismo código corre una vez al
 * construir, para dejar el HTML escrito. Allí no hay `window`, ni `document`, ni almacenamiento, ni
 * cookies. Tocar cualquiera de esos sin preguntar rompe la compilación entera, no una pantalla.
 *
 * <p>Es un SERVICIO y no una función suelta, y la diferencia importa. La versión anterior era una
 * función que llamaba a `inject()` por dentro, así que solo valía dentro de un constructor o de la
 * inicialización de un campo; llamarla desde un `effect`, desde una promesa o desde un manejador de
 * evento fallaba con `NG0203`. Y fallaba EN EL PRERENDERIZADO, es decir, al construir y no al
 * desarrollar: el fallo aparecía lejos de quien lo escribió. Como servicio se inyecta una vez, se
 * guarda y se consulta desde donde haga falta.
 */
@Injectable({ providedIn: 'root' })
export class Plataforma {
  /** Cierto solo en el navegador. Se resuelve al crear el servicio, en contexto de inyección. */
  readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly documento = inject(DOCUMENT);

  /** El documento, o `null` mientras se prerenderiza. Evita tocar el `document` global. */
  get documentoSiLoHay(): Document | null {
    return this.esNavegador ? this.documento : null;
  }

  /**
   * La ventana, o `null` mientras se prerenderiza.
   *
   * <p>Se saca del documento y no del `window` global para que en las pruebas baste con sustituir el
   * documento, sin tener que tocar variables globales que sobreviven de un caso al siguiente.
   */
  get ventanaSiLaHay(): (Window & typeof globalThis) | null {
    return this.esNavegador ? this.documento.defaultView : null;
  }
}

/**
 * Atajo para el caso más común: saber si estamos en el navegador desde la inicialización de un campo.
 *
 * <p>SOLO se puede llamar en contexto de inyección —al construir una clase o al inicializar uno de sus
 * campos—. Desde un `effect`, una promesa o un manejador de evento, hay que inyectar `Plataforma` y
 * guardar el servicio; si no, salta `NG0203` y además solo al prerenderizar.
 */
export function esNavegador(): boolean {
  return inject(Plataforma).esNavegador;
}
