import { InjectionToken } from '@angular/core';

/**
 * La VOZ del asistente.
 *
 * <p>Va por puerto y no llamando al navegador desde la pantalla por dos motivos. El primero es que al
 * PRERENDERIZAR no hay síntesis de voz, y tocarla sin preguntar rompe la construcción entera. El
 * segundo es que así se puede probar que el asistente dice cada cosa UNA sola vez sin necesitar un
 * navegador que hable.
 *
 * <p>Ni servicio de pago ni audio viajando a ningún servidor: la genera el propio dispositivo. Dado lo
 * que el asistente cuenta —pedidos, importes—, que no salga de ahí no es un detalle menor.
 *
 * <p>NINGÚN navegador deja hablar a una página antes de que se interactúe con ella. Por eso la voz se
 * enciende con un botón: ese clic ES la interacción que la desbloquea. Intentar hablar al aterrizar no
 * daría error, sencillamente no sonaría.
 */
export interface VozPort {
  disponible(): boolean;
  /** Antes de hablar calla lo anterior: encadenar locuciones cuenta algo que ya no está en pantalla. */
  habla(texto: string, idioma: string): void;
  calla(): void;
}

export const VOZ_PORT = new InjectionToken<VozPort>('VozPort');
