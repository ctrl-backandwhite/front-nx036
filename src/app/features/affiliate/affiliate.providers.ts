import { EnvironmentProviders, Provider, inject, makeEnvironmentProviders } from '@angular/core';
import { COBRO_DE_AFILIADO_PORT, PANEL_DE_AFILIADO_PORT } from './domain/port/afiliado.port';
import { ATRIBUCION_DE_REFERIDO_PORT } from './domain/port/referido.port';
import { AfiliadoHttpAdapter } from './infrastructure/afiliado-http.adapter';
import { CobroHttpAdapter } from './infrastructure/cobro-http.adapter';
import { AtribucionHttpAdapter } from './infrastructure/atribucion-http.adapter';
import { ConsultaPanelDeAfiliado } from './application/use-case/consulta-panel-de-afiliado.use-case';
import { GestionaCobro } from './application/use-case/gestiona-cobro.use-case';

/**
 * Los casos de uso del panel de afiliados.
 *
 * <p>Se listan aparte de los adaptadores para poder montarlos en una prueba EXACTAMENTE como los monta
 * la ruta. Es la lección del fallo que arregló esta lista: mientras cada clase se declaraba a sí misma
 * `providedIn: 'root'`, el banco de pruebas las tenía siempre a mano y la aplicación de verdad no, así
 * que 2.800 pruebas en verde convivían con pantallas que reventaban al abrirlas. Con una sola lista,
 * añadir un caso de uso lo mete a la vez en la ruta y en las pruebas, y no hay forma de que diverjan.
 */
export const APLICACION_DEL_AFILIADO: Provider[] = [
  ConsultaPanelDeAfiliado,
  GestionaCobro,
];

/**
 * Ata los puertos del panel de afiliados con sus adaptadores. Se declara en la ruta del panel.
 *
 * <p>La ATRIBUCIÓN va aparte, en `proveeAtribucionDeReferido()`, porque la usa una visita anónima en
 * cualquier página del sitio: colgarla de la ruta del panel dejaría sin atribuir todo enlace que no
 * apuntara justo ahí.
 *
 * <p>Los dos CASOS DE USO del panel se registran aquí, no con `providedIn: 'root'`. Un servicio de la
 * raíz solo ve los proveedores de la raíz, así que allí no encontraban estos puertos —que cuelgan de la
 * ruta— y la pantalla moría al abrirla con «NG0201: No provider found». `CapturaReferido` es la
 * excepción y se queda en la raíz: su puerto es el de atribución, que también va en la raíz.
 */
export function proveeAfiliado(): EnvironmentProviders {
  return makeEnvironmentProviders([
    AfiliadoHttpAdapter,
    { provide: PANEL_DE_AFILIADO_PORT, useFactory: () => inject(AfiliadoHttpAdapter) },
    CobroHttpAdapter,
    { provide: COBRO_DE_AFILIADO_PORT, useFactory: () => inject(CobroHttpAdapter) },

    ...APLICACION_DEL_AFILIADO,
  ]);
}

/**
 * Ata el puerto de atribución. Va en la raíz de la aplicación, junto al componente de captura.
 *
 * <p>Por eso `CapturaReferido` SÍ puede seguir siendo un servicio de la raíz: su puerto no se declara en
 * ninguna ruta, sino aquí, y quien lo usa —el componente de captura— se monta en el marco de página, que
 * está fuera de la ruta del panel. Registrarlo en `proveeAfiliado()` lo dejaría fuera del alcance de su
 * único consumidor.
 */
export function proveeAtribucionDeReferido(): EnvironmentProviders {
  return makeEnvironmentProviders([
    AtribucionHttpAdapter,
    { provide: ATRIBUCION_DE_REFERIDO_PORT, useFactory: () => inject(AtribucionHttpAdapter) },
  ]);
}
