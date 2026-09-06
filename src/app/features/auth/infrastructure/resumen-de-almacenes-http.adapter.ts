import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  ResumenDeAlmacenes,
  ResumenDeAlmacenesPort,
} from '../domain/port/resumen-de-almacenes.port';

interface AlmacenDto {
  country?: string;
}

@Injectable()
export class ResumenDeAlmacenesHttpAdapter implements ResumenDeAlmacenesPort {
  private readonly api = inject(ApiService);

  async consulta(): Promise<Result<ResumenDeAlmacenes, AppError>> {
    const respuesta = await this.api.get<AlmacenDto[]>('/warehouses');
    return mapea(respuesta, (lista) => ({
      cuantos: lista.length,
      paises: [...new Set(lista.map((a) => a.country).filter((p): p is string => !!p))],
    }));
  }
}
