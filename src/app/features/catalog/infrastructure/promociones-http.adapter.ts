import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PromocionesPort } from '../domain/port/promociones.port';
import { PromocionViva } from '../domain/model/catalogo-auxiliar';
import { ResumenDto, aResumen } from './producto.dto';

interface PromocionDto {
  id: string;
  name: string;
  percentOff?: number;
  endsAt?: string;
  products?: ResumenDto[];
}

@Injectable()
export class PromocionesHttpAdapter implements PromocionesPort {
  private readonly api = inject(ApiService);
  private readonly preferencias = inject(PreferenciasService);

  async vivas(): Promise<Result<readonly PromocionViva[], AppError>> {
    const respuesta = await this.api.get<PromocionDto[]>('/catalog/promotions/live', {
      lang: this.preferencias.idioma(),
    });
    return mapea(respuesta, (lista) =>
      lista
        // Sin porcentaje no hay nada que anunciar: el cartel diría «hasta −undefined %».
        .filter((promocion) => !!promocion.percentOff)
        .map((promocion) => ({
          id: promocion.id,
          nombre: promocion.name,
          porcentaje: promocion.percentOff,
          terminaEl: promocion.endsAt,
          productos: (promocion.products ?? []).map(aResumen),
        })),
    );
  }
}
