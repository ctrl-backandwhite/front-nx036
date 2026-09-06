import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Los países a los que la tienda envía, tal como los enseña la portada.
 *
 * <p>Es un puerto PROPIO de «catalog» y no un préstamo del contexto de pago, aunque los dos pregunten
 * a la misma ruta del backend. El motivo no es de gusto: los puertos de «checkout» se registran en la
 * ruta de «checkout», así que desde la portada no existen —Angular reventaría con un «No provider
 * found»— y el aislamiento entre contextos prohíbe que una pantalla del catálogo entre en las tripas
 * de otro. Es la misma decisión que ya tomaron las cifras del sitio, y la misma que tiene «admin» con
 * su propio puerto del boletín.
 *
 * <p>Lo que el escaparate cuenta con esta lista es su ALCANCE: «se envía a noventa países». Que el pago
 * use la misma cobertura para decidir si una dirección es válida es problema suyo, y puede cambiar sin
 * arrastrar a la portada.
 */
export interface PaisDeEnvio {
  /** ISO-3166-1 alfa-2 en mayúsculas. De aquí sale la bandera. */
  readonly codigo: string;
  readonly nombre: string;
}

export interface PaisesDeEnvioPort {
  lista(): Promise<Result<readonly PaisDeEnvio[], AppError>>;
}

export const PAISES_DE_ENVIO_PORT = new InjectionToken<PaisesDeEnvioPort>('PaisesDeEnvioPort');
