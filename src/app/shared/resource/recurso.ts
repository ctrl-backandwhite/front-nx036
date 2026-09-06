import { Signal } from '@angular/core';
import { AppError } from '../error/app-error';

/**
 * Una lectura del servidor, vista como estado reactivo.
 *
 * <p>Es la forma que tiene un PUERTO de ofrecer datos que se leen y se repintan solos, sin que la capa de
 * aplicación sepa que detrás hay HTTP. Quien lo consume ve tres signals y un método para recargar; quién
 * los rellena —una llamada al backend, un doble en una prueba, una caché— es cosa del adaptador.
 *
 * <p>Los tres estados son excluyentes por construcción y no hay que combinarlos a mano en cada plantilla:
 * `cargando` mientras no hay respuesta, `error` si falló, `valor` si salió bien.
 */
export interface Recurso<T> {
  readonly valor: Signal<T | undefined>;
  readonly cargando: Signal<boolean>;
  readonly error: Signal<AppError | null>;
  /** Vuelve a pedirlo. Se usa tras una escritura que deja lo leído desfasado. */
  recarga(): void;
}
