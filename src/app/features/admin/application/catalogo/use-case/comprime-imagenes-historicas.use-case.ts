import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import {
  COMPRESION_DE_IMAGENES_PORT,
  EstadoDeCompresion,
} from '../../../domain/catalogo/port/productos-admin.port';

/** Cuántas imágenes se piden por lote y cuánto se espera entre uno y el siguiente. */
const IMAGENES_POR_LOTE = 500;
const ESPERA_ENTRE_LOTES_MS = 4000;

/**
 * Comprime el histórico de imágenes, encadenando lotes.
 *
 * <p>Va por lotes y ENCADENANDO: con setenta mil imágenes pendientes, una llamada por pulsación serían
 * ciento y pico pulsaciones esperando a que la cola se vacíe entre una y otra, que no es una
 * herramienta sino una tarea manual. Aquí se pide un lote, se espera a que el espejador lo drene y se
 * pide el siguiente.
 *
 * <p>Solo se pide otro lote cuando el anterior está drenado: amontonarlos no acelera nada —el espejador
 * va a su ritmo— y deja miles de imágenes marcadas como pendientes sin necesidad.
 *
 * <p>Solo avanza con la página ABIERTA, y eso se dice en pantalla: el trabajo completo son unas treinta
 * horas. Lo que sí se garantiza es que nada se pierde al cerrar y que al volver continúa donde estaba.
 */
@Injectable()
export class ComprimeImagenesHistoricas {
  private readonly compresion = inject(COMPRESION_DE_IMAGENES_PORT);

  /**
   * @param sigueVivo se consulta antes de cada paso; devolver `false` detiene la cadena.
   * @param alAvanzar recibe el estado tras cada consulta, para poder pintar cuánto queda.
   * @param espera cómo se espera entre lotes. Se inyecta para que la prueba no tarde cuatro segundos.
   */
  async ejecuta(
    sigueVivo: () => boolean,
    alAvanzar: (estado: EstadoDeCompresion) => void,
    espera: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ): Promise<Result<void, AppError>> {
    while (sigueVivo()) {
      const estado = await this.compresion.estado();
      if (!estado.ok) {
        return estado;
      }
      if (!sigueVivo()) {
        return exito(undefined);
      }
      alAvanzar(estado.valor);
      if (estado.valor.pendientes === 0) {
        return exito(undefined);
      }
      if (estado.valor.enCola === 0) {
        const encolado = await this.compresion.encolaLote(IMAGENES_POR_LOTE);
        if (!encolado.ok) {
          return encolado;
        }
      }
      await espera(ESPERA_ENTRE_LOTES_MS);
    }
    return exito(undefined);
  }
}
