import { Injectable, computed, signal } from '@angular/core';

export type TipoAviso = 'success' | 'error' | 'info' | 'warning';

export interface AccionAviso {
  readonly etiqueta: string;
  readonly ejecuta: () => void;
}

export interface Aviso {
  readonly id: number;
  readonly tipo: TipoAviso;
  readonly mensaje: string;
  readonly titulo?: string;
  readonly accion?: AccionAviso;
}

/** Lo que se puede pedir al lanzar un aviso: todo menos el identificador, que lo pone la cola. */
export type PeticionAviso = Omit<Aviso, 'id'>;

/** Cuánto se queda en pantalla. Lo justo para leerlo sin que estorbe al siguiente paso. */
const DURACION_MS = 4500;

/**
 * La cola de avisos.
 *
 * <p>Es estado de INTERFAZ, no de negocio: aquí no se decide nada, solo se apunta qué hay que enseñar y
 * durante cuánto. Por eso vive en el sistema de diseño y no en un contexto acotado — la confirmación de
 * «producto añadido» y la de «pedido enviado» son el mismo mecanismo.
 */
@Injectable({ providedIn: 'root' })
export class AvisosStore {
  private readonly _avisos = signal<readonly Aviso[]>([]);
  private siguienteId = 1;

  readonly avisos = this._avisos.asReadonly();
  readonly hayAvisos = computed(() => this._avisos().length > 0);

  muestra(peticion: PeticionAviso): number {
    const id = this.siguienteId++;
    this._avisos.update((lista) => [...lista, { ...peticion, id }]);
    // Se retira solo: obligar a cerrar cada confirmación convierte un acierto en una tarea.
    setTimeout(() => this.descarta(id), DURACION_MS);
    return id;
  }

  exito(mensaje: string, titulo?: string): number {
    return this.muestra({ tipo: 'success', mensaje, ...(titulo ? { titulo } : {}) });
  }

  error(mensaje: string, titulo?: string): number {
    return this.muestra({ tipo: 'error', mensaje, ...(titulo ? { titulo } : {}) });
  }

  descarta(id: number): void {
    this._avisos.update((lista) => lista.filter((aviso) => aviso.id !== id));
  }
}
