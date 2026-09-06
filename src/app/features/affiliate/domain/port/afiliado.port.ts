import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  CodigoDeReferido,
  DatosDeCobro,
  MetodoDeCobro,
  PanelDeAfiliado,
  PerfilDeCobro,
} from '../model/afiliado';

/** Consultar el panel, darse de alta y crear enlaces. Lo que hace un afiliado con sus referidos. */
export interface PanelDeAfiliadoPort {
  consulta(): Promise<Result<PanelDeAfiliado, AppError>>;
  inscribe(): Promise<Result<PanelDeAfiliado, AppError>>;
  creaCodigo(etiqueta: string): Promise<Result<CodigoDeReferido, AppError>>;
}

export const PANEL_DE_AFILIADO_PORT = new InjectionToken<PanelDeAfiliadoPort>('PanelDeAfiliadoPort');

/**
 * Los datos de cobro y la solicitud de pago. Es otra capacidad y toca dinero: va en su propio puerto.
 *
 * <p>El pago en sí NO se ejecuta desde aquí ni desde ningún sitio de la aplicación: un administrador lo
 * aprueba y lo transfiere fuera. Esta pantalla solo deja pedirlo y ver en qué estado está.
 */
export interface CobroDeAfiliadoPort {
  consultaPerfil(): Promise<Result<PerfilDeCobro, AppError>>;
  guardaPerfil(datos: DatosDeCobro): Promise<Result<PerfilDeCobro, AppError>>;
  solicita(metodo: MetodoDeCobro): Promise<Result<void, AppError>>;
}

export const COBRO_DE_AFILIADO_PORT = new InjectionToken<CobroDeAfiliadoPort>('CobroDeAfiliadoPort');
