import { Injectable, Injector, inject } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Los gestos de administración sobre la ficha: borrar una foto, quitar el vídeo, reordenar la galería,
 * eliminar una variante o copiar la foto de un color.
 *
 * <p>Está separado de la pantalla por dos motivos. El primero es que la ficha pública no tiene por qué
 * saber nada de esto. El segundo, y más importante, es que el caso de uso que escribe se trae con un
 * `import()` EN EL MOMENTO DEL GESTO: así el código de edición no viaja en el paquete que descarga
 * quien compra, que es el 99 % de quien abre una ficha.
 *
 * <p>Cada gesto sigue el mismo guion —confirmar, ejecutar, avisar y recargar—, y por eso hay una sola
 * función que lo aplica: cuando cada botón lo hacía a su manera, alguno se olvidaba de recargar y la
 * pantalla se quedaba enseñando lo que ya no existía.
 */
@Injectable()
export class AccionesDeAdmin {
  private readonly inyector = inject(Injector);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly traduccion = inject(TraduccionService);
  private readonly t = this.traduccion.t;

  async borraImagen(idDeLaImagen: string, alTerminar: () => void): Promise<void> {
    await this.conConfirmacion(
      'admin.catalog.images.delete_confirm',
      (editor) => editor.borraImagen(idDeLaImagen),
      'admin.catalog.images.deleted',
      alTerminar,
    );
  }

  /**
   * Quita VARIAS fotos con una sola pregunta.
   *
   * <p>Una sola pregunta y no una por foto: quien limpia una galería de ocho imágenes del proveedor no
   * puede tener que confirmar ocho veces. El recuento va en el mensaje a propósito —no es lo mismo
   * perder una foto que ocho, y quien selecciona en lote no siempre sabe cuántas lleva marcadas—.
   *
   * <p>Un fallo en una NO detiene a las demás, y al final se dice cuántas cayeron: un borrado a medias
   * que se anuncia como éxito deja a quien administra creyendo que la galería quedó limpia.
   */
  async borraImagenes(ids: readonly string[], alTerminar: (borradas: readonly string[]) => void): Promise<void> {
    return this.borraSeleccion(ids, null, alTerminar, () => undefined);
  }

  /**
   * Quita lo marcado en la galería —fotos y, si se marcó, el vídeo— con UNA sola pregunta.
   *
   * <p>El vídeo entra aquí y no por su propio gesto porque quien marca cuatro cosas y pulsa «eliminar
   * seleccionadas» espera que le pregunten una vez, no dos: una por las fotos y otra por el vídeo. Va
   * al final del borrado a propósito, para que un fallo suyo no impida quitar las fotos.
   *
   * @param idDelProductoConVideo el producto cuyo vídeo hay que quitar, o {@code null} si no se marcó
   */
  async borraSeleccion(
    ids: readonly string[],
    idDelProductoConVideo: string | null,
    alTerminar: (borradas: readonly string[]) => void,
    alQuitarElVideo: () => void,
  ): Promise<void> {
    const cuantas = ids.length + (idDelProductoConVideo ? 1 : 0);
    if (cuantas === 0) {
      return;
    }
    const confirmado = await this.dialogo.confirma(
      this.traduccion.tCon('admin.catalog.images.delete_selected_confirm', { n: cuantas }),
    );
    if (!confirmado) {
      return;
    }
    const editor = await this.editor();
    const borradas: string[] = [];
    for (const id of ids) {
      const resultado = await editor.borraImagen(id);
      if (resultado.ok) {
        borradas.push(id);
      }
    }
    let videoFuera = false;
    if (idDelProductoConVideo) {
      videoFuera = (await editor.borraVideo(idDelProductoConVideo)).ok;
    }
    const pedidas = ids.length + (idDelProductoConVideo ? 1 : 0);
    const hechas = borradas.length + (videoFuera ? 1 : 0);
    if (hechas < pedidas) {
      this.avisos.error(
        this.traduccion.tCon('admin.catalog.images.partial', {
          ok: hechas,
          fail: pedidas - hechas,
        }),
      );
    } else {
      this.avisos.exito(this.t('admin.catalog.images.deleted'));
    }
    alTerminar(borradas);
    if (videoFuera) {
      alQuitarElVideo();
    }
  }

  async borraVideo(idDelProducto: string, alTerminar: () => void): Promise<void> {
    await this.conConfirmacion(
      'admin.catalog.video.delete_confirm',
      (editor) => editor.borraVideo(idDelProducto),
      'admin.catalog.video.deleted',
      alTerminar,
    );
  }

  async borraVariante(idDelValor: string, alTerminar: () => void): Promise<void> {
    await this.conConfirmacion(
      'admin.catalog.variant.delete_confirm',
      (editor) => editor.borraValorDeVariante(idDelValor),
      'admin.catalog.variant.deleted',
      alTerminar,
    );
  }

  /** Reordenar deja la PRIMERA como imagen principal, así que no se pide confirmación: se ve al vuelo. */
  async reordena(
    idDelProducto: string,
    idsEnOrden: readonly string[],
    alTerminar: () => void,
  ): Promise<void> {
    const editor = await this.editor();
    this.avisa(await editor.reordenaImagenes(idDelProducto, idsEnOrden), 'admin.catalog.edit.ok', alTerminar);
  }

  /** Copia la foto de un color a la galería: la misma dirección, sin volver a subir el fichero. */
  async copiaFotoDeVariante(
    idDelProducto: string,
    direccion: string,
    alTerminar: () => void,
  ): Promise<void> {
    const editor = await this.editor();
    this.avisa(
      await editor.anadeImagen(idDelProducto, direccion),
      'admin.catalog.images.variant_added',
      alTerminar,
    );
  }

  private async conConfirmacion(
    claveDeConfirmacion: string,
    accion: (editor: EditorDeFicha) => Promise<Result<void, AppError>>,
    claveDeExito: string,
    alTerminar: () => void,
  ): Promise<void> {
    if (!(await this.dialogo.confirma(this.t(claveDeConfirmacion)))) {
      return;
    }
    const editor = await this.editor();
    this.avisa(await accion(editor), claveDeExito, alTerminar);
  }

  private avisa(
    resultado: Result<void, AppError>,
    claveDeExito: string,
    alTerminar: () => void,
  ): void {
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.catalog.edit.error'));
      return;
    }
    this.avisos.exito(this.t(claveDeExito));
    alTerminar();
  }

  /** El editor se trae a demanda. Es lo que mantiene su código fuera del paquete de quien compra. */
  private async editor(): Promise<EditorDeFicha> {
    const { EditaLaFicha } = await import('../application/use-case/edita-la-ficha.use-case');
    return this.inyector.get(EditaLaFicha);
  }
}

/** La parte del editor que usan estos gestos. Se declara para no importar el caso de uso al cargar. */
interface EditorDeFicha {
  borraImagen(idDeLaImagen: string): Promise<Result<void, AppError>>;
  borraVideo(idDelProducto: string): Promise<Result<void, AppError>>;
  borraValorDeVariante(idDelValor: string): Promise<Result<void, AppError>>;
  reordenaImagenes(idDelProducto: string, idsEnOrden: readonly string[]): Promise<Result<void, AppError>>;
  anadeImagen(idDelProducto: string, direccion: string): Promise<Result<void, AppError>>;
}
