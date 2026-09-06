import {
  EnvironmentProviders,
  ErrorHandler,
  Injectable,
  Signal,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';

/** Lo que se guarda de un fallo para poder enseñarlo y diagnosticarlo. */
export interface FalloRegistrado {
  readonly mensaje: string;
  readonly pila: string;
}

/**
 * El manejador de errores de la aplicación.
 *
 * <p>Angular no tiene «límites de error» como React: un fallo al pintar no lo captura un componente
 * padre, lo recoge el `ErrorHandler` global. Por eso lo que en el otro front eran tres clases —el
 * límite de raíz, el de sección y el estado vacío— aquí son DOS piezas: este servicio, que se queda con
 * el último fallo en un signal, y los componentes que lo pintan.
 *
 * <p>Se guarda el mensaje Y la pila, también en producción: sin ellos, diagnosticar un fallo del
 * despliegue remoto obliga a recompilar en modo de desarrollo para poder verlo, que es justo lo que no
 * se puede hacer con una incidencia delante.
 */
@Injectable({ providedIn: 'root' })
export class ManejadorErrores implements ErrorHandler {
  private readonly _fallo = signal<FalloRegistrado | null>(null);

  readonly fallo: Signal<FalloRegistrado | null> = this._fallo.asReadonly();

  handleError(error: unknown): void {
    const causa = error instanceof Error ? error : new Error(String(error));
    // La consola sigue siendo el sitio donde mira quien está depurando; el signal es para la pantalla.
    console.error('[nx036]', causa);
    this._fallo.set({ mensaje: causa.message, pila: causa.stack ?? '' });
  }

  /** Se llama al reintentar: sin esto la pantalla de error quedaría fija aunque se recupere. */
  olvida(): void {
    this._fallo.set(null);
  }
}

/**
 * Registra el manejador propio en lugar del de Angular, que solo escribe en la consola. Va en la
 * configuración de la aplicación, que es donde se decide qué implementación entra.
 */
export function proveeManejadorDeErrores(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ErrorHandler, useExisting: ManejadorErrores }]);
}
