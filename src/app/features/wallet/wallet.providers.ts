import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { CARTERA_PORT, RECARGA_PORT } from './domain/port/cartera.port';
import { COMISIONES_PENDIENTES_PORT } from './domain/port/comisiones-pendientes.port';
import { CarteraHttpAdapter } from './infrastructure/cartera-http.adapter';
import { RecargaHttpAdapter } from './infrastructure/recarga-http.adapter';
import { ComisionesPendientesHttpAdapter } from './infrastructure/comisiones-pendientes-http.adapter';
import { ConfirmaRecarga } from './application/use-case/confirma-recarga.use-case';
import { ConsultaCartera } from './application/use-case/consulta-cartera.use-case';
import { ConsultaComisionesPendientes } from './application/use-case/consulta-comisiones-pendientes.use-case';
import { IniciaRecarga } from './application/use-case/inicia-recarga.use-case';

/**
 * Ata los puertos de «wallet» con sus adaptadores.
 *
 * <p>Aquí está la razón de que el saldo y el cobro sean dos puertos: el día que la recarga pase por otra
 * pasarela se sustituye una línea y la pantalla del saldo ni se entera.
 *
 * <p>Los CASOS DE USO van aquí, no en la raíz. Marcados `providedIn: 'root'` los construía el inyector
 * raíz, que no ve estos proveedores —viven en la ruta de la cartera—, y la pantalla reventaba al abrirla
 * con «NG0201: No provider found». En las pruebas no salía: allí todo se provee en el mismo banco.
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

    // Los casos de uso, junto a los puertos de los que dependen: mismo inyector, misma vida.
    ConfirmaRecarga,
    ConsultaCartera,
    ConsultaComisionesPendientes,
    IniciaRecarga,
  ]);
}
