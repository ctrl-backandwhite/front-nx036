import { Injectable, inject } from '@angular/core';
import { PreferenciasService } from '@core/preferences/preferencias';
import { LineaDeCarrito, aseguraLinea } from '../../domain/model/linea-de-carrito';
import { ProductoAnadible, ResultadoAlAnadir } from '../../domain/model/producto-anadible';
import { CARRITO_REMOTO_PORT } from '../../domain/port/carrito.port';
import {
  FICHA_PARA_ANADIR_PORT,
  FichaParaAnadir,
  VarianteParaAnadir,
} from '../../domain/port/ficha-para-anadir.port';
import { CarritoStore } from '../state/carrito.store';
import { SincronizadorDelCarrito } from '../state/sincronizador-del-carrito';

@Injectable()
export class AnadeAlCarrito {
  private readonly ficha = inject(FICHA_PARA_ANADIR_PORT);
  private readonly remoto = inject(CARRITO_REMOTO_PORT);
  private readonly estado = inject(CarritoStore);
  private readonly sincronizador = inject(SincronizadorDelCarrito);
  private readonly preferencias = inject(PreferenciasService);

  /**
   * Añadir un producto a la cesta desde cualquier sitio, con las mismas reglas.
   *
   * <p>Estaba escrito dentro de la tarjeta del catálogo y hacía falta en dos sitios más. Copiarlo habría
   * sido la forma segura de que dentro de un mes cada uno añadiera con un precio distinto; aquí hay
   * decisiones que costaron dinero aprender:
   *
   * <ul>
   *   <li><b>El precio de partida es el de VENTA</b> en la divisa activa, nunca el coste del proveedor:
   *       ese ya no sale del panel y dejaría la cesta a cero.</li>
   *   <li><b>Importe y divisa van siempre emparejados</b>: etiquetar el importe con la divisa equivocada
   *       es lo que una vez enseñó «117,26 €» por algo que valía 14,90 €.</li>
   *   <li><b>Con variantes, se coge la primera con existencias</b>; si no queda ninguna NO se añade y se
   *       avisa. Añadir a ciegas acaba en pedidos con la talla equivocada.</li>
   * </ul>
   */
  async ejecuta(producto: ProductoAnadible): Promise<ResultadoAlAnadir> {
    const consulta = await this.ficha.consulta(producto.slug, this.preferencias.idioma());
    // Si la ficha no responde se añade sin variante: es preferible a perder la venta.
    const ficha = consulta.ok ? consulta.valor : undefined;
    const variante = ficha ? this.varianteElegida(ficha) : undefined;

    if (ficha && ficha.variantes.length > 0 && !variante) {
      return { estado: 'sin-existencias', sugiereAhorroDeEnvio: false };
    }

    this.mete(this.componeLinea(producto, ficha, variante));
    return { estado: 'anadido', sugiereAhorroDeEnvio: ficha?.pedidoMinimo === 1 };
  }

  /** La primera variante activa CON existencias. El orden es el que manda el catálogo. */
  private varianteElegida(ficha: FichaParaAnadir): VarianteParaAnadir | undefined {
    return ficha.variantes.find((v) => v.activa && v.existencias > 0);
  }

  private componeLinea(
    producto: ProductoAnadible,
    ficha: FichaParaAnadir | undefined,
    variante: VarianteParaAnadir | undefined,
  ): LineaDeCarrito {
    // Las sugerencias del asistente llegan SIN precio a propósito —por ahí no viaja ningún importe—, así
    // que el precio de venta se toma de la ficha en el momento de añadir.
    const sinPrecioPropio = producto.precioMostrado == null;
    const divisa = sinPrecioPropio ? ficha?.divisaMostrada : producto.divisaMostrada;
    const mostrado = sinPrecioPropio ? ficha?.precioMostrado : producto.precioMostrado;
    const origen = variante?.precio ?? mostrado ?? 0;

    return {
      productId: producto.id,
      variantId: variante?.id,
      sku: variante?.sku,
      etiquetaDeVariante: etiquetaDe(variante),
      slug: producto.slug,
      titulo: producto.titulo,
      imagen: producto.imagen,
      precioUnitarioOrigen: Number(origen),
      divisaDeOrigen: divisa ?? 'USD',
      precioUnitarioMostrado: mostrado,
      divisaMostrada: divisa,
      pedidoMinimo: ficha?.pedidoMinimo,
      cantidad: 1,
    };
  }

  /**
   * La escritura manda la línea YA CONSOLIDADA porque el backend FIJA la cantidad en vez de sumarla: el
   * total resultante lo conoce quien está viendo la cesta, no el servidor.
   */
  private mete(linea: LineaDeCarrito): void {
    const antes = this.estado.lineas();
    const consolidada = this.estado.anade(linea);
    if (!consolidada) {
      return;
    }
    void this.sincronizador.encola(
      antes,
      () => this.remoto.guarda(consolidada),
      (lineas) => aseguraLinea(lineas, consolidada),
    );
  }
}

/** «Negro / M» a partir de los ejes elegidos. Vacío si la variante no declara ninguno. */
function etiquetaDe(variante: VarianteParaAnadir | undefined): string | undefined {
  if (!variante) {
    return undefined;
  }
  const partes = Object.values(variante.opciones ?? {}).filter(Boolean);
  return partes.length > 0 ? partes.join(' / ') : undefined;
}
