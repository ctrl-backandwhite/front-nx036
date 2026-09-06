import { Injectable, inject } from '@angular/core';
import { ReferenciaDeLinea, normalizaVariante, sinLinea } from '../../domain/model/linea-de-carrito';
import { CARRITO_GUARDADO_PORT, CARRITO_REMOTO_PORT } from '../../domain/port/carrito.port';
import { CarritoStore } from '../state/carrito.store';
import { SincronizadorDelCarrito } from '../state/sincronizador-del-carrito';

/**
 * Apartar una línea de la cesta a «guardado para más tarde».
 *
 * <p>Son DOS escrituras y el orden importa: la línea sale de la cesta y entra en la lista guardada. Si no
 * se borrase también en el servidor volvería a aparecer en la siguiente sincronización, DUPLICADA con la
 * guardada; y si el borrado falla, la cesta que se relee sigue trayéndola, así que se descarta de ahí —o
 * el producto acabaría a la vez en los dos sitios, que es verlo dos veces y pagarlo una—.
 */
@Injectable()
export class ApartaParaMasTarde {
  private readonly remoto = inject(CARRITO_REMOTO_PORT);
  private readonly guardado = inject(CARRITO_GUARDADO_PORT);
  private readonly estado = inject(CarritoStore);
  private readonly sincronizador = inject(SincronizadorDelCarrito);

  async ejecuta(referencia: ReferenciaDeLinea): Promise<void> {
    const antes = this.estado.lineas();
    const linea = this.estado.aparta(referencia);
    if (!linea) {
      return;
    }
    const variantId = normalizaVariante(referencia.variantId) ?? undefined;
    const enCesta = this.sincronizador.encola(
      antes,
      () => this.remoto.quita({ productId: referencia.productId, variantId }),
      (lineas) => sinLinea(lineas, referencia),
    );

    // La lista guardada solo se sincroniza con sesión abierta; sin ella vive en este equipo y ya está.
    // Si la escritura falla se calla: quien compra ve la línea apartada y lo estará en cuanto vuelva la
    // red, mientras que un aviso de error aquí no le deja hacer nada distinto.
    if (this.estado.cestaDeLaCuenta()) {
      const resultado = await this.guardado.guarda(linea);
      if (resultado.ok) {
        this.estado.fijaGuardadas(resultado.valor);
      }
    }
    await enCesta;
  }
}
