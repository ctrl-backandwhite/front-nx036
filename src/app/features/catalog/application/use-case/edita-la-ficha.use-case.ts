import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CampoEnYuanes, EDICION_DE_FICHA_PORT } from '../../domain/port/edicion-de-ficha.port';
import { FichaDeProducto } from '../../domain/model/producto';

/**
 * El editor en línea de la ficha, para el administrador.
 *
 * <p>Existe para que la ficha se corrija DONDE SE VE. Antes, un enlace de origen mal importado o una
 * foto de más obligaban a ir al panel, buscar el producto y volver, y en ese viaje se perdía qué se
 * estaba mirando. Aquí cada gesto es una operación sola y el resultado se recarga en el sitio.
 *
 * <p>Solo lo cargan las pantallas de administración, que van en diferido: quien compra no se descarga
 * ni una línea de esto.
 */
@Injectable()
export class EditaLaFicha {
  private readonly puerto = inject(EDICION_DE_FICHA_PORT);

  marcaVerificado(
    idDelProducto: string,
    verificado: boolean,
  ): Promise<Result<FichaDeProducto, AppError>> {
    return this.puerto.marcaVerificado(idDelProducto, verificado);
  }

  /**
   * El enlace a la ficha del proveedor. El backend valida esquema y dominio y devuelve el motivo YA
   * traducido si no vale, así que aquí no se duplica la comprobación: dos validaciones separadas acaban
   * diciendo cosas distintas.
   */
  guardaUrlDeOrigen(idDelProducto: string, url: string): Promise<Result<FichaDeProducto, AppError>> {
    return this.puerto.guardaUrlDeOrigen(idDelProducto, url);
  }

  guardaImporteEnYuanes(
    idDelProducto: string,
    campo: CampoEnYuanes,
    valor: number,
  ): Promise<Result<FichaDeProducto, AppError>> {
    return this.puerto.guardaImporteEnYuanes(idDelProducto, campo, valor);
  }

  /** Los tres importes de una vez: un solo viaje y una sola ficha de vuelta. */
  guardaImportesEnYuanes(
    idDelProducto: string,
    importes: Partial<Record<CampoEnYuanes, number>>,
  ): Promise<Result<FichaDeProducto, AppError>> {
    return this.puerto.guardaImportesEnYuanes(idDelProducto, importes);
  }

  /**
   * El recargo propio de un tramo de cantidad. Nulo devuelve el tramo a heredar el del producto.
   *
   * <p>Vuelve la ficha ya recalculada: el precio de ese escalón cambia con su recargo, y devolverla
   * evita tener que pedir la ficha entera para enterarse de un número.
   */
  guardaRecargoDeTramo(
    idDelProducto: string,
    cantidadMinima: number,
    recargoCny: number | null,
  ): Promise<Result<FichaDeProducto, AppError>> {
    return this.puerto.guardaRecargoDeTramo(idDelProducto, cantidadMinima, recargoCny);
  }

  borraImagen(idDeLaImagen: string): Promise<Result<void, AppError>> {
    return this.puerto.borraImagen(idDeLaImagen);
  }

  /** Copia una foto de variante a la galería: la MISMA dirección, sin volver a subir el fichero. */
  anadeImagen(idDelProducto: string, direccion: string): Promise<Result<void, AppError>> {
    return this.puerto.anadeImagen(idDelProducto, direccion);
  }

  /** Reordenar deja la PRIMERA como imagen principal del producto. */
  reordenaImagenes(
    idDelProducto: string,
    idsEnOrden: readonly string[],
  ): Promise<Result<void, AppError>> {
    return this.puerto.reordenaImagenes(idDelProducto, idsEnOrden);
  }

  borraValorDeVariante(idDelValor: string): Promise<Result<void, AppError>> {
    return this.puerto.borraValorDeVariante(idDelValor);
  }

  borraVideo(idDelProducto: string): Promise<Result<void, AppError>> {
    return this.puerto.borraVideo(idDelProducto);
  }

  borraProducto(idDelProducto: string): Promise<Result<void, AppError>> {
    return this.puerto.borraProducto(idDelProducto);
  }
}
