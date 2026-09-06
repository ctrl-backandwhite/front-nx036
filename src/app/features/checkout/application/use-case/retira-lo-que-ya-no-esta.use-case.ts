import { Injectable, inject } from '@angular/core';
import { CARRITO_COMPARTIDO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { COTIZACION_DE_LA_COMPRA_PORT } from '../../domain/port/cotizacion-de-la-compra.port';

/**
 * Saca de la cesta las líneas que el catálogo ya no reconoce.
 *
 * <p>Pasa de verdad: se reimporta un producto, sus variantes cambian de identificador y la cesta se queda
 * con una que ya no existe. Al pagar, el servidor responde que ese artículo no está disponible, y sin
 * quitarlo el reintento falla igual: quien compra queda atrapado en un pago que nunca sale, sin saber cuál
 * de sus líneas sobra.
 *
 * <p>CÓMO SE AVERIGUA CUÁL SOBRA. Volviendo a valorar la cesta: el servidor devuelve las líneas que sigue
 * conociendo, y las que faltan de esa respuesta son las caducadas. Es más completo que fiarse del detalle
 * del error —que además el error de esta aplicación todavía no transporta— porque limpia TODAS las
 * caducadas de una vez y no solo la primera que el servidor encontró.
 *
 * <p>Si la valoración tampoco responde no se toca nada: quitar líneas a ciegas de una cesta sería peor que
 * el problema que se intenta arreglar.
 */
@Injectable()
export class RetiraLoQueYaNoEsta {
  private readonly carrito = inject(CARRITO_COMPARTIDO_PORT);
  private readonly valoracion = inject(COTIZACION_DE_LA_COMPRA_PORT);

  async ejecuta(): Promise<number> {
    const lineas = this.carrito.lineas();
    if (lineas.length === 0) {
      return 0;
    }
    const valorada = await this.valoracion.valora(
      lineas.map((linea) => ({
        productId: linea.productId,
        variantId: linea.variantId,
        cantidad: linea.cantidad,
      })),
    );
    if (!valorada.ok) {
      return 0;
    }
    const reconocidas = new Set(
      valorada.valor.lineas.map((linea) => `${linea.productId}:${linea.variantId ?? ''}`),
    );
    const caducadas = lineas.filter(
      (linea) => !reconocidas.has(`${linea.productId}:${linea.variantId ?? ''}`),
    );
    for (const linea of caducadas) {
      this.carrito.quita(linea);
    }
    return caducadas.length;
  }
}
