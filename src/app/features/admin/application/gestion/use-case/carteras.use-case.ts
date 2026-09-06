import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { Pagina } from '../../../domain/gestion/model/pagina';
import {
  Ajuste, Deposito, DetalleDeCartera, FiltroDeCarteras, MovimientoDeCartera, ResumenDeCartera,
  ajusteValido, depositoValido,
} from '../../../domain/gestion/model/carteras';
import { CARTERAS_PORT } from '../../../domain/gestion/port/carteras.port';

@Injectable()
export class BuscaCarteras {
  private readonly carteras = inject(CARTERAS_PORT);

  ejecuta(filtro: FiltroDeCarteras): Promise<Result<Pagina<ResumenDeCartera>, AppError>> {
    return this.carteras.busca(filtro);
  }
}

@Injectable()
export class ConsultaLaCartera {
  private readonly carteras = inject(CARTERAS_PORT);

  ejecuta(idUsuario: string): Promise<Result<DetalleDeCartera, AppError>> {
    return this.carteras.detalle(idUsuario);
  }
}

@Injectable()
export class ConsultaMovimientos {
  private readonly carteras = inject(CARTERAS_PORT);

  ejecuta(
    idCartera: string,
    pagina: number,
    tamano: number,
  ): Promise<Result<Pagina<MovimientoDeCartera>, AppError>> {
    return this.carteras.movimientos(idCartera, pagina, tamano);
  }
}

/**
 * Ingresa saldo a mano.
 *
 * <p>La comprobación del importe se hace AQUÍ y no solo en el formulario: un botón deshabilitado no es
 * una regla, es una comodidad. Aquí es donde se garantiza que no se manda un apunte de cero que
 * ensuciaría el libro mayor sin mover nada.
 */
@Injectable()
export class IngresaEnLaCartera {
  private readonly carteras = inject(CARTERAS_PORT);

  ejecuta(deposito: Deposito): Promise<Result<void, AppError>> {
    if (!depositoValido(deposito.importeCentimos)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.carteras.deposita(deposito);
  }
}

/**
 * Ajusta el saldo, en las dos direcciones.
 *
 * <p>El motivo es OBLIGATORIO: el apunte queda en el libro mayor y alguien tendrá que explicarlo cuando
 * un cliente pregunte por qué le falta dinero. Y nunca cero, por lo mismo que el ingreso.
 */
@Injectable()
export class AjustaLaCartera {
  private readonly carteras = inject(CARTERAS_PORT);

  ejecuta(ajuste: Ajuste): Promise<Result<void, AppError>> {
    if (!ajusteValido(ajuste.importeCentimos, ajuste.descripcion)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.carteras.ajusta(ajuste);
  }
}

@Injectable()
export class ReindexaCarteras {
  private readonly carteras = inject(CARTERAS_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.carteras.reindexa();
  }
}
