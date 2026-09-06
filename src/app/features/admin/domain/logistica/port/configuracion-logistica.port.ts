import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { LimiteDeTransportista } from '../model/limite-transportista';
import { Almacen, DatosDeAlmacen } from '../model/almacen';
import { DatosDeImpuesto, DatosDeRegion, ImpuestoDePais, RegionFiscal } from '../model/impuesto';
import { EstadoDeCumplimiento, OperadorEconomico, PapelDeOperador } from '../model/cumplimiento';

/**
 * Los límites del transportista.
 *
 * <p>Alta y edición son la MISMA operación: la clave es canal+país, así que guardar una fila que ya
 * existe la sustituye. Tener dos métodos obligaría a la pantalla a saber si la fila existía, que es
 * justo lo que no puede saber sin volver a leer.
 */
export interface LimitesDeTransportistaPort {
  lista(): Promise<Result<readonly LimiteDeTransportista[], AppError>>;
  guarda(limite: LimiteDeTransportista): Promise<Result<void, AppError>>;
  borra(canal: string, pais: string): Promise<Result<void, AppError>>;
}

export const LIMITES_DE_TRANSPORTISTA_PORT = new InjectionToken<LimitesDeTransportistaPort>(
  'LimitesDeTransportistaPort',
);

export interface AlmacenesAdminPort {
  lista(): Promise<Result<readonly Almacen[], AppError>>;
  crea(datos: DatosDeAlmacen): Promise<Result<void, AppError>>;
  actualiza(id: string, datos: DatosDeAlmacen): Promise<Result<void, AppError>>;
  borra(id: string): Promise<Result<void, AppError>>;
}

export const ALMACENES_ADMIN_PORT = new InjectionToken<AlmacenesAdminPort>('AlmacenesAdminPort');

/**
 * Los impuestos por destino.
 *
 * <p>Las regiones son otra capacidad —solo se abren para un país concreto— pero comparten puerto porque
 * son el mismo sujeto configurado a dos niveles: quien edita uno edita el otro en la misma pantalla, y
 * partirlo obligaría a inyectar dos puertos para una sola tabla.
 */
export interface ImpuestosPort {
  lista(): Promise<Result<readonly ImpuestoDePais[], AppError>>;
  guarda(datos: DatosDeImpuesto): Promise<Result<void, AppError>>;
  borra(pais: string): Promise<Result<void, AppError>>;
  regiones(pais: string): Promise<Result<readonly RegionFiscal[], AppError>>;
  guardaRegion(pais: string, datos: DatosDeRegion): Promise<Result<void, AppError>>;
  borraRegion(pais: string, codigo: string): Promise<Result<void, AppError>>;
}

export const IMPUESTOS_PORT = new InjectionToken<ImpuestosPort>('ImpuestosPort');

/**
 * El operador económico de la UE y el estado del catálogo.
 *
 * <p>El idioma viaja en cada llamada porque el backend traduce la figura del art. 4.2: cambiar de
 * idioma tiene que refrescar los DATOS, no solo las etiquetas de la pantalla.
 */
export interface CumplimientoPort {
  operador(idioma: string): Promise<Result<OperadorEconomico | null, AppError>>;
  guardaOperador(operador: OperadorEconomico, idioma: string): Promise<Result<void, AppError>>;
  papeles(idioma: string): Promise<Result<readonly PapelDeOperador[], AppError>>;
  estado(idioma: string): Promise<Result<EstadoDeCumplimiento, AppError>>;
}

export const CUMPLIMIENTO_PORT = new InjectionToken<CumplimientoPort>('CumplimientoPort');
