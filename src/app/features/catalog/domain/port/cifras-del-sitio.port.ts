import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Las cifras que la portada enseña sobre el sitio: idiomas, divisas y almacenes.
 *
 * <p>Son REALES y por eso están aquí en vez de escritas en la plantilla. Suben y bajan solas al activar
 * un idioma, al añadir una divisa o al dar de alta un almacén, y el porte las tenía a medias: los
 * almacenes y los idiomas no se enseñaban, y las divisas iban con un doce escrito a mano que
 * contradecía las veinticinco que administra el panel. Un número escrito a mano en el escaparate es
 * peor que ninguno: no se sabe que ha dejado de ser cierto.
 *
 * <p>Van juntas en un solo puerto porque juntas responden a una sola pregunta —«¿qué tamaño tiene
 * esto?»— y así la portada pide una cosa, no tres.
 */
export interface CifrasDelSitio {
  readonly idiomas: number;
  readonly divisas: number;
  readonly almacenes: number;
}

export interface CifrasDelSitioPort {
  consulta(): Promise<Result<CifrasDelSitio, AppError>>;
}

export const CIFRAS_DEL_SITIO_PORT = new InjectionToken<CifrasDelSitioPort>('CifrasDelSitioPort');
