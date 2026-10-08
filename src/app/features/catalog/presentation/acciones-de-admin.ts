import { Injectable, Injector, inject } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FichaDeProducto } from '../domain/model/producto';
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

  /**
   * Fija el recargo de UN tramo de cantidad y devuelve la ficha ya recalculada.
   *
   * <p>NO pregunta, a diferencia de borrar: cambiar un número se deshace volviendo a escribirlo,
   * mientras que un tramo borrado hay que reconstruirlo de memoria. Y se hace en cadena, escalón a
   * escalón, mientras se ajusta el precio: una pregunta por cada uno sobraría.
   */
  async guardaRecargoDeTramo(
    idDelProducto: string,
    cambio: { cantidadMinima: number; recargoPct: number | null },
    alTerminar: (ficha: FichaDeProducto | null) => void,
  ): Promise<void> {
    const editor = await this.editor();
    const resultado = await editor.guardaRecargoDeTramo(
      idDelProducto,
      cambio.cantidadMinima,
      cambio.recargoPct,
    );
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.catalog.edit.error'));
      return;
    }
    this.avisos.exito(this.t('admin.catalog.edit.ok'));
    alTerminar(resultado.valor);
  }

  async borraImagen(idDeLaImagen: string, alTerminar: () => void): Promise<void> {
    await this.conConfirmacion(
      'admin.catalog.images.delete_confirm',
      (editor) => editor.borraImagen(idDeLaImagen),
      'admin.catalog.images.deleted',
      alTerminar,
    );
  }

  /**
   * Quita lo marcado en la galería —fotos y, si se marcó, el vídeo— con UNA sola pregunta y UNA sola
   * petición.
   *
   * <p>Una sola pregunta y no una por foto: quien limpia una galería de ocho imágenes del proveedor
   * no puede tener que confirmar ocho veces. El recuento va en el mensaje a propósito —no es lo
   * mismo perder una foto que ocho, y quien selecciona en lote no siempre sabe cuántas lleva
   * marcadas—.
   *
   * <p><b>Y una sola petición, desde el 8-oct-2026.</b> Antes recorría la lista llamando a
   * `borraImagen` una vez por foto, en serie. Cada una de esas llamadas REINDEXA el producto entero,
   * así que vaciar una tira de doce imágenes eran doce viajes al servidor y doce reindexados del
   * mismo producto: por eso «eliminar todas» tardaba tanto. Ahora va la lista entera y el servidor
   * vacía la colección de una vez y reindexa al final.
   *
   * <p>El vídeo entra aquí y no por su propio gesto porque quien marca cuatro cosas y pulsa
   * «eliminar seleccionadas» espera que le pregunten una vez, no dos. Va al final del borrado a
   * propósito, para que un fallo suyo no impida quitar las fotos.
   *
   * <p>El servidor contesta con las que se borraron DE VERDAD, no con las que se pidieron: si alguna
   * falla, esa se queda donde está y la pantalla sigue diciendo la verdad.
   */
  async borraSeleccion(
    idDelProducto: string,
    ids: readonly string[],
    tambienElVideo: boolean,
    alTerminar: (borradas: readonly string[]) => void,
    alQuitarElVideo: () => void,
    claveDeLaPregunta = 'admin.catalog.images.delete_selected_confirm',
  ): Promise<void> {
    const cuantas = ids.length + (tambienElVideo ? 1 : 0);
    if (cuantas === 0) {
      return;
    }
    const confirmado = await this.dialogo.confirma(
      this.traduccion.tCon(claveDeLaPregunta, { n: cuantas }),
    );
    if (!confirmado) {
      return;
    }
    const editor = await this.editor();
    const resultado = ids.length > 0 ? await editor.borraImagenes(idDelProducto, ids) : null;
    const borradas = resultado?.ok ? resultado.valor : [];
    let videoFuera = false;
    if (tambienElVideo) {
      videoFuera = (await editor.borraVideo(idDelProducto)).ok;
    }
    const hechas = borradas.length + (videoFuera ? 1 : 0);
    if (hechas < cuantas) {
      this.avisos.error(
        this.traduccion.tCon('admin.catalog.images.partial', {
          ok: hechas,
          fail: cuantas - hechas,
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

  /**
   * Quita TODAS las fotos del detalle de una vez.
   *
   * <p>Es el mismo borrado en lote, con otra pregunta. Se separó porque no son el mismo gesto: quien
   * marca cuatro miniaturas sabe cuáles se lleva, y quien pulsa «eliminar todas» no está mirando
   * ninguna en concreto. La pregunta tiene que decir que se vacía la tira entera, no cuántas van
   * marcadas.
   *
   * <p>Nace de la galería de descripción que llega del proveedor con fotos de OTROS productos
   * mezcladas —medido en «1060450393509», chanclas con tres miniaturas de zapatillas—: ahí no se
   * salva ninguna, y quitarlas de una en una son doce confirmaciones.
   */
  async borraTodasLasImagenes(
    idDelProducto: string,
    ids: readonly string[],
    alTerminar: (borradas: readonly string[]) => void,
  ): Promise<void> {
    return this.borraSeleccion(
      idDelProducto,
      ids,
      false,
      alTerminar,
      () => undefined,
      'admin.catalog.images.delete_all_confirm',
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
  borraImagenes(
    idDelProducto: string,
    idsDeLasImagenes: readonly string[],
  ): Promise<Result<readonly string[], AppError>>;
  borraVideo(idDelProducto: string): Promise<Result<void, AppError>>;
  borraValorDeVariante(idDelValor: string): Promise<Result<void, AppError>>;
  reordenaImagenes(idDelProducto: string, idsEnOrden: readonly string[]): Promise<Result<void, AppError>>;
  anadeImagen(idDelProducto: string, direccion: string): Promise<Result<void, AppError>>;
  guardaRecargoDeTramo(
    idDelProducto: string,
    cantidadMinima: number,
    recargoPct: number | null,
  ): Promise<Result<FichaDeProducto, AppError>>;
}
