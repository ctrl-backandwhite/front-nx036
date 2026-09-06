import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Lo poco que la cesta necesita saber de una ficha para poder añadirla.
 *
 * <p>Es un puerto PROPIO de «cart» sobre un dato que también conoce el catálogo. Podría parecer
 * duplicación y no lo es: la cesta no quiere la ficha —con su galería, sus reseñas, sus especificaciones
 * y su bloque de cumplimiento—, quiere el precio de venta, el pedido mínimo y la primera variante con
 * existencias. Depender del puerto grande del catálogo ataría la cesta a cada cambio de aquel y
 * obligaría a cualquier doble de prueba a fingir una ficha entera para añadir un producto.
 *
 * <p>Es el principio de segregación de interfaces aplicado a la letra: cada contexto declara lo que de
 * verdad usa y la infraestructura resuelve los dos contra el mismo sitio.
 */
export interface VarianteParaAnadir {
  readonly id: string;
  readonly sku?: string;
  readonly precio?: number;
  readonly existencias: number;
  readonly activa: boolean;
  /** Los ejes elegidos («Color: Negro», «Talla: M»), tal como los da el catálogo. */
  readonly opciones: Readonly<Record<string, string>>;
}

export interface FichaParaAnadir {
  readonly pedidoMinimo: number;
  readonly precioMostrado?: number;
  readonly divisaMostrada?: string;
  readonly variantes: readonly VarianteParaAnadir[];
}

export interface FichaParaAnadirPort {
  consulta(slug: string, idioma: string): Promise<Result<FichaParaAnadir, AppError>>;
}

export const FICHA_PARA_ANADIR_PORT = new InjectionToken<FichaParaAnadirPort>('FichaParaAnadirPort');
