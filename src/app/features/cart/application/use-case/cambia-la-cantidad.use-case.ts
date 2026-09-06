import { Injectable, inject } from '@angular/core';
import { ReferenciaDeLinea, esLaMismaLinea, normalizaVariante } from '../../domain/model/linea-de-carrito';
import { CARRITO_REMOTO_PORT } from '../../domain/port/carrito.port';
import { CarritoStore } from '../state/carrito.store';
import { SincronizadorDelCarrito } from '../state/sincronizador-del-carrito';

/**
 * Cambiar cuántas unidades lleva una línea.
 *
 * <p>Bajar a cero es QUITAR la línea, y así se le pide al servidor: el backend no acepta cantidad cero
 * —su mínimo es uno— y mandarle un cero devolvía un rechazo con el que la pantalla no sabía qué hacer.
 */
@Injectable()
export class CambiaLaCantidad {
  private readonly remoto = inject(CARRITO_REMOTO_PORT);
  private readonly estado = inject(CarritoStore);
  private readonly sincronizador = inject(SincronizadorDelCarrito);

  async ejecuta(referencia: ReferenciaDeLinea, cantidad: number): Promise<void> {
    const antes = this.estado.lineas();
    const objetivo = antes.find((linea) => esLaMismaLinea(linea, referencia));
    this.estado.fijaCantidad(referencia, cantidad);
    if (!objetivo) {
      return;
    }
    const siguiente = Math.max(0, cantidad);
    const variantId = normalizaVariante(referencia.variantId) ?? undefined;
    await this.sincronizador.encola(antes, () =>
      siguiente > 0
        ? this.remoto.guarda({ ...objetivo, cantidad: siguiente })
        : this.remoto.quita({ productId: referencia.productId, variantId }),
    );
  }
}
