import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { mapeaError } from '@core/http/mapea-error';
import { Result, exito, fallo, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AvanceDeHoja,
  CompraAProveedor,
  EstadoDeCompra,
  LineaDeCompra,
} from '../../domain/logistica/model/compra';
import {
  AvanceDeCompraPort,
  ComprasPort,
  DatosDeCompraHecha,
  DatosDeEnvioDelProveedor,
  DatosDeReempaquetado,
  HojaDeEmpaquetadoPort,
} from '../../domain/logistica/port/compras.port';

interface LineaDto {
  orderItemId: string;
  title?: string;
  titleZh?: string;
  variantName?: string;
  imageUrl?: string;
  sourceUrl?: string;
  quantity?: number;
}

interface CompraDto {
  id: string;
  orderId: string;
  orderNumber?: string;
  status: string;
  supplierName?: string;
  warehouseAddress?: string;
  expectedCostCnyFormatted?: string;
  realCostCnyFormatted?: string;
  costVarianceCnyFormatted?: string;
  overBudget?: boolean;
  realMarginFormatted?: string;
  realMarginPct?: number;
  domesticTracking?: string;
  exportedAt?: string;
  daysInWarehouse?: number;
  suggestedServiceType?: string;
  items?: LineaDto[];
}

interface AvanceDto {
  exportable?: number;
  issues?: { orderId: string; orderNumber: string; reason: string }[];
}

function aLinea(dto: LineaDto): LineaDeCompra {
  return {
    lineaDePedidoId: dto.orderItemId,
    titulo: dto.title ?? '',
    tituloZh: dto.titleZh,
    variante: dto.variantName,
    imagenUrl: dto.imageUrl,
    origenUrl: dto.sourceUrl,
    cantidad: dto.quantity ?? 0,
  };
}

function aCompra(dto: CompraDto): CompraAProveedor {
  return {
    id: dto.id,
    pedidoId: dto.orderId,
    numeroDePedido: dto.orderNumber,
    estado: dto.status as EstadoDeCompra,
    proveedor: dto.supplierName,
    direccionDeAlmacen: dto.warehouseAddress,
    costeEsperadoFormateado: dto.expectedCostCnyFormatted,
    costeRealFormateado: dto.realCostCnyFormatted,
    desviacionFormateada: dto.costVarianceCnyFormatted,
    fueraDePresupuesto: dto.overBudget,
    margenRealFormateado: dto.realMarginFormatted,
    margenRealPorcentaje: dto.realMarginPct,
    seguimientoDomestico: dto.domesticTracking,
    exportadoEl: dto.exportedAt,
    diasEnAlmacen: dto.daysInWarehouse,
    servicioSugerido: dto.suggestedServiceType,
    lineas: (dto.items ?? []).map(aLinea),
  };
}

/**
 * Las compras al proveedor contra nuestro backend.
 *
 * <p>La HOJA de re-empaquetado se pide como binario —es un fichero de hoja de cálculo— y por eso esa
 * llamada usa el cliente HTTP directamente. Su fallo se traduce con el mismo `mapeaError` que el resto,
 * para que hacia el dominio siga saliendo un `AppError`.
 */
@Injectable()
export class ComprasHttpAdapter implements ComprasPort, AvanceDeCompraPort, HojaDeEmpaquetadoPort {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  async cola(): Promise<Result<readonly CompraAProveedor[], AppError>> {
    const respuesta = await this.api.get<CompraDto[]>('/admin/purchases');
    return mapea(respuesta, (filas) => (filas ?? []).map(aCompra));
  }

  async marcaComprada(id: string, datos: DatosDeCompraHecha): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(`/admin/purchases/${id}/bought`, {
      purchaseRef: datos.referencia,
      costCny: datos.costeCny,
      shippingCny: datos.envioCny,
    });
    return mapea(respuesta, () => undefined);
  }

  async marcaEnviada(
    id: string,
    datos: DatosDeEnvioDelProveedor,
  ): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(`/admin/purchases/${id}/shipped`, {
      domesticTracking: datos.seguimiento,
      domesticCarrier: datos.transportista,
    });
    return mapea(respuesta, () => undefined);
  }

  async marcaRecibida(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<unknown>(`/admin/purchases/${id}/received`), () => undefined);
  }

  async marcaReempaquetada(
    id: string,
    datos: DatosDeReempaquetado,
  ): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(`/admin/purchases/${id}/packed`, {
      packOrderNo: datos.numeroDeOrden,
      serviceType: datos.tipoDeServicio,
    });
    return mapea(respuesta, () => undefined);
  }

  async anula(id: string, motivo?: string): Promise<Result<void, AppError>> {
    // El motivo viaja como parámetro de consulta, no en el cuerpo: es como lo espera el endpoint.
    const ruta = motivo
      ? `/admin/purchases/${id}/cancel?reason=${encodeURIComponent(motivo)}`
      : `/admin/purchases/${id}/cancel`;
    return mapea(await this.api.post<unknown>(ruta), () => undefined);
  }

  async reexporta(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<unknown>(`/admin/purchases/${id}/reexport`), () => undefined);
  }

  async avance(): Promise<Result<AvanceDeHoja, AppError>> {
    const respuesta = await this.api.get<AvanceDto>('/admin/purchases/pack-sheet/preview');
    return mapea(respuesta, (dto) => ({
      exportables: dto.exportable ?? 0,
      incidencias: (dto.issues ?? []).map((i) => ({
        pedidoId: i.orderId,
        numeroDePedido: i.orderNumber,
        motivo: i.reason,
      })),
    }));
  }

  async descarga(): Promise<Result<Blob, AppError>> {
    try {
      const blob = await firstValueFrom(
        this.http.post(
          `${this.config.apiBase}/api/admin/purchases/pack-sheet`,
          null,
          { responseType: 'blob' },
        ),
      );
      return exito(blob);
    } catch (error) {
      return fallo(mapeaError(error));
    }
  }
}
