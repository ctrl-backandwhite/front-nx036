import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Metricas, PedidoReciente, SeriesDelPanel } from '../../domain/gestion/model/panel';
import { PanelPort } from '../../domain/gestion/port/panel.port';
import { cifra } from './cifra';

/** La forma en que llegan las métricas. Vive aquí y solo aquí: fuera del adaptador nadie la conoce. */
interface MetricasDto {
  activeProducts?: number;
  totalProducts?: number;
  draftProducts?: number;
  totalOrders?: number;
  totalUsers?: number;
  totalSuppliers?: number;
  activePlans?: number;
  totalSubscriptions?: number;
  gmvUsd?: number;
  mrrUsd?: number;
}

interface PedidoRecienteDto {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  placedAt?: string;
}

interface SeriesDto {
  ordersByDay?: Record<string, number>;
  gmvCentsByDay?: Record<string, number>;
}

@Injectable()
export class PanelHttpAdapter implements PanelPort {
  private readonly api = inject(ApiService);

  async metricas(): Promise<Result<Metricas, AppError>> {
    const respuesta = await this.api.get<MetricasDto>('/admin/dashboard/metrics');
    // Los importes pueden llegar como TEXTO —el backend serializa un decimal para no perder precisión—,
    // así que todo pasa por `cifra`, que es lo que impide que un `NaN` acabe pintado en el cuadro de
    // mando.
    return mapea(respuesta, (dto) => ({
      productosActivos: cifra(dto.activeProducts),
      productosTotales: cifra(dto.totalProducts),
      productosBorrador: cifra(dto.draftProducts),
      pedidos: cifra(dto.totalOrders),
      usuarios: cifra(dto.totalUsers),
      proveedores: cifra(dto.totalSuppliers),
      planesActivos: cifra(dto.activePlans),
      suscripciones: cifra(dto.totalSubscriptions),
      gmvUsd: cifra(dto.gmvUsd),
      mrrUsd: cifra(dto.mrrUsd),
    }));
  }

  async pedidosRecientes(): Promise<Result<readonly PedidoReciente[], AppError>> {
    const respuesta = await this.api.get<PedidoRecienteDto[]>('/admin/dashboard/recent-orders');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        numero: dto.orderNumber,
        estado: dto.status,
        totalCentimos: cifra(dto.totalCents),
        divisa: dto.currency,
        realizadoEl: dto.placedAt,
      })),
    );
  }

  async series(): Promise<Result<SeriesDelPanel, AppError>> {
    const respuesta = await this.api.get<SeriesDto>('/admin/dashboard/series');
    return mapea(respuesta, (dto) => ({
      pedidosPorDia: dto.ordersByDay ?? {},
      gmvCentimosPorDia: dto.gmvCentsByDay ?? {},
    }));
  }
}
