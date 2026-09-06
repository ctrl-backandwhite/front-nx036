import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import { FiltroDeExportacion } from '../../domain/catalogo/model/exportacion';
import { FilaDeImportacion } from '../../domain/catalogo/model/importacion-masiva';
import {
  EstadoDeReindexado,
  ExportacionDeCatalogoPort,
  ImportacionDeCatalogoPort,
  ResultadoDeImportacion,
} from '../../domain/catalogo/port/transferencia-de-catalogo.port';

interface ImportacionDto {
  created: number;
  failed: number;
  errors?: string[];
}

interface ReindexadoDto {
  started?: boolean;
  running: boolean;
  indexed: number;
}

function aResultado(dto: ImportacionDto): ResultadoDeImportacion {
  return { creados: dto.created ?? 0, fallidos: dto.failed ?? 0, errores: dto.errors ?? [] };
}

function aEstado(dto: ReindexadoDto): EstadoDeReindexado {
  return { enMarcha: !!dto.running, indexados: dto.indexed ?? 0, arrancado: dto.started };
}

/**
 * La importación y la exportación del catálogo contra nuestro backend.
 *
 * <p>Las dos van juntas porque son la MISMA vía en los dos sentidos: lo que sale de un entorno tiene
 * que poder entrar en otro sin tocar nada, y ese contrato se rompe en cuanto una de las dos cambia de
 * formato por su cuenta.
 */
@Injectable()
export class TransferenciaDeCatalogoHttpAdapter
  implements ImportacionDeCatalogoPort, ExportacionDeCatalogoPort
{
  private readonly api = inject(ApiService);

  async importaProductos(
    filas: readonly FilaDeImportacion[],
  ): Promise<Result<ResultadoDeImportacion, AppError>> {
    const respuesta = await this.api.post<ImportacionDto>('/admin/catalog/products/bulk', filas);
    return mapea(respuesta, aResultado);
  }

  async importaCategorias(
    filas: readonly FilaDeImportacion[],
  ): Promise<Result<ResultadoDeImportacion, AppError>> {
    const respuesta = await this.api.post<ImportacionDto>('/admin/catalog/categories/bulk', filas);
    return mapea(respuesta, aResultado);
  }

  async reindexa(): Promise<Result<EstadoDeReindexado, AppError>> {
    const respuesta = await this.api.post<ReindexadoDto>('/admin/catalog/reindex');
    return mapea(respuesta, aEstado);
  }

  async estadoDeReindexado(): Promise<Result<EstadoDeReindexado, AppError>> {
    const respuesta = await this.api.get<ReindexadoDto>('/admin/catalog/reindex/status');
    return mapea(respuesta, aEstado);
  }

  async cuenta(filtro: FiltroDeExportacion): Promise<Result<number, AppError>> {
    const respuesta = await this.api.get<{ count: number }>(
      '/admin/catalog/products/export/count',
      {
        createdFrom: filtro.creadoDesde || undefined,
        createdTo: filtro.creadoHasta || undefined,
        verified: filtro.verificado,
      },
    );
    return mapea(respuesta, (cuerpo) => cuerpo.count ?? 0);
  }

  async exporta(
    desde: number,
    hasta: number,
    filtro: FiltroDeExportacion,
  ): Promise<Result<readonly FilaDeImportacion[], AppError>> {
    const respuesta = await this.api.get<FilaDeImportacion[]>('/admin/catalog/products/export', {
      from: desde,
      to: hasta,
      createdFrom: filtro.creadoDesde || undefined,
      createdTo: filtro.creadoHasta || undefined,
      verified: filtro.verificado,
    });
    return mapea(respuesta, (filas) => filas ?? []);
  }

  async exportaProducto(id: string): Promise<Result<FilaDeImportacion, AppError>> {
    return this.api.get<FilaDeImportacion>(
      `/admin/catalog/products/${encodeURIComponent(id)}/export`,
    );
  }
}
