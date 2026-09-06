import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AgenteResumido,
  Cotizacion,
  NuevaSolicitud,
  SolicitudDeAprovisionamiento,
} from '../model/aprovisionamiento';

/** Mis solicitudes de aprovisionamiento: abrirlas, verlas, cancelarlas y borrarlas. */
export interface SolicitudesDeAprovisionamientoPort {
  mias(): Promise<Result<readonly SolicitudDeAprovisionamiento[], AppError>>;
  crea(solicitud: NuevaSolicitud): Promise<Result<SolicitudDeAprovisionamiento, AppError>>;
  /** Baja lógica: la solicitud sigue ahí, pero ya no se trabaja en ella. */
  cancela(id: string): Promise<Result<SolicitudDeAprovisionamiento, AppError>>;
  elimina(id: string): Promise<Result<void, AppError>>;
}

export const SOLICITUDES_DE_APROVISIONAMIENTO_PORT =
  new InjectionToken<SolicitudesDeAprovisionamientoPort>('SolicitudesDeAprovisionamientoPort');

/**
 * Las cotizaciones de una solicitud.
 *
 * <p>Puerto propio, y no dos métodos más en el anterior, porque se consume en otro momento: las
 * cotizaciones solo se piden cuando alguien despliega una tarjeta. Quien lista solicitudes no tiene
 * por qué cargar con esto ni fingirlo en una prueba.
 */
export interface CotizacionesPort {
  deLaSolicitud(id: string): Promise<Result<readonly Cotizacion[], AppError>>;
  elige(
    idSolicitud: string,
    idCotizacion: string,
  ): Promise<Result<SolicitudDeAprovisionamiento, AppError>>;
}

export const COTIZACIONES_PORT = new InjectionToken<CotizacionesPort>('CotizacionesPort');

/** El escaparate de agentes. Es una lectura pública y no tiene nada que ver con tener solicitudes. */
export interface AgentesDeAprovisionamientoPort {
  lista(): Promise<Result<readonly AgenteResumido[], AppError>>;
}

export const AGENTES_DE_APROVISIONAMIENTO_PORT =
  new InjectionToken<AgentesDeAprovisionamientoPort>('AgentesDeAprovisionamientoPort');
