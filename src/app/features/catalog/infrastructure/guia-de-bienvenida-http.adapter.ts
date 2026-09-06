import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  EjemplosDeGuia,
  GuiaDeBienvenidaPort,
  SimulacionDeGuia,
} from '../domain/port/guia-de-bienvenida.port';

interface EjemplosDto {
  examples?: {
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
    priceFormatted: string;
    weightGrams: number;
  }[];
  perArticleDutyFormatted?: string;
  orderLimitFormatted?: string;
}

interface SimulacionDto {
  subtotalFormatted: string;
  dutyFormatted: string;
  dutyLines: number;
  shippingFormatted: string;
  shippingSubsidyFormatted: string;
  shippingNetFormatted: string;
  customsSubsidyFormatted: string;
  customsNetFormatted: string;
  taxFormatted: string;
  totalFormatted: string;
  weightGrams: number;
  overLimit: boolean;
  orderLimitFormatted: string;
}

@Injectable()
export class GuiaDeBienvenidaHttpAdapter implements GuiaDeBienvenidaPort {
  private readonly api = inject(ApiService);
  private readonly preferencias = inject(PreferenciasService);

  async ejemplos(): Promise<Result<EjemplosDeGuia, AppError>> {
    const respuesta = await this.api.get<EjemplosDto>('/catalog/welcome/examples', {
      lang: this.preferencias.idioma(),
    });
    return mapea(respuesta, (dto) => ({
      ejemplos: (dto.examples ?? []).map((e) => ({
        id: e.id,
        slug: e.slug,
        titulo: e.title,
        imagen: e.imageUrl,
        precioFormateado: e.priceFormatted,
        pesoGramos: e.weightGrams,
      })),
      derechoPorPartidaFormateado: dto.perArticleDutyFormatted ?? '',
      topeDePedidoFormateado: dto.orderLimitFormatted ?? '',
    }));
  }

  async simula(
    lineas: readonly { readonly productId: string; readonly quantity: number }[],
  ): Promise<Result<SimulacionDeGuia, AppError>> {
    const respuesta = await this.api.post<SimulacionDto>('/catalog/welcome/simulate', [...lineas]);
    return mapea(respuesta, (dto) => ({
      subtotalFormateado: dto.subtotalFormatted,
      arancelFormateado: dto.dutyFormatted,
      partidas: dto.dutyLines,
      envioFormateado: dto.shippingFormatted,
      subsidioDeEnvioFormateado: dto.shippingSubsidyFormatted,
      envioNetoFormateado: dto.shippingNetFormatted,
      subsidioDeArancelFormateado: dto.customsSubsidyFormatted,
      arancelNetoFormateado: dto.customsNetFormatted,
      impuestoFormateado: dto.taxFormatted,
      totalFormateado: dto.totalFormatted,
      pesoGramos: dto.weightGrams,
      superaElTope: dto.overLimit,
      topeFormateado: dto.orderLimitFormatted,
    }));
  }
}
