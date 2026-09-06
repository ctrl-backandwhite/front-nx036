import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import { Divisa } from '../../domain/catalogo/model/divisa';
import {
  IdiomaDeTienda,
  IdiomasDeTiendaPort,
  TasasDeCambioPort,
} from '../../domain/catalogo/port/catalogo-comun.port';

interface IdiomaDto {
  id: string;
  code: string;
  label?: string;
  active?: boolean;
  isDefault?: boolean;
}

interface DivisaDto {
  code: string;
  rateVsUsd?: number;
}

/**
 * Los dos datos de apoyo que el catálogo pide en casi todas sus pantallas: qué idiomas hay y a cuánto
 * está cada moneda.
 *
 * <p>Van en un adaptador común porque no pertenecen a ninguna pantalla en particular y separarlos en
 * dos clases de diez líneas solo añadiría ficheros.
 */
@Injectable()
export class CatalogoComunHttpAdapter implements IdiomasDeTiendaPort, TasasDeCambioPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly IdiomaDeTienda[], AppError>> {
    const respuesta = await this.api.get<IdiomaDto[]>('/admin/languages');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        codigo: dto.code,
        etiqueta: dto.label ?? dto.code.toUpperCase(),
        activo: dto.active !== false,
        porDefecto: !!dto.isDefault,
      })),
    );
  }

  async listaDivisas(): Promise<Result<readonly Divisa[], AppError>> {
    const respuesta = await this.api.get<DivisaDto[]>('/admin/currency/all');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({ codigo: dto.code, porDolar: Number(dto.rateVsUsd ?? 1) })),
    );
  }
}
