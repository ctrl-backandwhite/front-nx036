import { InjectionToken } from '@angular/core';

/**
 * Dónde queda apuntado adónde quería ir quien salta al proveedor de identidad, y quién lo recoge al
 * volver.
 *
 * <p>Existe como puerto porque el salto SALE del navegador y vuelve: nada que esté solo en memoria
 * sobrevive, así que hay que escribirlo en el equipo. Y en el equipo, hasta LEER lanza en navegación
 * privada o con «bloquear todas las cookies» — un fallo ahí reventaba el retorno justo antes del salto
 * final y dejaba a la persona mirando el giro para siempre: para ella, entrar con Google no funcionaba.
 *
 * <p>El contrato es que NUNCA lanza: si no se puede leer, no hay destino y se va al de por defecto.
 *
 * <p>El almacén transversal (`ALMACEN_LOCAL`) no vale aquí: esto tiene que morir al cerrar la pestaña.
 * Un destino guardado para siempre reaparecería semanas después, en otro acceso que no lo pidió.
 */
export interface DestinoTrasAccesoPort {
  /** Lo apunta antes de saltar al proveedor. */
  recuerda(destino: string): void;
  /** Lo devuelve y lo BORRA: se consume una sola vez. */
  recoge(): string | null;

  /**
   * Anota el testigo de un solo uso con el que esta pestaña arranca el flujo.
   *
   * <p>Es lo que permite distinguir, al volver, «vengo de un acceso que yo empecé» de «alguien me ha
   * mandado un enlace con unos testigos dentro». Sin él, la única comprobación posible era que los
   * testigos tuvieran FORMA de JWT, y eso no distingue basura de un JWT auténtico de otra cuenta:
   * bastaba con publicar un enlace a `/auth/callback#token=…` con los del atacante para que la víctima
   * acabara operando dentro de su cuenta.
   */
  recuerdaTestigo(testigo: string): void;

  /** Lo devuelve y lo BORRA: un testigo vale una vez, para que un retorno no se pueda reutilizar. */
  consumeTestigo(): string | null;
}

export const DESTINO_TRAS_ACCESO_PORT = new InjectionToken<DestinoTrasAccesoPort>(
  'DestinoTrasAccesoPort',
);
