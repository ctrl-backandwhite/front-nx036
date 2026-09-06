import { Service, inject } from '@angular/core';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { EstadoDeGestion } from '../../domain/model/aviso';
import { GESTION_DE_AVISOS_PORT } from '../../domain/port/avisos.port';
import { BuzonStore } from '../state/buzon.store';

/** Qué se le hace a un aviso. Un solo nombre para la acción y su método, sin `switch` repartidos. */
export type Movimiento = 'archiva' | 'desarchiva' | 'aLaPapelera' | 'restaura' | 'borraParaSiempre';

/**
 * Mover avisos de carpeta, uno o varios a la vez, y cambiar su estado de gestión.
 *
 * <p>El lote es la parte delicada. Sin atender el fallo, que UNA sola de las operaciones fallara dejaba
 * una promesa rechazada sin atender: la barra de acciones se quedaba con los botones apagados para
 * siempre y sin decir nada. Aquí se esperan TODAS —las que salgan bien se aplican— y se devuelve el
 * primer fallo para que la pantalla lo cuente.
 */
@Service()
export class MueveAvisos {
  private readonly gestion = inject(GESTION_DE_AVISOS_PORT);
  private readonly estado = inject(BuzonStore);

  async uno(id: string, movimiento: Movimiento): Promise<Result<void, AppError>> {
    const resultado = await this.gestion[movimiento](id);
    if (resultado.ok) {
      this.estado.retira([id]);
    }
    return resultado;
  }

  /** @param ids los marcados. Se aplica a todos en paralelo y se limpia la selección al terminar. */
  async enLote(ids: readonly string[], movimiento: Movimiento): Promise<Result<void, AppError>> {
    if (ids.length === 0) {
      return exito(undefined);
    }
    const resultados = await Promise.all(ids.map((id) => this.gestion[movimiento](id)));
    const logrados = ids.filter((_, indice) => resultados[indice].ok);

    // Se retira lo que sí funcionó pase lo que pase con el resto: dejarlo en la bandeja haría creer
    // que no se hizo nada, y volver a intentarlo lo repetiría todo.
    this.estado.retira(logrados);
    this.estado.limpiaMarcados();

    const fallo = resultados.find((r) => !r.ok);
    return fallo ?? exito(undefined);
  }

  /**
   * Cambia el estado del flujo de gestión (recibido, en curso, esperando, resuelto).
   *
   * <p>El aviso NO se retira: sigue en la bandeja, solo cambia su etiqueta.
   */
  async cambiaEstado(id: string, nuevo: EstadoDeGestion): Promise<Result<void, AppError>> {
    return this.gestion.cambiaEstado(id, nuevo);
  }
}
