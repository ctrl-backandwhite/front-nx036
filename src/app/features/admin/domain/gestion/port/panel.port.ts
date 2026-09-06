import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Metricas, PedidoReciente, SeriesDelPanel } from '../model/panel';

/**
 * Lo que necesita el cuadro de mando. Nada más.
 *
 * <p>Tres lecturas y ninguna escritura: el panel no cambia nada, y un puerto que además pudiera escribir
 * obligaría a cualquier doble de prueba a fingir operaciones que esta pantalla no hace.
 */
export interface PanelPort {
  metricas(): Promise<Result<Metricas, AppError>>;
  pedidosRecientes(): Promise<Result<readonly PedidoReciente[], AppError>>;
  series(): Promise<Result<SeriesDelPanel, AppError>>;
}

export const PANEL_PORT = new InjectionToken<PanelPort>('PanelPort');
