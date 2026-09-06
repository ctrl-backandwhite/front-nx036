import { EnvironmentProviders, Provider, inject, makeEnvironmentProviders } from '@angular/core';
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
 * Los casos de uso de «wallet».
 *
 * <p>Se listan aparte de los adaptadores para poder montarlos en una prueba EXACTAMENTE como los monta
 * la ruta. Es la lección del fallo que arregló esta lista: mientras cada clase se declaraba a sí misma
 * `providedIn: 'root'`, el banco de pruebas las tenía siempre a mano y la aplicación de verdad no, así
 * que 2.800 pruebas en verde convivían con pantallas que reventaban al abrirlas. Con una sola lista,
 * añadir un caso de uso lo mete a la vez en la ruta y en las pruebas, y no hay forma de que diverjan.
 */
export const APLICACION_DE_LA_CARTERA: Provider[] = [
  ConfirmaRecarga,
  ConsultaCartera,
  ConsultaComisionesPendientes,
  IniciaRecarga,
];

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

    ...APLICACION_DE_LA_CARTERA,
  ]);
}
