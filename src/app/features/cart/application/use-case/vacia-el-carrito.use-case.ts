import { Injectable, inject } from '@angular/core';
import { CARRITO_REMOTO_PORT } from '../../domain/port/carrito.port';
import { CarritoStore } from '../state/carrito.store';
import { SincronizadorDelCarrito } from '../state/sincronizador-del-carrito';

/**
 * Vaciar la cesta entera.
 *
 * <p>Lo llama el pago cuando el cobro se CONFIRMA, nunca al redirigir a la pasarela: quien vuelve atrás
 * sin haber pagado tiene que encontrar sus productos donde los dejó.
 */
@Injectable()
export class VaciaElCarrito {
  private readonly remoto = inject(CARRITO_REMOTO_PORT);
  private readonly estado = inject(CarritoStore);
  private readonly sincronizador = inject(SincronizadorDelCarrito);

  async ejecuta(): Promise<void> {
    const antes = this.estado.lineas();
    this.estado.vacia();
    await this.sincronizador.encola(antes, () => this.remoto.vacia());
  }
}
