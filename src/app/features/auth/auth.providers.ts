import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  ALTA_DE_CUENTA_PORT,
  AUTENTICACION_PORT,
  USUARIO_ACTUAL_PORT,
} from './domain/port/autenticacion.port';
import { AutenticacionHttpAdapter } from './infrastructure/autenticacion-http.adapter';
import { RESUMEN_DE_ALMACENES_PORT } from './domain/port/resumen-de-almacenes.port';
import { ResumenDeAlmacenesHttpAdapter } from './infrastructure/resumen-de-almacenes-http.adapter';
import { RESTABLECE_CONTRASENA_PORT } from './domain/port/restablece-contrasena.port';
import { RestableceContrasenaHttpAdapter } from './infrastructure/restablece-contrasena-http.adapter';
import {
  DIVISAS_ACTIVAS_PORT,
  GEOLOCALIZACION_PORT,
  PAISES_DE_ENVIO_PORT,
} from './domain/port/datos-del-alta.port';
import { DatosDelAltaHttpAdapter } from './infrastructure/datos-del-alta-http.adapter';
import { DESTINO_TRAS_ACCESO_PORT } from './domain/port/destino-tras-acceso.port';
import { DestinoTrasAccesoSesionAdapter } from './infrastructure/destino-tras-acceso-sesion.adapter';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { RecuperaSesion } from './application/use-case/recupera-sesion.use-case';

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

    RestableceContrasenaHttpAdapter,
    { provide: RESTABLECE_CONTRASENA_PORT, useFactory: () => inject(RestableceContrasenaHttpAdapter) },

    // Un solo adaptador para los tres datos de apoyo del alta: los tres son una consulta de una sola
    // llamada y partirlo en tres clases idénticas solo añadiría ficheros. Quien los consume sigue
    // viendo tres contratos pequeños.
    DatosDelAltaHttpAdapter,
    { provide: PAISES_DE_ENVIO_PORT, useFactory: () => inject(DatosDelAltaHttpAdapter) },
    { provide: DIVISAS_ACTIVAS_PORT, useFactory: () => inject(DatosDelAltaHttpAdapter) },
    { provide: GEOLOCALIZACION_PORT, useFactory: () => inject(DatosDelAltaHttpAdapter) },

    DestinoTrasAccesoSesionAdapter,
    { provide: DESTINO_TRAS_ACCESO_PORT, useFactory: () => inject(DestinoTrasAccesoSesionAdapter) },

    // El cable que cierra el guardián del núcleo: él declara el contrato y «auth» pone la única
    // implementación que sabe pedirle la cuenta al backend. Sin esta línea, cualquier ruta protegida
    // de cualquier contexto se quedaría sin poder averiguar quién mira.
    { provide: RECUPERADOR_DE_SESION, useFactory: () => inject(RecuperaSesion) },
  ]);
}
