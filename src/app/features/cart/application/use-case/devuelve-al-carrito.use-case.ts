import { Injectable, inject } from '@angular/core';
import { ReferenciaDeLinea, aseguraLinea, normalizaVariante } from '../../domain/model/linea-de-carrito';
import { CARRITO_GUARDADO_PORT, CARRITO_REMOTO_PORT } from '../../domain/port/carrito.port';
import { CarritoStore } from '../state/carrito.store';
import { SincronizadorDelCarrito } from '../state/sincronizador-del-carrito';

/**
 * Devolver a la cesta algo que estaba guardado para más tarde.
 *
 * <p>Devolverla ya la ha quitado de guardados: si la escritura fallara y se repintase la cesta del
 * servidor sin ella, la línea desaparecería de los dos sitios a la vez. Por eso la reparación la ASEGURA
 * en la cesta releída.
 */
@Injectable()
export class DevuelveAlCarrito {
  private readonly remoto = inject(CARRITO_REMOTO_PORT);
  private readonly guardado = inject(CARRITO_GUARDADO_PORT);
  private readonly estado = inject(CarritoStore);
  private readonly sincronizador = inject(SincronizadorDelCarrito);

  async ejecuta(referencia: ReferenciaDeLinea): Promise<void> {
    const antes = this.estado.lineas();
    const linea = this.estado.devuelveALaCesta(referencia);
    if (!linea) {
      return;
    }
    const enCesta = this.sincronizador.encola(
      antes,
      () => this.remoto.guarda(linea),
      (lineas) => aseguraLinea(lineas, linea),
    );

    if (this.estado.cestaDeLaCuenta()) {
      const variantId = normalizaVariante(referencia.variantId) ?? undefined;
      const resultado = await this.guardado.quita({ productId: referencia.productId, variantId });
      if (resultado.ok) {
        this.estado.fijaGuardadas(resultado.valor);
      }
    }
    await enCesta;
  }
}
