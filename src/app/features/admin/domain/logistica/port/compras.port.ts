import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AvanceDeHoja, CompraAProveedor } from '../model/compra';

/** Lo que se manda al marcar una compra como hecha. Todo opcional: a veces se registra después. */
export interface DatosDeCompraHecha {
  readonly referencia?: string;
  readonly costeCny?: number;
  readonly envioCny?: number;
}

/**
 * El seguimiento doméstico es OBLIGATORIO: es el dato que dispara la guía internacional, y el almacén
 * empareja el bulto por coincidencia exacta.
 */
export interface DatosDeEnvioDelProveedor {
  readonly seguimiento: string;
  readonly transportista?: string;
}

export interface DatosDeReempaquetado {
  readonly numeroDeOrden?: string;
  readonly tipoDeServicio?: string;
}

/** Consultar la cola de compras al proveedor. */
export interface ComprasPort {
  cola(): Promise<Result<readonly CompraAProveedor[], AppError>>;
}

export const COMPRAS_PORT = new InjectionToken<ComprasPort>('ComprasPort');

/** Hacer avanzar una compra por el proceso. Cada paso es una escritura distinta en el backend. */
export interface AvanceDeCompraPort {
  marcaComprada(id: string, datos: DatosDeCompraHecha): Promise<Result<void, AppError>>;
  marcaEnviada(id: string, datos: DatosDeEnvioDelProveedor): Promise<Result<void, AppError>>;
  marcaRecibida(id: string): Promise<Result<void, AppError>>;
  marcaReempaquetada(id: string, datos: DatosDeReempaquetado): Promise<Result<void, AppError>>;
  anula(id: string, motivo?: string): Promise<Result<void, AppError>>;
  /** Devuelve una compra a la cola de exportación tras una descarga que no llegó a subirse. */
  reexporta(id: string): Promise<Result<void, AppError>>;
}

export const AVANCE_DE_COMPRA_PORT = new InjectionToken<AvanceDeCompraPort>('AvanceDeCompraPort');

/**
 * El fichero que se sube al sistema del almacén.
 *
 * <p>Descargarlo MARCA las compras como exportadas: es una escritura, no una lectura, y por eso la cola
 * hay que recargarla después. Sin ese registro, volver a exportarlas provoca el rechazo por duplicado
 * que tumba el fichero entero.
 */
export interface HojaDeEmpaquetadoPort {
  avance(): Promise<Result<AvanceDeHoja, AppError>>;
  descarga(): Promise<Result<Blob, AppError>>;
}

export const HOJA_DE_EMPAQUETADO_PORT = new InjectionToken<HojaDeEmpaquetadoPort>(
  'HojaDeEmpaquetadoPort',
);
