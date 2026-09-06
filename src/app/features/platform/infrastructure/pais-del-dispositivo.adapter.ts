import { Injectable } from '@angular/core';
import { esNavegador } from '@core/platform/plataforma';
import { PaisDelDispositivoPort } from '../domain/port/pais-del-dispositivo.port';

/**
 * El país sacado del idioma del navegador («es-ES» → «ES»).
 *
 * <p>Al PRERENDERIZAR no hay navegador, así que devuelve vacío: el aviso de cookies no forma parte del
 * HTML que se escribe al construir, se decide en el equipo de quien mira.
 */
@Injectable()
export class PaisDelDispositivoAdapter implements PaisDelDispositivoPort {
  private readonly enNavegador = esNavegador();

  codigo(): string {
    if (!this.enNavegador) {
      return '';
    }
    try {
      return (navigator.language ?? '').split('-')[1]?.toUpperCase() ?? '';
    } catch {
      return '';
    }
  }
}
