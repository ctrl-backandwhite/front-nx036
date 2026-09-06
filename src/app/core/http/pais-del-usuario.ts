import { Service, inject, signal } from '@angular/core';
import { ALMACEN_LOCAL } from '../storage/almacen.port';

const CLAVE = 'nx036-country';

/**
 * El país de registro de quien ha entrado.
 *
 * <p>Está en el núcleo, y no dentro del contexto de la cuenta, porque lo necesita el cliente HTTP en cada
 * petición: es lo que decide el margen que se aplica a los precios. Vacío para quien no ha entrado.
 *
 * <p>REGLA: es el país de REGISTRO, nunca el de la dirección de envío. Cambiar la dirección de entrega no
 * puede cambiar el precio.
 */
@Service()
export class PaisDelUsuario {
  private readonly almacen = inject(ALMACEN_LOCAL);
  private readonly _codigo = signal<string>(this.almacen.lee(CLAVE) ?? '');

  readonly codigo = this._codigo.asReadonly();

  fija(codigo: string | null | undefined): void {
    const limpio = (codigo ?? '').trim().toUpperCase();
    if (limpio) {
      this.almacen.guarda(CLAVE, limpio);
    } else {
      this.almacen.borra(CLAVE);
    }
    this._codigo.set(limpio);
  }
}
