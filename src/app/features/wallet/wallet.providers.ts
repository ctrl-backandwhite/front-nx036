import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { CARTERA_PORT, RECARGA_PORT } from './domain/port/cartera.port';
import { COMISIONES_PENDIENTES_PORT } from './domain/port/comisiones-pendientes.port';
import { CarteraHttpAdapter } from './infrastructure/cartera-http.adapter';
import { RecargaHttpAdapter } from './infrastructure/recarga-http.adapter';
import { ComisionesPendientesHttpAdapter } from './infrastructure/comisiones-pendientes-http.adapter';

/**
 * Ata los puertos de «wallet» con sus adaptadores.
 *
 * <p>Aquí está la razón de que el saldo y el cobro sean dos puertos: el día que la recarga pase por otra
 * pasarela se sustituye una línea y la pantalla del saldo ni se entera.
 */
export function proveeCartera(): EnvironmentProviders {
  return makeEnvironmentProviders([
    CarteraHttpAdapter,
    { provide: CARTERA_PORT, useFactory: () => inject(CarteraHttpAdapter) },
    RecargaHttpAdapter,
    { provide: RECARGA_PORT, useFactory: () => inject(RecargaHttpAdapter) },
    ComisionesPendientesHttpAdapter,
    {
      provide: COMISIONES_PENDIENTES_PORT,
      useFactory: () => inject(ComisionesPendientesHttpAdapter),
    },
  ]);
}
