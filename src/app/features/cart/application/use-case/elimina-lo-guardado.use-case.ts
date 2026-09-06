import { Injectable, inject } from '@angular/core';
import { ReferenciaDeLinea, normalizaVariante } from '../../domain/model/linea-de-carrito';
import { CARRITO_GUARDADO_PORT } from '../../domain/port/carrito.port';
import { CarritoStore } from '../state/carrito.store';

/** Eliminar definitivamente una línea de «guardado para más tarde». No vuelve a la cesta. */
@Injectable()
export class EliminaLoGuardado {
  private readonly guardado = inject(CARRITO_GUARDADO_PORT);
  private readonly estado = inject(CarritoStore);

  async ejecuta(referencia: ReferenciaDeLinea): Promise<void> {
    this.estado.eliminaGuardada(referencia);
    if (!this.estado.cestaDeLaCuenta()) {
      return;
    }
    const variantId = normalizaVariante(referencia.variantId) ?? undefined;
    const resultado = await this.guardado.quita({ productId: referencia.productId, variantId });
    if (resultado.ok) {
      this.estado.fijaGuardadas(resultado.valor);
    }
  }
}
