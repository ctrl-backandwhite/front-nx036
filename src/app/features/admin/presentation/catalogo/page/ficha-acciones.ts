import { Injectable, inject, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ActualizaFicha } from '../../../application/catalogo/use-case/actualiza-ficha.use-case';
import { ActualizaPrecioDeVariante } from '../../../application/catalogo/use-case/actualiza-precio-de-variante.use-case';
import { AnadeImagenes } from '../../../application/catalogo/use-case/anade-imagenes.use-case';
import {
  EliminaValoresDeVariacion,
  FijaImagenDeValor,
  RenombraValorDeVariacion,
} from '../../../application/catalogo/use-case/edita-valores-de-variacion.use-case';
import { EliminaImagenes } from '../../../application/catalogo/use-case/elimina-imagenes.use-case';
import { EliminaTramoDePrecio } from '../../../application/catalogo/use-case/elimina-tramo-de-precio.use-case';
import { ReordenaImagenes } from '../../../application/catalogo/use-case/reordena-imagenes.use-case';
import { CambiosDeFicha } from '../../../domain/catalogo/model/ficha-de-producto';
import { mensajeDeError } from '../etiquetas';

/**
 * Las acciones de la ficha, con su aviso.
 *
 * <p>Van aparte de la pantalla por la misma razón que en el listado: son once acciones con el mismo
 * patrón —ejecutar, avisar, soltar el «ocupado»— y metidas en el componente lo empujaban muy por encima
 * de las cuatrocientas líneas.
 */
@Injectable()
export class AccionesDeFicha {
  private readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly dialogo = inject(DialogoStore);
  private readonly actualiza = inject(ActualizaFicha);
  private readonly borraTramo = inject(EliminaTramoDePrecio);
  private readonly anade = inject(AnadeImagenes);
  private readonly borraImagenes = inject(EliminaImagenes);
  private readonly reordena_ = inject(ReordenaImagenes);
  private readonly renombra = inject(RenombraValorDeVariacion);
  private readonly fijaFoto = inject(FijaImagenDeValor);
  private readonly borraValores = inject(EliminaValoresDeVariacion);
  private readonly precioDeVariante = inject(ActualizaPrecioDeVariante);

  private readonly _ocupado = signal(false);
  readonly ocupado = this._ocupado.asReadonly();

  async guarda(id: string, cambios: CambiosDeFicha, idioma: string): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await this.actualiza.ejecuta(id, cambios, idioma);
      if (resultado.ok) {
        this.avisos.exito(this.t('admin.catalog.edit.ok'));
      } else {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.catalog.edit.error'));
      }
      return resultado.ok;
    } finally {
      this._ocupado.set(false);
    }
  }

  /**
   * Quitar un tramo PREGUNTA antes.
   *
   * <p>No lo hacía, y borraba al primer clic. Un tramo de precio es una regla de venta —a partir de
   * tantas unidades, este precio— y recuperarla obliga a volver a teclearla sabiendo cuál era. El front
   * anterior sí confirma, y la clave del mensaje estaba escrita en los ocho diccionarios sin que la
   * usara nadie: la traducción existía, la pregunta no.
   */
  async eliminaTramo(id: string, cantidadMinima: number): Promise<boolean> {
    if (!(await this.dialogo.confirma(this.t('admin.catalog.detail.tiers.delete_confirm')))) {
      return false;
    }
    const resultado = await this.borraTramo.ejecuta(id, cantidadMinima);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.catalog.edit.error'));
    }
    return resultado.ok;
  }

  /**
   * Añade imágenes por dirección.
   *
   * <p>Un fallo PARCIAL se dice con su recuento: las que sí entraron se quedan, y callarlo dejaba
   * pensando que se habían añadido todas.
   */
  async anadeImagenes(id: string, direcciones: readonly string[]): Promise<boolean> {
    const resultado = await this.anade.ejecuta(id, direcciones);
    if (resultado.ok && resultado.valor.fallidas.length) {
      this.avisos.error(
        this.tCon('admin.catalog.images.partial', {
          ok: resultado.valor.anadidas,
          fail: resultado.valor.fallidas.length,
        }),
      );
    } else if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.catalog.images.error'));
    }
    return resultado.ok;
  }

  /**
   * Quitar imágenes PREGUNTA antes, y el mensaje cambia si son varias.
   *
   * <p>Tampoco preguntaba: se borraban al pulsar la papelera. Y aquí duele más que en otros sitios,
   * porque las fotos vienen del proveedor y volver a ponerlas obliga a ir a buscarlas a la ficha de
   * origen. Las dos claves —una foto y varias— estaban en los ocho diccionarios sin usar.
   */
  async eliminaImagenes(ids: readonly string[]): Promise<boolean> {
    const pregunta =
      ids.length > 1
        ? this.tCon('admin.catalog.images.delete_selected_confirm', { n: ids.length })
        : this.t('admin.catalog.images.delete_confirm');
    if (!(await this.dialogo.confirma(pregunta))) {
      return false;
    }
    const resultado = await this.borraImagenes.ejecuta(ids);
    if (resultado.ok && resultado.valor.fallidas) {
      this.avisos.error(
        this.tCon('admin.catalog.images.partial', {
          ok: resultado.valor.borradas,
          fail: resultado.valor.fallidas,
        }),
      );
    }
    return resultado.ok;
  }

  /** Al reordenar, un fallo obliga a recargar: la galería local ya enseña el orden nuevo. */
  async reordenaImagenes(id: string, imagenIds: readonly string[]): Promise<boolean> {
    const resultado = await this.reordena_.ejecuta(id, imagenIds);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.catalog.images.error'));
    }
    return resultado.ok;
  }

  async renombraValor(id: string, etiqueta: string): Promise<boolean> {
    const resultado = await this.renombra.ejecuta(id, etiqueta);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.catalog.edit.error'));
    }
    return resultado.ok;
  }

  async fijaImagenDeValor(id: string, url: string): Promise<boolean> {
    const resultado = await this.fijaFoto.ejecuta(id, url);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.catalog.edit.error'));
    }
    return resultado.ok;
  }

  async eliminaValores(ids: readonly string[]): Promise<boolean> {
    const resultado = await this.borraValores.ejecuta(ids);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.catalog.edit.error'));
    }
    return resultado.ok;
  }

  async cambiaPrecioDeVariante(id: string, precio: number, anterior: number): Promise<boolean> {
    const resultado = await this.precioDeVariante.ejecuta(id, precio, anterior);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.catalog.edit.error'));
      return false;
    }
    return resultado.valor;
  }
}
