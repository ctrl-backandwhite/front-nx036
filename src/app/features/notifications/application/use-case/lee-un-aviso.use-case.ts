import { Service, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Aviso, sinLeer } from '../../domain/model/aviso';
import { BUZON_PORT } from '../../domain/port/avisos.port';
import { BuzonStore } from '../state/buzon.store';

/**
 * Abrir un aviso: dejarlo a la vista y, si estaba sin leer, marcarlo.
 *
 * <p>Son dos cosas seguidas que nadie debería tener que recordar por separado, y por eso hay un caso de
 * uso. La marca de leído es SILENCIOSA a propósito: la dispara el propio buzón al abrir, no quien mira.
 * Un aviso de error ahí interrumpiría una lectura que sí ha funcionado.
 */
@Service()
export class LeeUnAviso {
  private readonly buzon = inject(BUZON_PORT);
  private readonly estado = inject(BuzonStore);

  async ejecuta(aviso: Aviso): Promise<void> {
    this.estado.abre(aviso.id);
    if (!sinLeer(aviso)) {
      return;
    }
    const resultado = await this.buzon.marcaLeido(aviso.id);
    if (resultado.ok) {
      this.estado.marcaLeidoAqui(aviso.id);
    }
  }

  /** Marcar TODOS. Esta sí avisa si falla: la pide quien mira, y verla no cambiar confunde. */
  async todos(): Promise<Result<void, AppError>> {
    const resultado = await this.buzon.marcaTodosLeidos();
    if (resultado.ok) {
      this.estado.fijaSinLeer(0);
    }
    return resultado;
  }
}
