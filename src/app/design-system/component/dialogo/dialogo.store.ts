import { Injectable, signal } from '@angular/core';

export type VarianteDialogo = 'info' | 'success' | 'warning' | 'error';
export type TipoDialogo = 'alert' | 'confirm' | 'prompt' | 'form';

export interface CampoDialogo {
  readonly nombre: string;
  readonly etiqueta: string;
  readonly obligatorio?: boolean;
  readonly tipo?: 'text' | 'number' | 'email' | 'password';
  readonly min?: number;
  readonly marcador?: string;
  readonly ayuda?: string;
  readonly valorInicial?: string;
}

export interface PeticionDialogo {
  readonly clase: TipoDialogo;
  readonly titulo?: string;
  readonly mensaje?: string;
  readonly variante?: VarianteDialogo;
  readonly etiquetaConfirmar?: string;
  readonly etiquetaCancelar?: string;
  /** Solo para `prompt`. */
  readonly valorInicial?: string;
  readonly marcador?: string;
  readonly tipoCampo?: 'text' | 'number' | 'email' | 'password';
  /** Solo para `form`. */
  readonly campos?: readonly CampoDialogo[];
}

/** Lo que devuelve cada clase de diálogo: sí/no, el texto tecleado, o el formulario relleno. */
export type ResultadoDialogo = boolean | string | Record<string, string> | null;

interface DialogoActivo extends PeticionDialogo {
  readonly id: number;
  readonly resuelve: (resultado: ResultadoDialogo) => void;
}

/**
 * El diálogo de la aplicación, en vez de los del navegador.
 *
 * <p>`alert`, `confirm` y `prompt` nativos bloquean el hilo, no se pueden traducir, no se pueden pintar
 * con el tema y en el móvil salen con el nombre del dominio encima. Este los sustituye con la misma
 * forma de uso —se espera al resultado— pero pintado por nosotros.
 *
 * <p>Se atiende UNO cada vez: dos diálogos superpuestos son una trampa: no se sabe cuál contesta qué.
 */
@Injectable({ providedIn: 'root' })
export class DialogoStore {
  private readonly _actual = signal<DialogoActivo | null>(null);
  private siguienteId = 1;

  readonly actual = this._actual.asReadonly();

  private abre(peticion: PeticionDialogo): Promise<ResultadoDialogo> {
    return new Promise((resuelve) => {
      this._actual.set({ ...peticion, id: this.siguienteId++, resuelve });
    });
  }

  alerta(mensaje: string, titulo?: string, variante?: VarianteDialogo): Promise<ResultadoDialogo> {
    return this.abre({ clase: 'alert', mensaje, ...(titulo ? { titulo } : {}), ...(variante ? { variante } : {}) });
  }

  confirma(mensaje: string, titulo?: string): Promise<boolean> {
    return this.abre({ clase: 'confirm', mensaje, ...(titulo ? { titulo } : {}) }).then(
      (r) => r === true,
    );
  }

  pregunta(peticion: Omit<PeticionDialogo, 'clase'>): Promise<string | null> {
    return this.abre({ ...peticion, clase: 'prompt' }).then((r) =>
      typeof r === 'string' ? r : null,
    );
  }

  formulario(
    peticion: Omit<PeticionDialogo, 'clase'>,
  ): Promise<Record<string, string> | null> {
    return this.abre({ ...peticion, clase: 'form' }).then((r) =>
      r && typeof r === 'object' ? r : null,
    );
  }

  /** Cierra el diálogo vivo entregando su resultado a quien lo estaba esperando. */
  cierra(resultado: ResultadoDialogo): void {
    const activo = this._actual();
    if (!activo) {
      return;
    }
    this._actual.set(null);
    activo.resuelve(resultado);
  }
}
