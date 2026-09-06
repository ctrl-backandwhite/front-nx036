import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { COBRO_DE_AFILIADO_PORT, PANEL_DE_AFILIADO_PORT } from './domain/port/afiliado.port';
import { ATRIBUCION_DE_REFERIDO_PORT } from './domain/port/referido.port';
import { AfiliadoHttpAdapter } from './infrastructure/afiliado-http.adapter';
import { CobroHttpAdapter } from './infrastructure/cobro-http.adapter';
import { AtribucionHttpAdapter } from './infrastructure/atribucion-http.adapter';

/**
 * Ata los puertos del panel de afiliados con sus adaptadores. Se declara en la ruta del panel.
 *
 * <p>La ATRIBUCIÓN va aparte, en `proveeAtribucionDeReferido()`, porque la usa una visita anónima en
 * cualquier página del sitio: colgarla de la ruta del panel dejaría sin atribuir todo enlace que no
 * apuntara justo ahí.
 */
export function proveeAfiliado(): EnvironmentProviders {
  return makeEnvironmentProviders([
    AfiliadoHttpAdapter,
    { provide: PANEL_DE_AFILIADO_PORT, useFactory: () => inject(AfiliadoHttpAdapter) },
    CobroHttpAdapter,
    { provide: COBRO_DE_AFILIADO_PORT, useFactory: () => inject(CobroHttpAdapter) },
  ]);
}

/**
 * Ata el puerto de atribución. Va en la raíz de la aplicación, junto al componente de captura.
 */
export function proveeAtribucionDeReferido(): EnvironmentProviders {
  return makeEnvironmentProviders([
    AtribucionHttpAdapter,
    { provide: ATRIBUCION_DE_REFERIDO_PORT, useFactory: () => inject(AtribucionHttpAdapter) },
  ]);
}
