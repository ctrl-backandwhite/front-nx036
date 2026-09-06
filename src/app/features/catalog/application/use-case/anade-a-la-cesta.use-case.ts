import { Injectable, inject } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { LineaDeCesta } from '../../domain/model/linea-de-cesta';
import { FichaDeProducto, ResumenDeProducto, VarianteDeProducto } from '../../domain/model/producto';
import { etiquetaDeVariante, primeraDisponible } from '../../domain/model/seleccion-de-variante';

/** Por qué no ha entrado en la cesta. */
export type MotivoDeRechazo = 'sin-existencias' | 'sin-precio';

/**
 * Meter un producto en la cesta desde cualquier sitio, con las MISMAS reglas.
 *
 * <p>Estaba escrito dentro de la tarjeta del catálogo y hacía falta en dos sitios más —la vista rápida
 * y la ficha—. Copiarlo habría sido la forma segura de que dentro de un mes cada uno añadiera con un
 * precio distinto. Lo que resuelve, y por qué importa:
 *
 * <ul>
 *   <li>El precio de partida es el de VENTA en la divisa activa, nunca el coste del proveedor: ese ya
 *       no viaja fuera del panel y dejaría la cesta a cero.
 *   <li>Importe y DIVISA van siempre emparejados: etiquetar el importe con la divisa equivocada es lo
 *       que una vez enseñó «117,26 €» por algo que valía 14,90 €.
 *   <li>Si hay variantes se coge la primera CON existencias; si no queda ninguna NO se añade nada y se
 *       dice. Añadir a ciegas acaba en pedidos con la talla equivocada.
 * </ul>
 */
@Injectable()
export class AnadeALaCesta {
  private readonly catalogo = inject(CATALOGO_PORT);
  private readonly cesta = inject(CESTA_PORT);

  /**
   * Añade desde una TARJETA, que no trae variantes: se consulta la ficha para resolver la primera
   * variante disponible y su precio real.
   */
  async desdeLaTarjeta(
    producto: ResumenDeProducto,
  ): Promise<Result<void, AppError | MotivoDeRechazo>> {
    const ficha = await this.catalogo.ficha(producto.slug);
    if (!ficha.ok) {
      return fallo(ficha.error);
    }
    return this.conVariante(ficha.valor, this.varianteParaAnadirSola(ficha.valor), 1);
  }

  /**
   * Añade una línea concreta de la ficha: la variante ya la ha elegido quien compra.
   *
   * <p>El precio que se congela es el de ESA variante —lo que el pedido va a cobrar—, no el destacado
   * del encabezado, que puede venir de un tramo por cantidad.
   */
  async conVariante(
    ficha: FichaDeProducto,
    variante: VarianteDeProducto | undefined | 'ninguna-disponible',
    cantidad: number,
  ): Promise<Result<void, AppError | MotivoDeRechazo>> {
    if (variante === 'ninguna-disponible') {
      return fallo('sin-existencias');
    }
    const importe = variante?.precio ?? ficha.precio.importe;
    if (importe == null) {
      return fallo('sin-precio');
    }
    const linea: LineaDeCesta = {
      productId: ficha.id,
      variantId: variante?.id,
      // El SKU se resuelve SIEMPRE: el de la variante si existe y, si no, el del producto. Así la
      // cesta nunca queda sin una referencia visible.
      sku: variante?.sku || ficha.sku,
      variantLabel: etiquetaDeVariante(variante),
      slug: ficha.slug,
      title: ficha.titulo,
      image: ficha.imagenPrincipal,
      unitPriceSource: Number(importe),
      sourceCurrency: ficha.precio.divisa ?? 'USD',
      quantity: cantidad,
      moq: ficha.moq > 1 ? ficha.moq : undefined,
    };
    const resultado = await this.cesta.anade(linea);
    return resultado.ok ? exito(undefined) : fallo(resultado.error);
  }

  /**
   * Qué variante se lleva quien añade sin elegir. Si el producto TIENE variantes y ninguna queda
   * disponible, se dice explícitamente: es preferible a un pedido con la talla equivocada.
   */
  private varianteParaAnadirSola(
    ficha: FichaDeProducto,
  ): VarianteDeProducto | undefined | 'ninguna-disponible' {
    if (ficha.variantes.length === 0) {
      return undefined;
    }
    return primeraDisponible(ficha.variantes) ?? 'ninguna-disponible';
  }
}

/** Distingue el fallo de red del rechazo por reglas, para que la pantalla enseñe el texto correcto. */
export function esMotivoDeRechazo(error: AppError | MotivoDeRechazo): error is MotivoDeRechazo {
  return typeof error === 'string';
}

/** Un error de aplicación con el que rellenar cuando el rechazo no viene del servidor. */
export const ERROR_AL_ANADIR: AppError = creaError('conflicto');
