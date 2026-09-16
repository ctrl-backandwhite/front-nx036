import { Injectable, computed, inject } from '@angular/core';
import { TraduccionService } from './traduccion.service';

/**
 * Fechas y horas en el idioma que ha elegido quien mira, no en el del navegador.
 *
 * <p>Estaba escrito a mano en 33 sitios como `new Date(iso).toLocaleString()`, **sin argumento**. Sin
 * idioma, `toLocaleString` usa el del NAVEGADOR: una aplicación con ocho diccionarios, cuya cabecera
 * `X-Lang` decide hasta el texto de los errores del backend, pintaba las fechas en un noveno idioma que
 * nadie había elegido. Quien tuviera el navegador en inglés y la web en español veía «9/16/2026, 6:21 PM»
 * junto a un texto en español.
 *
 * <p>El formateador se memoriza por idioma: construir un `Intl.DateTimeFormat` es caro y estas funciones
 * se llaman una vez por fila de cada listado.
 */
@Injectable({ providedIn: 'root' })
export class FormatoDeFecha {

  private readonly traduccion = inject(TraduccionService);

  private readonly fechaYHoraDeIdioma = computed(
    () => new Intl.DateTimeFormat(this.traduccion.idioma(), { dateStyle: 'short', timeStyle: 'short' }));

  private readonly soloFechaDeIdioma = computed(
    () => new Intl.DateTimeFormat(this.traduccion.idioma(), { dateStyle: 'short' }));

  /** Fecha y hora abreviadas. Cadena vacía si no hay dato, para que la plantilla no pinte «Invalid Date». */
  readonly fechaYHora = (iso: string | null | undefined): string => this.formatea(iso, this.fechaYHoraDeIdioma());

  /** Solo la fecha, sin hora. */
  readonly soloFecha = (iso: string | null | undefined): string => this.formatea(iso, this.soloFechaDeIdioma());

  private formatea(iso: string | null | undefined, formateador: Intl.DateTimeFormat): string {
    if (!iso) {
      return '';
    }
    const fecha = new Date(iso);
    return Number.isNaN(fecha.getTime()) ? '' : formateador.format(fecha);
  }
}
