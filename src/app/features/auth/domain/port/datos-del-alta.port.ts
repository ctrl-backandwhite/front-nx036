import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Los tres datos que el formulario de alta necesita de FUERA de «auth», cada uno en su puerto.
 *
 * <p>Ninguno es del contexto de acceso: los países salen del catálogo de envíos, las divisas de la
 * configuración de la tienda y el país del visitante de la geolocalización del borde. Pero «auth» no
 * quiere ninguno de esos catálogos enteros —quiere una lista de pares para un desplegable, un número
 * para un rótulo y dos letras—, así que declara lo que de verdad usa y su adaptador resuelve contra el
 * mismo sitio. Es lo mismo que ya hace `ResumenDeAlmacenesPort` con los almacenes, y por el mismo
 * motivo: depender del puerto grande de otro contexto ataría esta pantalla a cada cambio de aquel.
 */
export interface PaisDeEnvio {
  readonly codigo: string;
  readonly nombre: string;
}

/** Adónde se puede enviar de verdad. Es la lista que puede elegirse al registrarse. */
export interface PaisesDeEnvioPort {
  consulta(): Promise<Result<readonly PaisDeEnvio[], AppError>>;
}

export const PAISES_DE_ENVIO_PORT = new InjectionToken<PaisesDeEnvioPort>('PaisesDeEnvioPort');

/** Cuántas divisas hay activas ahora mismo. Solo se usa para una cifra del panel de marca. */
export interface DivisasActivasPort {
  cuantas(): Promise<Result<number, AppError>>;
}

export const DIVISAS_ACTIVAS_PORT = new InjectionToken<DivisasActivasPort>('DivisasActivasPort');

/**
 * De qué país llega quien mira, según la cabecera que pone el CDN.
 *
 * <p>Sirve para PRESELECCIONAR el país en el alta, nada más. El país que decide el margen es el que
 * quede guardado en la cuenta, y este solo propone un valor que se puede cambiar.
 */
export interface GeolocalizacionPort {
  paisDelVisitante(): Promise<Result<string | null, AppError>>;
}

export const GEOLOCALIZACION_PORT = new InjectionToken<GeolocalizacionPort>('GeolocalizacionPort');
