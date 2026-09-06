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
