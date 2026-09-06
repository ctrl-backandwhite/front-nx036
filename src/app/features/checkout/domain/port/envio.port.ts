import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CotizacionDeEnvio, PaisDeEnvio, RegionDeEnvio } from '../model/cotizacion-de-envio';
import { ItemDelPedido } from '../model/pedido';

/** Lo que hay que decirle al servidor para que cotice. */
export interface PeticionDeEnvio {
  readonly pais: string;
  readonly region?: string;
  readonly items: readonly ItemDelPedido[];
  readonly codigoDeCupon?: string;
  readonly opcionDeEnvio?: string;
}

/**
 * Cuánto cuesta llevar esta cesta a ese destino, con su impuesto y su arancel.
 *
 * <p>Una sola capacidad: cotizar. El cupón y la forma de envío entran en la MISMA petición porque los dos
 * cambian el total —el envío forma parte de la base del impuesto—, y pedirlos por separado obligaría al
 * navegador a recomponer un total, que es justo lo que no puede hacer.
 */
export interface EnvioPort {
  cotiza(peticion: PeticionDeEnvio): Promise<Result<CotizacionDeEnvio, AppError>>;
}

export const ENVIO_PORT = new InjectionToken<EnvioPort>('EnvioPort');

/** Adónde se puede enviar. Es otra capacidad: la consulta el escaparate, que no cotiza nada. */
export interface CoberturaDeEnvioPort {
  paises(): Promise<Result<readonly PaisDeEnvio[], AppError>>;
  regiones(pais: string): Promise<Result<readonly RegionDeEnvio[], AppError>>;
}

export const COBERTURA_DE_ENVIO_PORT = new InjectionToken<CoberturaDeEnvioPort>(
  'CoberturaDeEnvioPort',
);
