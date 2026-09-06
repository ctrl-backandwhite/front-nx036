import { InjectionToken } from '@angular/core';

/**
 * El país que declara el equipo desde el que se mira.
 *
 * <p>Un método sin `Result` y sin promesa: no hay red detrás, es una lectura del navegador. Se declara
 * como puerto igualmente porque el DOMINIO decide con este dato qué régimen de cookies aplica, y una
 * regla no puede depender de `navigator` — ni podría probarse sin fingir un navegador entero.
 *
 * <p>Devuelve cadena vacía cuando no se sabe. Es lo normal: un navegador configurado como «es» a secas
 * —de lo más común— no da región. Ese vacío cae en el régimen por defecto, y por eso el régimen decide
 * QUÉ texto se enseña y nunca qué cookies se encienden.
 */
export interface PaisDelDispositivoPort {
  codigo(): string;
}

export const PAIS_DEL_DISPOSITIVO_PORT = new InjectionToken<PaisDelDispositivoPort>(
  'PaisDelDispositivoPort',
);
