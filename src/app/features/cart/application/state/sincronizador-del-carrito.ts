import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { LineaDeCarrito } from '../../domain/model/linea-de-carrito';
import { CARRITO_REMOTO_PORT } from '../../domain/port/carrito.port';
import { CarritoStore } from './carrito.store';

/** Cómo reparar la cesta que devuelve el servidor cuando la escritura ha fallado. */
export type Reparacion = (lineas: readonly LineaDeCarrito[]) => readonly LineaDeCarrito[];

const SIN_REPARAR: Reparacion = (lineas) => lineas;

/**
 * Confirma contra el servidor un cambio YA aplicado en la pantalla.
 *
 * <p><b>Va en cola.</b> Las escrituras salen EN ORDEN. Sin cola, tres pulsaciones seguidas en «+»
 * lanzarían tres escrituras en paralelo y la última respuesta en llegar —que puede ser la de una cantidad
 * intermedia— dejaría en pantalla un número que ya nadie pidió.
 *
 * <p><b>Se aplica primero en local.</b> La cesta no puede congelarse esperando a la red en cada
 * pulsación. Después se sustituye por la respuesta, que es la fuente de verdad: así llegan solas las
 * correcciones del servidor, como subir la cantidad al pedido mínimo del catálogo.
 *
 * <p><b>Si falla, se vuelve al estado real</b>: primero releyendo la cesta del servidor —que no pisa lo
 * que otra operación de la cola haya confirmado entretanto— y, si tampoco se puede leer, a la foto
 * previa. Sobre eso se aplica la reparación de la operación concreta: quitar de la cesta lo que quien
 * compra ve confirmado —añadido, devuelto desde guardados— sería contradecirle en pantalla, y el pedido
 * se envía con estas líneas, así que conservarlas es también lo que permite terminar la compra.
 *
 * <p>La comprobación de «es la cesta de la cuenta» se repite ANTES de cada escritura porque entre la
 * petición y su respuesta puede haberse cerrado la sesión, y la cesta de la cuenta no puede reaparecer en
 * pantalla después.
 */
@Injectable()
export class SincronizadorDelCarrito {
  private readonly remoto = inject(CARRITO_REMOTO_PORT);
  private readonly estado = inject(CarritoStore);

  private cola: Promise<void> = Promise.resolve();

  encola(
    antes: readonly LineaDeCarrito[],
    escritura: () => Promise<Result<readonly LineaDeCarrito[], AppError>>,
    repara: Reparacion = SIN_REPARAR,
  ): Promise<void> {
    if (!this.estado.cestaDeLaCuenta()) {
      return Promise.resolve();
    }
    this.cola = this.cola.then(() => this.ejecutaUna(antes, escritura, repara));
    return this.cola;
  }

  private async ejecutaUna(
    antes: readonly LineaDeCarrito[],
    escritura: () => Promise<Result<readonly LineaDeCarrito[], AppError>>,
    repara: Reparacion,
  ): Promise<void> {
    if (!this.estado.cestaDeLaCuenta()) {
      return;
    }
    const resultado = await escritura();
    if (resultado.ok) {
      this.aplica(resultado.valor);
      return;
    }
    const releida = await this.remoto.consulta();
    this.aplica(repara(releida.ok ? releida.valor : antes));
  }

  private aplica(lineas: readonly LineaDeCarrito[]): void {
    if (this.estado.cestaDeLaCuenta()) {
      this.estado.reemplaza(lineas);
    }
  }
}
