import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Metricas, PedidoReciente, SeriesDelPanel } from '../../../domain/gestion/model/panel';
import { PANEL_PORT } from '../../../domain/gestion/port/panel.port';

/**
 * Las cifras de cabecera del cuadro de mando.
 *
 * <p>Parece un envoltorio de una sola línea, y lo es: pero es el que hace que la pantalla no conozca el
 * puerto ni tenga que decidir qué hacer cuando falla. El día que estas cifras haya que componerlas de
 * dos sitios, o cachearlas, se cambia aquí y ninguna pantalla se entera.
 */
@Injectable()
export class ConsultaMetricas {
  private readonly panel = inject(PANEL_PORT);

  ejecuta(): Promise<Result<Metricas, AppError>> {
    return this.panel.metricas();
  }
}

@Injectable()
export class ConsultaPedidosRecientes {
  private readonly panel = inject(PANEL_PORT);

  ejecuta(): Promise<Result<readonly PedidoReciente[], AppError>> {
    return this.panel.pedidosRecientes();
  }
}

@Injectable()
export class ConsultaSeries {
  private readonly panel = inject(PANEL_PORT);

  ejecuta(): Promise<Result<SeriesDelPanel, AppError>> {
    return this.panel.series();
  }
}
