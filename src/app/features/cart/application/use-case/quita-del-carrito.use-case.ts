import { Injectable, inject } from '@angular/core';
import { ReferenciaDeLinea, normalizaVariante } from '../../domain/model/linea-de-carrito';
import { CARRITO_REMOTO_PORT } from '../../domain/port/carrito.port';
import { CarritoStore } from '../state/carrito.store';
import { SincronizadorDelCarrito } from '../state/sincronizador-del-carrito';

/** Sacar una línea de la cesta. */
@Injectable()
export class QuitaDelCarrito {
  private readonly remoto = inject(CARRITO_REMOTO_PORT);
  private readonly estado = inject(CarritoStore);
  private readonly sincronizador = inject(SincronizadorDelCarrito);

  async ejecuta(referencia: ReferenciaDeLinea): Promise<void> {
    const antes = this.estado.lineas();
    this.estado.quita(referencia);
    const variantId = normalizaVariante(referencia.variantId) ?? undefined;
    await this.sincronizador.encola(antes, () =>
      this.remoto.quita({ productId: referencia.productId, variantId }),
    );
  }
}
