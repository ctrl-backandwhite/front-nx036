import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  ALTA_DE_CUENTA_PORT,
  AUTENTICACION_PORT,
  USUARIO_ACTUAL_PORT,
} from './domain/port/autenticacion.port';
import { AutenticacionHttpAdapter } from './infrastructure/autenticacion-http.adapter';
import { RESUMEN_DE_ALMACENES_PORT } from './domain/port/resumen-de-almacenes.port';
import { ResumenDeAlmacenesHttpAdapter } from './infrastructure/resumen-de-almacenes-http.adapter';

/**
 * Ata los puertos de «auth» con sus adaptadores.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura. Todo lo demás —casos de
 * uso, estado, pantallas— solo conoce las interfaces, así que cambiar de proveedor de identidad, o poner
 * un doble en una prueba, es cambiar estas líneas y nada más.
 */
export function proveeAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    AutenticacionHttpAdapter,
    { provide: AUTENTICACION_PORT, useFactory: () => inject(AutenticacionHttpAdapter) },
    { provide: ALTA_DE_CUENTA_PORT, useFactory: () => inject(AutenticacionHttpAdapter) },
    { provide: USUARIO_ACTUAL_PORT, useFactory: () => inject(AutenticacionHttpAdapter) },
    ResumenDeAlmacenesHttpAdapter,
    { provide: RESUMEN_DE_ALMACENES_PORT, useFactory: () => inject(ResumenDeAlmacenesHttpAdapter) },
  ]);
}
