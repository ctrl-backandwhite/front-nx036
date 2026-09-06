import { Service, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Carpeta, sinLeer } from '../../domain/model/aviso';
import { BUZON_PORT } from '../../domain/port/avisos.port';
import { BuzonStore } from '../state/buzon.store';

/**
 * Traer una carpeta del buzón y dejarla puesta.
 *
 * <p>Devuelve el `Result` además de publicar el estado: la pantalla necesita saber si falló para
 * avisar. Cuando el buzón se quedaba MUDO ante un rechazo del servidor, quien miraba volvía a pulsar
 * creyendo que había fallado el clic.
 */
@Service()
export class ConsultaElBuzon {
  private readonly buzon = inject(BUZON_PORT);
  private readonly estado = inject(BuzonStore);

  async ejecuta(carpeta: Carpeta): Promise<Result<void, AppError>> {
    this.estado.marcaCargando(true);
    try {
      const resultado = await this.buzon.lista(carpeta);
      if (resultado.ok) {
        this.estado.fija(resultado.valor);
        // El contador se recalcula con el MISMO criterio que la lista, no con otra llamada: así la
        // campana y la bandeja no pueden contradecirse mientras se mira.
        this.estado.fijaSinLeer(resultado.valor.filter(sinLeer).length);
        return { ok: true, valor: undefined };
      }
      return resultado;
    } finally {
      this.estado.marcaCargando(false);
    }
  }

  /** Solo la cifra. Es lo único que necesita la campana del escaparate. */
  async cuantosSinLeer(): Promise<number> {
    const resultado = await this.buzon.sinLeer();
    // Un contador que no llega se enseña como cero: peor sería no pintar la campana.
    return resultado.ok ? resultado.valor : 0;
  }
}
