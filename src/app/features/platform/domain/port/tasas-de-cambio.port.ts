import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { TasaDeCambio } from '../model/tasa-de-cambio';

/**
 * La tabla de cambio del día.
 *
 * <p>Puerto PROVISIONAL y consciente: el catálogo de divisas de la aplicación es transversal y su sitio
 * es `core/`, donde otro equipo lo está portando. Mientras no exista, estas pantallas necesitan
 * convertir un presupuesto a dólares y pintar precios que el backend guarda en dólares o en yuanes.
 *
 * <p>La salida es la que rige el proyecto: se declara aquí lo mínimo —código y tasa— en vez de copiar
 * el almacén de divisas entero. Cuando `core` publique el suyo, se borra este puerto, se borra su
 * adaptador y las pantallas no se enteran, porque solo conocen esta interfaz.
 */
export interface TasasDeCambioPort {
  consulta(): Promise<Result<readonly TasaDeCambio[], AppError>>;
}

export const TASAS_DE_CAMBIO_PORT = new InjectionToken<TasasDeCambioPort>('TasasDeCambioPort');
