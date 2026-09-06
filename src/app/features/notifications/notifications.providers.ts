import { EnvironmentProviders, Provider, inject, makeEnvironmentProviders } from '@angular/core';
import {
  BUZON_PORT,
  DIFUSION_DE_AVISOS_PORT,
  GESTION_DE_AVISOS_PORT,
} from './domain/port/avisos.port';
import { AvisosHttpAdapter, DifusionHttpAdapter } from './infrastructure/avisos-http.adapter';
import { BOLETIN_PORT, PREFERENCIAS_DE_CORREO_PORT } from './domain/port/boletin.port';
import { BoletinHttpAdapter } from './infrastructure/boletin-http.adapter';

/**
 * Ata los puertos de «notifications» con sus adaptadores.
 *
 * <p>Va como LISTA además de como proveedores de entorno porque el interruptor de preferencias de
 * correo se provee a sí mismo: se compone dentro de la página de otro contexto, donde no hay una ruta
 * de «notifications» de la que colgar nada.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura. Todo lo demás —casos de
 * uso, estado, pantallas— solo conoce las interfaces, así que cambiar de origen, o poner un doble en una
 * prueba, es cambiar estas líneas y nada más.
 */
export const PROVEEDORES_NOTIFICATIONS: Provider[] = [
  AvisosHttpAdapter,
  { provide: BUZON_PORT, useFactory: () => inject(AvisosHttpAdapter) },
  { provide: GESTION_DE_AVISOS_PORT, useFactory: () => inject(AvisosHttpAdapter) },

  DifusionHttpAdapter,
  { provide: DIFUSION_DE_AVISOS_PORT, useFactory: () => inject(DifusionHttpAdapter) },

  BoletinHttpAdapter,
  { provide: BOLETIN_PORT, useFactory: () => inject(BoletinHttpAdapter) },
  { provide: PREFERENCIAS_DE_CORREO_PORT, useFactory: () => inject(BoletinHttpAdapter) },
];

/** Para colgar de una ruta, que es como se registran los contextos. */
export function proveeNotifications(): EnvironmentProviders {
  return makeEnvironmentProviders(PROVEEDORES_NOTIFICATIONS);
}
