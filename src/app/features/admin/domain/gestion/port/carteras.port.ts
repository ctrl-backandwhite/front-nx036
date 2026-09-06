import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Pagina } from '../model/pagina';
import {
  Ajuste, Deposito, DetalleDeCartera, FiltroDeCarteras, MovimientoDeCartera, ResumenDeCartera,
} from '../model/carteras';

/**
 * Las carteras de los clientes: consultarlas y mover saldo.
 *
 * <p>Mover saldo es una operación CONTABLE: cada depósito y cada ajuste deja un apunte en el libro mayor
 * con el saldo resultante. No hay método para «poner el saldo en X» a propósito — solo se suma o se
 * resta, porque un saldo escrito a mano no se puede reconciliar con nada.
 */
export interface CarterasPort {
  busca(filtro: FiltroDeCarteras): Promise<Result<Pagina<ResumenDeCartera>, AppError>>;
  detalle(idUsuario: string): Promise<Result<DetalleDeCartera, AppError>>;
  movimientos(
    idCartera: string,
    pagina: number,
    tamano: number,
  ): Promise<Result<Pagina<MovimientoDeCartera>, AppError>>;
  deposita(deposito: Deposito): Promise<Result<void, AppError>>;
  ajusta(ajuste: Ajuste): Promise<Result<void, AppError>>;
  reindexa(): Promise<Result<number, AppError>>;
}

export const CARTERAS_PORT = new InjectionToken<CarterasPort>('CarterasPort');
