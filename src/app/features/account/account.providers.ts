import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  BAJA_DE_CUENTA_PORT,
  FIN_DE_SESION_PORT,
  PERFIL_PORT,
  PORTABILIDAD_PORT,
} from './domain/port/perfil.port';
import { AYUDA_DE_DIRECCION_PORT, DIRECCIONES_PORT } from './domain/port/direcciones.port';
import { METODOS_DE_PAGO_PORT, PASARELA_DE_TARJETA_PORT } from './domain/port/cobros.port';
import { FACTURAS_PORT, PLANES_PORT } from './domain/port/planes.port';
import {
  CODIGO_QR_PORT,
  DOBLE_FACTOR_PORT,
  SESIONES_ACTIVAS_PORT,
} from './domain/port/seguridad.port';
import { DESCARGA_PORT } from './domain/port/descarga.port';
import { PerfilHttpAdapter } from './infrastructure/perfil-http.adapter';
import { DireccionesHttpAdapter } from './infrastructure/direcciones-http.adapter';
import { CobrosHttpAdapter } from './infrastructure/cobros-http.adapter';
import { FacturasHttpAdapter, PlanesHttpAdapter } from './infrastructure/planes-http.adapter';
import { SeguridadHttpAdapter } from './infrastructure/seguridad-http.adapter';
import { StripeTarjetaAdapter } from './infrastructure/stripe-tarjeta.adapter';
import { QrLocalAdapter } from './infrastructure/qr-local.adapter';
import { DescargaNavegadorAdapter } from './infrastructure/descarga-navegador.adapter';

/**
 * Ata los puertos de «account» con sus adaptadores.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura —y el único donde se
 * nombra a Stripe. Todo lo demás, casos de uso, estado y pantallas, solo conoce las interfaces: cambiar
 * de pasarela de pago, o poner un doble en una prueba, es cambiar una línea de aquí.
 *
 * <p>Se declara en la ruta del contexto (`providers: [proveeAccount()]`) para que estas dependencias no
 * pesen en el arranque de quien nunca abre su perfil.
 */
export function proveeAccount(): EnvironmentProviders {
  return makeEnvironmentProviders([
    PerfilHttpAdapter,
    { provide: PERFIL_PORT, useFactory: () => inject(PerfilHttpAdapter) },
    { provide: BAJA_DE_CUENTA_PORT, useFactory: () => inject(PerfilHttpAdapter) },
    { provide: PORTABILIDAD_PORT, useFactory: () => inject(PerfilHttpAdapter) },
    { provide: FIN_DE_SESION_PORT, useFactory: () => inject(PerfilHttpAdapter) },

    DireccionesHttpAdapter,
    { provide: DIRECCIONES_PORT, useFactory: () => inject(DireccionesHttpAdapter) },
    { provide: AYUDA_DE_DIRECCION_PORT, useFactory: () => inject(DireccionesHttpAdapter) },

    CobrosHttpAdapter,
    { provide: METODOS_DE_PAGO_PORT, useFactory: () => inject(CobrosHttpAdapter) },

    PlanesHttpAdapter,
    { provide: PLANES_PORT, useFactory: () => inject(PlanesHttpAdapter) },
    FacturasHttpAdapter,
    { provide: FACTURAS_PORT, useFactory: () => inject(FacturasHttpAdapter) },

    SeguridadHttpAdapter,
    { provide: DOBLE_FACTOR_PORT, useFactory: () => inject(SeguridadHttpAdapter) },
    { provide: SESIONES_ACTIVAS_PORT, useFactory: () => inject(SeguridadHttpAdapter) },

    QrLocalAdapter,
    { provide: CODIGO_QR_PORT, useFactory: () => inject(QrLocalAdapter) },

    // La pasarela de tarjeta. Es el punto donde se decide QUIÉN cobra: hoy Stripe, montado a mano
    // sobre su biblioteca agnóstica porque su envoltura para React no existe en Angular.
    StripeTarjetaAdapter,
    { provide: PASARELA_DE_TARJETA_PORT, useFactory: () => inject(StripeTarjetaAdapter) },

    DescargaNavegadorAdapter,
    { provide: DESCARGA_PORT, useFactory: () => inject(DescargaNavegadorAdapter) },
  ]);
}
