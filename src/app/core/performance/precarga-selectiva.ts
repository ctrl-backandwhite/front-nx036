import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Decide qué partes de la aplicación se descargan de fondo antes de que nadie las pida.
 *
 * <p>Las dos opciones que trae Angular no sirven aquí. Sin precarga, la primera navegación a cualquier
 * sección espera a descargar su código —se nota como un parón al pulsar—. Con `PreloadAllModules` se
 * descargan los doce contextos, panel de administración incluido, y en una conexión móvil eso compite
 * con lo que la persona está mirando AHORA: se acelera una navegación futura estropeando la actual.
 *
 * <p>Así que se precarga solo lo que se marque, y no antes de que el arranque haya terminado:
 *
 * <pre>
 *   { path: 'catalog', data: { precarga: true }, loadChildren: ... }
 * </pre>
 *
 * <p>El retardo es lo que separa «adelantar trabajo» de «robar ancho de banda». Se empieza cuando la
 * pantalla ya está pintada y es utilizable.
 */
@Injectable({ providedIn: 'root' })
export class PrecargaSelectiva implements PreloadingStrategy {
  /** Tiempo de gracia tras el arranque. Bastante para que la primera pantalla esté servida. */
  private static readonly ESPERA_MS = 2_000;

  preload(ruta: Route, carga: () => Observable<unknown>): Observable<unknown> {
    if (ruta.data?.['precarga'] !== true) {
      return of(null);
    }
    return timer(PrecargaSelectiva.ESPERA_MS).pipe(mergeMap(() => carga()));
  }
}
