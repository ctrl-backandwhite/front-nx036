import { Component, inject } from '@angular/core';
import { CapturaReferido } from '../../application/use-case/captura-referido.use-case';

/**
 * Captura el referido con el que llega una visita. NO pinta nada.
 *
 * <p>Se monta en el marco de la aplicación, no en una ruta, porque el enlace de un afiliado puede
 * apuntar a cualquier página: a la portada, a una ficha o a una categoría. Colgarlo de una ruta concreta
 * dejaría sin atribución todo lo que no fuera esa.
 *
 * <p>Después de apuntar el clic, el parámetro `?ref=` se borra de la barra de direcciones SIN recargar.
 * Si se quedara, cualquiera que copiase esa dirección estaría repartiendo el enlace de otro afiliado sin
 * saberlo.
 */
@Component({
  selector: 'nx-captura-de-referido',
  template: '',
})
export class CapturaDeReferido {
  private readonly captura = inject(CapturaReferido);

  constructor() {
    void this.trabaja();
  }

  private async trabaja(): Promise<void> {
    if (typeof location === 'undefined') {
      // Al prerenderizar no hay dirección de visita que capturar: esto solo ocurre en el navegador.
      return;
    }
    const limpia = await this.captura.apunta(location.pathname + location.search + location.hash);
    if (limpia !== null) {
      history.replaceState({}, '', limpia);
    }
    await this.captura.vincula();
  }
}
