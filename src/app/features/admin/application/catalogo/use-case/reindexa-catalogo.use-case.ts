import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { IMPORTACION_DE_CATALOGO_PORT } from '../../../domain/catalogo/port/transferencia-de-catalogo.port';

/** Cada cuánto se pregunta si terminó, y cuántas veces como mucho (unos veinte minutos en total). */
const ESPERA_ENTRE_SONDEOS_MS = 3000;
const SONDEOS_MAXIMOS = 400;

/** Cómo acabó: cuántos se indexaron, o que ya había uno corriendo y por eso no se lanzó otro. */
export interface FinDeReindexado {
  readonly indexados: number;
  readonly yaEstabaEnMarcha: boolean;
}

/**
 * Reindexa el catálogo entero en el buscador.
 *
 * <p>Corre en SEGUNDO PLANO: con miles de productos, hacerlo síncrono moría por el tiempo de espera del
 * proxy y salía «no se pudo reindexar» aunque el trabajo hubiera terminado bien. El envío responde al
 * instante y aquí se sondea el estado hasta que acaba, para poder dar el recuento final.
 */
@Injectable()
export class ReindexaCatalogo {
  private readonly importacion = inject(IMPORTACION_DE_CATALOGO_PORT);

  async ejecuta(
    espera: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ): Promise<Result<FinDeReindexado, AppError>> {
    const arranque = await this.importacion.reindexa();
    if (!arranque.ok) {
      return arranque;
    }
    if (arranque.valor.arrancado === false && arranque.valor.enMarcha) {
      return exito({ indexados: arranque.valor.indexados, yaEstabaEnMarcha: true });
    }
    let indexados = arranque.valor.indexados;
    for (let intento = 0; intento < SONDEOS_MAXIMOS; intento++) {
      await espera(ESPERA_ENTRE_SONDEOS_MS);
      const estado = await this.importacion.estadoDeReindexado();
      if (!estado.ok) {
        return estado;
      }
      if (!estado.valor.enMarcha) {
        indexados = estado.valor.indexados;
        break;
      }
    }
    return exito({ indexados, yaEstabaEnMarcha: false });
  }
}
