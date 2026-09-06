import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  CotizacionDeEnvio,
  OpcionDeEnvio,
  PaisDeEnvio,
  RegionDeEnvio,
} from '../domain/model/cotizacion-de-envio';
import { CoberturaDeEnvioPort, EnvioPort, PeticionDeEnvio } from '../domain/port/envio.port';

interface OpcionDto {
  code: string;
  amountUsdCents: number;
  amountFormatted: string;
  carrierName?: string;
  etaMinDays: number;
  etaMaxDays: number;
}

interface CotizacionDto {
  supported: boolean;
  shippingFormatted?: string;
  shippingBaseFormatted?: string;
  shippingNetFormatted?: string;
  shippingSubsidyFormatted?: string;
  shippingSubsidyPercent?: number;
  freeShipping?: boolean;
  customsHandlingFormatted?: string;
  customsHandlingUsdCents?: number;
  customsSubsidyFormatted?: string;
  customsSubsidyPercent?: number;
  customsNetFormatted?: string;
  taxFormatted?: string;
  taxRateBps?: number;
  totalFormatted?: string;
  totalUsdCents?: number;
  discountCents?: number;
  discountFormatted?: string;
  customsThresholdExceeded?: boolean;
  customsBlocked?: boolean;
  customsLimit?: string;
  etaMinDays?: number;
  etaMaxDays?: number;
  couponCode?: string;
  couponError?: string;
  options?: OpcionDto[];
  selectedShippingOptionCode?: string;
}

function aOpcion(dto: OpcionDto): OpcionDeEnvio {
  return {
    codigo: dto.code,
    importeParaComparar: dto.amountUsdCents,
    importeFormateado: dto.amountFormatted,
    transportista: dto.carrierName,
    diasMinimos: dto.etaMinDays,
    diasMaximos: dto.etaMaxDays,
  };
}

/**
 * La cotización de envío contra nuestro backend.
 *
 * <p>Se manda el destino, la cesta, el cupón y la forma de envío EN UNA sola petición, y vuelve el
 * desglose entero ya escrito. Es lo que hace que el total del pago sea el total que se cobra.
 */
@Injectable()
export class EnvioHttpAdapter implements EnvioPort {
  private readonly api = inject(ApiService);

  async cotiza(peticion: PeticionDeEnvio): Promise<Result<CotizacionDeEnvio, AppError>> {
    const respuesta = await this.api.post<CotizacionDto>('/shipping/quote', {
      country: peticion.pais,
      region: peticion.region || undefined,
      items: peticion.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: item.cantidad,
      })),
      couponCode: peticion.codigoDeCupon || undefined,
      shippingOptionCode: peticion.opcionDeEnvio || undefined,
    });
    return mapea(respuesta, (dto) => ({
      cubierto: dto.supported === true,
      envioFormateado: dto.shippingFormatted,
      envioBaseFormateado: dto.shippingBaseFormatted,
      envioNetoFormateado: dto.shippingNetFormatted,
      subvencionDeEnvioFormateada: dto.shippingSubsidyFormatted,
      subvencionDeEnvioPorciento: dto.shippingSubsidyPercent,
      envioGratis: dto.freeShipping,
      recargoDeAduanaFormateado: dto.customsHandlingFormatted,
      recargoDeAduanaCentimos: dto.customsHandlingUsdCents,
      subvencionDeAranceLFormateada: dto.customsSubsidyFormatted,
      subvencionDeArancelPorciento: dto.customsSubsidyPercent,
      aranceLNetoFormateado: dto.customsNetFormatted,
      impuestoFormateado: dto.taxFormatted,
      impuestoPuntosBasicos: dto.taxRateBps,
      totalFormateado: dto.totalFormatted,
      totalCentimosUsd: dto.totalUsdCents,
      descuentoCentimos: dto.discountCents,
      descuentoFormateado: dto.discountFormatted,
      umbralDeAduanaSuperado: dto.customsThresholdExceeded,
      aduanaBloqueada: dto.customsBlocked,
      limiteDeAduana: dto.customsLimit,
      diasMinimos: dto.etaMinDays,
      diasMaximos: dto.etaMaxDays,
      codigoDeCupon: dto.couponCode,
      errorDeCupon: dto.couponError,
      opciones: (dto.options ?? []).map(aOpcion),
      opcionCotizada: dto.selectedShippingOptionCode,
    }));
  }
}

/** Adónde se puede enviar y qué provincias tiene cada país. */
@Injectable()
export class CoberturaDeEnvioHttpAdapter implements CoberturaDeEnvioPort {
  private readonly api = inject(ApiService);

  async paises(): Promise<Result<readonly PaisDeEnvio[], AppError>> {
    const respuesta = await this.api.get<{ countryCode: string; countryName: string }[]>(
      '/shipping/countries',
    );
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((pais) => ({ codigo: pais.countryCode, nombre: pais.countryName })),
    );
  }

  async regiones(pais: string): Promise<Result<readonly RegionDeEnvio[], AppError>> {
    const respuesta = await this.api.get<{ code: string; name: string }[]>('/shipping/regions', {
      country: pais,
    });
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((region) => ({ codigo: region.code, nombre: region.name })),
    );
  }
}
