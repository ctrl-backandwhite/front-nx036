import { Injectable, inject } from '@angular/core';
import { PASARELA_DE_PAGO_PORT } from '../../domain/port/pasarela-de-pago.port';
import { CompraStore } from '../state/compra.store';

/**
 * Deja la pasarela lista, y NI UN MOMENTO ANTES.
 *
 * <p>Es un caso de uso aparte, y no un paso más al abrir el pago, por una razón medida: el guion de la
 * pasarela es un fichero externo pesado que además vigila la página entera. Cargarlo al abrir el pago se
 * lo cobra a TODO EL MUNDO, incluido quien va a pagar con saldo o con PayPal y no lo va a usar jamás.
 *
 * <p>Se llama cuando se elige un método de tarjeta —un gesto, no la carga de la pantalla— y, por si
 * acaso, justo antes de necesitar la autenticación reforzada. El adaptador es idempotente, así que
 * pedirlo dos veces no descarga nada dos veces.
 */
@Injectable()
export class PreparaLaPasarela {
  private readonly pasarela = inject(PASARELA_DE_PAGO_PORT);
  private readonly estado = inject(CompraStore);

  async ejecuta(): Promise<void> {
    const clave = this.estado.clavePublicaDePasarela();
    if (clave) {
      await this.pasarela.prepara(clave);
    }
  }
}
