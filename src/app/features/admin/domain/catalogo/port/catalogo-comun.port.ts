import { InjectionToken } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { Divisa } from '../model/divisa';

/** Un idioma de la tienda, tal como se administra en el registro de idiomas. */
export interface IdiomaDeTienda {
  readonly codigo: string;
  readonly etiqueta: string;
  readonly activo: boolean;
  readonly porDefecto: boolean;
}

/**
 * Los idiomas configurados.
 *
 * <p>La lista es ILIMITADA y se administra desde el panel, así que no puede escribirse aquí: el
 * selector de idioma de la ficha y el alta de producto la piden en cada carga.
 */
export interface IdiomasDeTiendaPort {
  lista(): Promise<Result<readonly IdiomaDeTienda[], AppError>>;
}

export const IDIOMAS_DE_TIENDA_PORT = new InjectionToken<IdiomasDeTiendaPort>('IdiomasDeTiendaPort');

/**
 * Las tasas de cambio, solo para poder enseñar el COSTE de origen en la moneda de quien administra.
 *
 * <p>No calcula precios de venta: el margen, el arancel y el IVA los aplica el backend. El día que
 * exista un servicio de divisas compartido, este puerto desaparece.
 */
export interface TasasDeCambioPort {
  /** Se llama `listaDivisas` y no `lista` para poder convivir con el de idiomas en un mismo adaptador. */
  listaDivisas(): Promise<Result<readonly Divisa[], AppError>>;
}

export const TASAS_DE_CAMBIO_PORT = new InjectionToken<TasasDeCambioPort>('TasasDeCambioPort');
