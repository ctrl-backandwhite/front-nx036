import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DOCUMENT } from '@angular/core';
import { PreferenciasService } from '@core/preferences/preferencias';

/**
 * El armazón de la aplicación. No pinta nada por sí mismo: coloca la pantalla que toque y mantiene el
 * documento en sintonía con las preferencias.
 *
 * <p>El idioma y el tema se escriben en el elemento raíz porque de ahí cuelgan cosas que no pasan por
 * Angular: `data-theme` es lo que lee daisyUI para repintar la paleta entera, y `lang` es lo que usan el
 * lector de pantalla para elegir voz y el navegador para partir palabras.
 */
@Component({
  selector: 'nx-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  private readonly preferencias = inject(PreferenciasService);
  private readonly documento = inject(DOCUMENT);

  constructor() {
    effect(() => {
      const raiz = this.documento.documentElement;
      raiz.lang = this.preferencias.idioma();
      const elegido = this.preferencias.tema();
      if (elegido) {
        raiz.setAttribute('data-theme', elegido);
      } else {
        // Sin elección explícita se QUITA el atributo, en vez de poner el claro: el atributo gana sobre
        // la preferencia del sistema, así que ponerlo condena a modo claro a quien tiene el equipo en
        // oscuro. Sin él, daisyUI resuelve por `prefers-color-scheme`.
        raiz.removeAttribute('data-theme');
      }
    });
  }
}
