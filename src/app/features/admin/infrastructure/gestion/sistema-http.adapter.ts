import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Divisa } from '../../domain/gestion/model/dinero';
import { BorradorDeIdioma, IdiomaDeTienda } from '../../domain/gestion/model/sistema';
import { IdiomasPort, MonedasPort } from '../../domain/gestion/port/sistema.port';
import { DivisaDto, aDivisa } from './tipos-de-cambio-http.adapter';
import { sinCuerpo } from './sin-cuerpo';

interface IdiomaDto {
  id: string;
  code: string;
  label?: string;
  flag?: string;
  position?: number;
  active?: boolean;
  isDefault?: boolean;
}

@Injectable()
export class IdiomasHttpAdapter implements IdiomasPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly IdiomaDeTienda[], AppError>> {
    const respuesta = await this.api.get<IdiomaDto[]>('/admin/languages');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        codigo: dto.code,
        etiqueta: dto.label ?? dto.code.toUpperCase(),
        posicion: dto.position ?? 0,
        activo: dto.active ?? false,
        porDefecto: dto.isDefault ?? false,
        ...(dto.flag ? { bandera: dto.flag } : {}),
      })),
    );
  }

  guarda(idioma: BorradorDeIdioma): Promise<Result<void, AppError>> {
    return sinCuerpo(
      this.api.post('/admin/languages', {
        code: idioma.codigo,
        label: idioma.etiqueta,
        flag: idioma.bandera,
        position: idioma.posicion,
        active: idioma.activo,
        isDefault: idioma.porDefecto,
      }),
    );
  }

  borra(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.delete(`/admin/languages/${id}`));
  }
}

/**
 * El registro de divisas, por la superficie de ADMINISTRACIÓN.
 *
 * <p>Trae también las apagadas —que es justo lo que hay que administrar—, a diferencia del endpoint
 * público que consulta `TiposDeCambioHttpAdapter` para poder formatear importes.
 */
@Injectable()
export class MonedasHttpAdapter implements MonedasPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly Divisa[], AppError>> {
    const respuesta = await this.api.get<DivisaDto[]>('/admin/currency/all');
    return mapea(respuesta, (lista) => (lista ?? []).map(aDivisa));
  }

  async sincroniza(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ updated?: number }>('/admin/currency/sync');
    return mapea(respuesta, (dto) => dto?.updated ?? 0);
  }

  activa(codigo: string, activa: boolean): Promise<Result<void, AppError>> {
    // El estado va como parámetro de consulta y el cuerpo vacío: así lo espera el backend.
    return sinCuerpo(this.api.put(`/admin/currency/${codigo}/active?active=${activa}`));
  }

  activaEnLote(codigos: readonly string[], activa: boolean): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.put('/admin/currency/bulk-active', { codes: codigos, active: activa }));
  }
}
