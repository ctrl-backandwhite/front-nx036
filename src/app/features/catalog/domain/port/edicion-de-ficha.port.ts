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
export type CampoEnYuanes = 'surchargeCny' | 'shippingUserCny' | 'dutyUserCny';

export interface EdicionDeFichaPort {
  marcaVerificado(idDelProducto: string, verificado: boolean): Promise<Result<void, AppError>>;
  guardaUrlDeOrigen(idDelProducto: string, url: string): Promise<Result<void, AppError>>;
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
  borraImagen(idDeLaImagen: string): Promise<Result<void, AppError>>;
  anadeImagen(idDelProducto: string, direccion: string): Promise<Result<void, AppError>>;
  reordenaImagenes(idDelProducto: string, idsEnOrden: readonly string[]): Promise<Result<void, AppError>>;
  borraValorDeVariante(idDelValor: string): Promise<Result<void, AppError>>;
  borraVideo(idDelProducto: string): Promise<Result<void, AppError>>;
  borraProducto(idDelProducto: string): Promise<Result<void, AppError>>;
}

export const EDICION_DE_FICHA_PORT = new InjectionToken<EdicionDeFichaPort>('EdicionDeFichaPort');
