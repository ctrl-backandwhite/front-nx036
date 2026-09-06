import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AnaliticaDeProductoPort } from '../domain/port/analitica-de-producto.port';
import { EstimacionDeMargen, PuntoDeHistorico } from '../domain/model/catalogo-auxiliar';

interface PuntoDto {
  date: string;
  price: number;
  stock: number;
}

interface MargenDto {
  cost: number;
  suggestedRetail: number;
  shipping: number;
  commission: number;
  netProfit: number;
  marginPct: number;
  currency?: string;
  appliedMarginPct?: number;
  appliedTierMinQty?: number;
}

@Injectable()
export class AnaliticaHttpAdapter implements AnaliticaDeProductoPort {
  private readonly api = inject(ApiService);

  async historicoDePrecios(
    idDelProducto: string,
    dias: number,
  ): Promise<Result<readonly PuntoDeHistorico[], AppError>> {
    const respuesta = await this.api.get<PuntoDto[]>(
      `/catalog/products/${idDelProducto}/price-history`,
      { days: dias },
    );
    return mapea(respuesta, (lista) =>
      lista.map((p) => ({ fecha: p.date, precio: Number(p.price), existencias: p.stock })),
    );
  }

  async estimacionDeMargen(
    idDelProducto: string,
    pais: string,
    cantidad: number,
  ): Promise<Result<EstimacionDeMargen, AppError>> {
    const respuesta = await this.api.get<MargenDto>(
      `/catalog/products/${idDelProducto}/margin-estimate`,
      { country: pais, quantity: cantidad },
    );
    // El backend ya devuelve los importes en la moneda activa usando el tramo real y la regla de
    // margen configurada: aquí no se reconvierte nada, solo se renombra.
    return mapea(respuesta, (dto) => ({
      coste: Number(dto.cost),
      precioSugerido: Number(dto.suggestedRetail),
      envio: Number(dto.shipping),
      comision: Number(dto.commission),
      beneficio: Number(dto.netProfit),
      margenPorcentaje: Number(dto.marginPct),
      divisa: dto.currency || 'USD',
      reglaAplicadaPorcentaje: dto.appliedMarginPct,
      tramoAplicadoDesde: dto.appliedTierMinQty,
    }));
  }
}
