import { DOCUMENT, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * ¿Estamos en el navegador?
 *
 * <p>Hace falta porque las páginas públicas se PRERENDERIZAN: el mismo código corre una vez en Node, al
 * construir, para dejar el HTML escrito. Allí no hay `window`, ni `document`, ni almacenamiento, ni
 * cookies. Tocar cualquiera de esos sin preguntar rompe la compilación entera, no una pantalla.
 *
 * <p>Y hay una segunda razón, más sutil: lo que se pinta al prerenderizar tiene que COINCIDIR con lo que
 * el navegador pinta al hidratar. Si al construir se resuelve un idioma y en el navegador otro, Angular
 * descarta el HTML recibido y vuelve a montar la página. Por eso lo que dependa del visitante se lee
 * después de hidratar, nunca durante el primer pintado.
 */
export function esNavegador(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}

/** El documento, o `null` si estamos prerenderizando. Nunca se usa `document` global directamente. */
export function documentoSiLoHay(): Document | null {
  return esNavegador() ? inject(DOCUMENT) : null;
}
