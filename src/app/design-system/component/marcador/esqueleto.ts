import { Component, input } from '@angular/core';

/** El bloque gris que ocupa el sitio mientras llega el contenido. Usa la utilidad `.skeleton`. */
@Component({
  selector: 'nx-esqueleto',
  template: '',
  host: {
    'aria-hidden': 'true',
    // Una sola asociación con las dos partes: mezclar `class` estático con `[class]` deja el resultado
    // a merced del orden en que Angular resuelve cada uno.
    '[class]': '"skeleton " + clase()',
  },
})
export class Esqueleto {
  readonly clase = input('');
}
