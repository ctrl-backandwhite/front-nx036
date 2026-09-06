import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Pagina } from '../model/pagina';
import {
  Afiliado, ConfiguracionDeAfiliados, DetalleDeAfiliado, PagoPendiente,
} from '../model/afiliados';

/** El programa de afiliados: quiénes son, en qué estado están y su detalle. */
export interface AfiliadosPort {
  busca(
    estado: string | undefined,
    pagina: number,
    tamano: number,
  ): Promise<Result<Pagina<Afiliado>, AppError>>;
  detalle(id: string): Promise<Result<DetalleDeAfiliado, AppError>>;
  cambiaEstado(id: string, estado: string): Promise<Result<void, AppError>>;
  reindexa(): Promise<Result<number, AppError>>;
  configuracion(): Promise<Result<ConfiguracionDeAfiliados, AppError>>;
  guardaConfiguracion(config: ConfiguracionDeAfiliados): Promise<Result<void, AppError>>;
}

export const AFILIADOS_PORT = new InjectionToken<AfiliadosPort>('AfiliadosPort');

/**
 * El dinero de los afiliados: aprobar comisiones y pagar.
 *
 * <p>Va aparte del puerto de consulta porque es otra capacidad y, sobre todo, otro nivel de riesgo: aquí
 * se aprueba y se transfiere dinero real, y quien solo lista afiliados no debería poder hacerlo.
 */
export interface PagosDeAfiliadosPort {
  pendientes(): Promise<Result<readonly PagoPendiente[], AppError>>;
  aprueba(id: string, referencia?: string): Promise<Result<void, AppError>>;
  rechaza(id: string, motivo: string): Promise<Result<void, AppError>>;
  /** Paga a un afiliado todo lo que tenga aprobado. Devuelve los céntimos pagados. */
  paga(idAfiliado: string): Promise<Result<number, AppError>>;
  /** Aprueba de golpe las comisiones que ya han cumplido el periodo de devolución. */
  apruebaVencidas(): Promise<Result<number, AppError>>;
  /** Resuelve una comisión que quedó marcada para revisión manual. */
  revisaComision(idComision: string, aprueba: boolean): Promise<Result<void, AppError>>;
}

export const PAGOS_DE_AFILIADOS_PORT = new InjectionToken<PagosDeAfiliadosPort>('PagosDeAfiliadosPort');
