import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { FichaDeProducto } from '../model/producto';

/**
 * El editor en línea de la ficha, para el administrador.
 *
 * <p>Va en un puerto APARTE del catálogo y no mezclado con él: quien pinta la ficha pública no tiene
 * por qué conocer diez métodos de escritura que nunca va a llamar, y el bloque de administración se
 * carga en diferido —solo se descarga si quien mira es administrador—. Que sea otro puerto es lo que
 * permite que ese código ni siquiera viaje al navegador de quien compra.
 *
 * <p>Los importes en yuanes se guardan POR NOMBRE DE CAMPO: se manda solo el que se toca y el que no
 * viaja se queda como estaba, que es justo lo que permite cambiar una bolsa de subsidio sin pisar la
 * otra.
 */
/**
 * Lo que el administrador retoca a mano desde la ficha.
 *
 * <p>Casi todos son importes en YUANES. La excepción es `margenInternoPct`, que es un PORCENTAJE:
 * ocupa el hueco donde hasta el 25-sep-2026 había un importe llamado «IVA» que nunca fue el IVA de
 * China —ese es el 13 %— sino el 50 % exacto de la base, o sea margen nuestro con otro nombre.
 * Guardado en porcentaje sigue al coste del proveedor sin que nadie lo recalcule.
 */
export type CampoEnYuanes =
  | 'surchargeCny'
  | 'shippingUserCny'
  | 'dutyUserCny'
  | 'margenInternoPct';

export interface EdicionDeFichaPort {
  /**
   * Marca o desmarca la revisión manual, y devuelve la ficha ya recalculada.
   *
   * <p>Devolverla es lo que permite pintar el cambio sin volver a pedir la ficha entera: el backend
   * responde con el producto completo y aquí se descartaba.
   */
  marcaVerificado(idDelProducto: string, verificado: boolean): Promise<Result<FichaDeProducto, AppError>>;

  /** Igual que la anterior: el enlace de origen se guarda y vuelve la ficha, no un simple «vale». */
  guardaUrlDeOrigen(idDelProducto: string, url: string): Promise<Result<FichaDeProducto, AppError>>;
  /**
   * Guarda uno o VARIOS importes en yuanes y devuelve la ficha ya recalculada.
   *
   * <p>Devolverla es lo que permite pintar el cambio sin volver a pedir la ficha entera. El backend ya
   * la contestaba —su retoque rápido responde con el producto completo— y aquí se descartaba.
   */
  guardaImporteEnYuanes(
    idDelProducto: string,
    campo: CampoEnYuanes,
    valor: number,
  ): Promise<Result<FichaDeProducto, AppError>>;


  /**
   * Los tres importes de una vez, para quien los edita juntos.
   *
   * <p>Se manda SOLO lo que se pasa: las bolsas de subvención son estancas por diseño —una cubre el
   * envío y la otra el arancel— y enviar las tres siempre pisaría las que nadie estaba tocando.
   */
  guardaImportesEnYuanes(
    idDelProducto: string,
    importes: Partial<Record<CampoEnYuanes, number>>,
  ): Promise<Result<FichaDeProducto, AppError>>;
  /**
   * El recargo propio de UN tramo de cantidad, en yuanes, y devuelve la ficha ya recalculada.
   *
   * <p>Va aquí y no solo en el panel porque el recargo se decide MIRANDO la tabla de cantidades, que
   * es donde se ve lo que cobra cada escalón. Tenerlo únicamente en otra pantalla obligaba a salir de
   * la ficha, buscar el producto y volver, y en ese viaje se pierde lo que se estaba comparando.
   *
   * <p>Nulo devuelve el tramo a heredar el recargo del producto; cero es un recargo de cero, que es
   * otra cosa y tiene que poder escribirse.
   */
  guardaRecargoDeTramo(
    idDelProducto: string,
    cantidadMinima: number,
    recargoCny: number | null,
  ): Promise<Result<FichaDeProducto, AppError>>;

  borraImagen(idDeLaImagen: string): Promise<Result<void, AppError>>;
  anadeImagen(idDelProducto: string, direccion: string): Promise<Result<void, AppError>>;
  reordenaImagenes(idDelProducto: string, idsEnOrden: readonly string[]): Promise<Result<void, AppError>>;
  borraValorDeVariante(idDelValor: string): Promise<Result<void, AppError>>;
  borraVideo(idDelProducto: string): Promise<Result<void, AppError>>;
  borraProducto(idDelProducto: string): Promise<Result<void, AppError>>;
}

export const EDICION_DE_FICHA_PORT = new InjectionToken<EdicionDeFichaPort>('EdicionDeFichaPort');
