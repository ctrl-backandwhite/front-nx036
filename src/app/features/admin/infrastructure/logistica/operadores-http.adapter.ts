import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  FilaDeReporte,
  OperacionDeOperador,
  PaginaDeOperaciones,
  RangoDeFechas,
  ResumenDeGanancias,
} from '../../domain/logistica/model/operador';
import {
  MisGananciasPort,
  ReporteDeOperadoresPort,
} from '../../domain/logistica/port/operadores.port';

interface ResumenDto {
  operatorSubject: string;
  operatorEmail?: string;
  operatorName?: string;
  operations?: number;
  totalCommissionCnyCents?: number;
  from?: string;
  to?: string;
}

interface OperacionDto {
  operatorSubject: string;
  operatorEmail?: string;
  operatorName?: string;
  orderId: string;
  orderNumber: string;
  commissionCnyCents?: number;
  itemCount?: number;
  processedAt: string;
}

interface PaginaDto {
  items?: OperacionDto[];
  total?: number;
  page?: number;
  size?: number;
}

function aOperacion(dto: OperacionDto): OperacionDeOperador {
  return {
    operador: dto.operatorSubject,
    email: dto.operatorEmail,
    nombre: dto.operatorName,
    pedidoId: dto.orderId,
    numeroDePedido: dto.orderNumber,
    comisionCentimosCny: dto.commissionCnyCents ?? 0,
    articulos: dto.itemCount ?? 0,
    procesadoEl: dto.processedAt,
  };
}

/**
 * Las ganancias del propio operador y el reporte de administración.
 *
 * <p>Dos puertos y un adaptador: son dos permisos distintos en el backend —uno ve lo suyo, el otro el de
 * todos— pero el mismo cliente los resuelve. Los IMPORTES llegan en céntimos de yuan y así se guardan:
 * la comisión se devenga sobre el desembolso al proveedor, y convertirla a otra divisa aquí exigiría
 * una tasa que el navegador no conoce.
 */
@Injectable()
export class OperadoresHttpAdapter implements MisGananciasPort, ReporteDeOperadoresPort {
  private readonly api = inject(ApiService);

  async resumen(rango: RangoDeFechas): Promise<Result<ResumenDeGanancias, AppError>> {
    const respuesta = await this.api.get<ResumenDto>('/admin/operator/earnings', {
      from: rango.desde,
      to: rango.hasta,
    });
    return mapea(respuesta, (dto) => ({
      operador: dto.operatorSubject,
      email: dto.operatorEmail,
      nombre: dto.operatorName,
      operaciones: dto.operations ?? 0,
      comisionCentimosCny: dto.totalCommissionCnyCents ?? 0,
      desde: dto.from ?? rango.desde,
      hasta: dto.to ?? rango.hasta,
    }));
  }

  async historico(
    rango: RangoDeFechas,
    pagina: number,
    tamano: number,
  ): Promise<Result<PaginaDeOperaciones, AppError>> {
    const respuesta = await this.api.get<PaginaDto>('/admin/operator/history', {
      from: rango.desde,
      to: rango.hasta,
      page: pagina,
      size: tamano,
    });
    return mapea(respuesta, (dto) => ({
      operaciones: (dto.items ?? []).map(aOperacion),
      total: dto.total ?? 0,
      pagina: dto.page ?? pagina,
      tamano: dto.size ?? tamano,
    }));
  }

  async reporte(rango: RangoDeFechas): Promise<Result<readonly FilaDeReporte[], AppError>> {
    const respuesta = await this.api.get<ResumenDto[]>('/admin/operators/report', {
      from: rango.desde,
      to: rango.hasta,
    });
    return mapea(respuesta, (filas) =>
      (filas ?? []).map((f) => ({
        operador: f.operatorSubject,
        email: f.operatorEmail,
        nombre: f.operatorName,
        operaciones: f.operations ?? 0,
        comisionCentimosCny: f.totalCommissionCnyCents ?? 0,
      })),
    );
  }

  async reindexa(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ indexed: number }>('/admin/operators/reindex');
    return mapea(respuesta, (r) => r.indexed ?? 0);
  }
}
