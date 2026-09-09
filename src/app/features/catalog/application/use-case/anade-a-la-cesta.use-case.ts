import { Injectable, inject } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { ANADIR_AL_CARRITO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { fotoParaCompartir } from '../../domain/model/galeria';
import { ProductoAnadible } from '@features/cart/domain/model/producto-anadible';
import { FichaDeProducto, ResumenDeProducto, VarianteDeProducto } from '../../domain/model/producto';
import { etiquetaDeVariante } from '../../domain/model/seleccion-de-variante';

/** Por qué no ha entrado en la cesta. */
export type MotivoDeRechazo = 'sin-existencias' | 'sin-precio';

/**
 * Meter un producto en la cesta desde cualquier sitio del catálogo, con las MISMAS reglas.
 *
 * <p>Estaba escrito dentro de la tarjeta y hacía falta en dos sitios más —la vista rápida y la ficha—.
 * Copiarlo habría sido la forma segura de que dentro de un mes cada uno añadiera con un precio distinto.
 *
 * <p>QUIÉN GUARDA LA CESTA. Este caso de uso ya no escribe contra el backend por su cuenta. Lo hacía
 * —un `PUT /me/cart` desde un adaptador propio— y era un fallo de bulto: la cesta de la aplicación, la
 * que cuenta la insignia de la cabecera y la que pinta la pantalla del carrito, vive en el contexto
 * «cart» y no se enteraba de nada. Se añadía un producto, el botón decía «Añadido», la insignia seguía
 * marcando lo de antes y al entrar en la cesta —navegando, sin recargar— el producto no estaba. Eran dos
 * cestas distintas escribiendo en el mismo sitio.
 *
 * <p>Ahora se añade por el PUERTO PÚBLICO de «cart» (`ANADIR_AL_CARRITO_PORT`), que es exactamente para
 * lo que existe. El catálogo sigue sin ver las tripas del otro contexto —ni su almacén, ni sus casos de
 * uso, ni sus adaptadores—: solo su contrato. Y de regalo, quien no ha iniciado sesión también puede
 * llenar la cesta, porque «cart» sabe guardarla en el equipo; con el `PUT` directo recibía un 401 y un
 * aviso de error.
 *
 * <p>Lo que sigue siendo de aquí son las REGLAS DEL CATÁLOGO sobre qué se añade:
 *
 * <ul>
 *   <li>El precio de partida es el de VENTA en la divisa activa, nunca el coste del proveedor: ese ya
 *       no viaja fuera del panel y dejaría la cesta a cero.
 *   <li>Importe y DIVISA van siempre emparejados: etiquetar el importe con la divisa equivocada es lo
 *       que una vez enseñó «117,26 €» por algo que valía 14,90 €.
 *   <li>Si en la ficha no queda ninguna variante disponible NO se añade nada y se dice. Añadir a ciegas
 *       acaba en pedidos con la talla equivocada.
 * </ul>
 */
@Injectable()
export class AnadeALaCesta {
  private readonly carrito = inject(ANADIR_AL_CARRITO_PORT);

  /**
   * Añade desde una TARJETA, que no trae variantes ni cantidad.
   *
   * <p>No se resuelve la variante aquí: se deja al contexto de la cesta, que ya sabe pedir la ficha
   * recortada a lo que necesita —pedido mínimo, precio y variantes— y quedarse con la primera con
   * existencias. Resolverlo dos veces era pedir la ficha ENTERA, con su galería, sus reseñas y su bloque
   * de cumplimiento, para acabar usando cuatro campos.
   */
  async desdeLaTarjeta(
    producto: ResumenDeProducto,
  ): Promise<Result<void, AppError | MotivoDeRechazo>> {
    return this.mete({
      id: producto.id,
      slug: producto.slug,
      titulo: producto.titulo,
      imagen: producto.imagenPrincipal,
      precioMostrado: producto.precio.importe,
      divisaMostrada: producto.precio.divisa,
    });
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
    return this.mete({
      id: ficha.id,
      slug: ficha.slug,
      titulo: ficha.titulo,
      // De la galería, NO de `imagenPrincipal`: el detalle del catálogo no devuelve `mainImage` —solo
      // lo hace el listado—, así que en la ficha ese campo viene siempre vacío y la línea se guardaba
      // sin imagen. En la cesta y en el pago salía un hueco gris con el nombre al lado. Se usa la
      // misma función que elige la foto al compartir: la marcada como principal, y si no, la primera.
      imagen: ficha.imagenPrincipal ?? fotoParaCompartir(ficha.imagenes),
      precioMostrado: Number(importe),
      divisaMostrada: ficha.precio.divisa ?? 'USD',
      eleccion: {
        varianteId: variante?.id,
        // El SKU se resuelve SIEMPRE: el de la variante si existe y, si no, el del producto. Así la
        // cesta nunca queda sin una referencia visible.
        sku: variante?.sku || ficha.sku,
        etiquetaDeVariante: etiquetaDeVariante(variante),
        precioUnitario: Number(importe),
        cantidad,
        pedidoMinimo: ficha.moq > 1 ? ficha.moq : undefined,
      },
    });
  }

  private async mete(producto: ProductoAnadible): Promise<Result<void, AppError | MotivoDeRechazo>> {
    const resultado = await this.carrito.anade(producto);
    return resultado.estado === 'anadido' ? exito(undefined) : fallo('sin-existencias');
  }
}

/** Distingue el fallo de red del rechazo por reglas, para que la pantalla enseñe el texto correcto. */
export function esMotivoDeRechazo(error: AppError | MotivoDeRechazo): error is MotivoDeRechazo {
  return typeof error === 'string';
}

/** Un error de aplicación con el que rellenar cuando el rechazo no viene del servidor. */
export const ERROR_AL_ANADIR: AppError = creaError('conflicto');
