import { Injectable, inject, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  ActivaCategoriasEnLote,
  AlternaCategoria,
  EliminaCategorias,
  GuardaCategoria,
  ListaCategorias,
  ListaTodasLasCategorias,
  ReindexaCategorias,
} from '../../../application/catalogo/use-case/administra-categorias.use-case';
import { ExportaCategorias } from '../../../application/catalogo/use-case/exporta-categorias.use-case';
import {
  BorradorDeCategoria,
  CategoriaAdmin,
  CriterioDeCategorias,
  PaginaDeCategorias,
} from '../../../domain/catalogo/model/categoria-admin';
import { mensajeDeError } from '../etiquetas';

/**
 * Las acciones de la pantalla de categorías, con su aviso.
 *
 * <p>Van aparte por lo mismo que en el resto del área: son siete acciones con el mismo patrón, y
 * metidas en el componente lo empujaban por encima de las cuatrocientas líneas.
 */
@Injectable()
export class AccionesDeCategorias {
  private readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly listaCategorias = inject(ListaCategorias);
  private readonly listaTodas = inject(ListaTodasLasCategorias);
  private readonly guardaCategoria = inject(GuardaCategoria);
  private readonly eliminaCategorias = inject(EliminaCategorias);
  private readonly alternaCategoria = inject(AlternaCategoria);
  private readonly activa = inject(ActivaCategoriasEnLote);
  private readonly reindexaCategorias = inject(ReindexaCategorias);
  private readonly exportaCategorias = inject(ExportaCategorias);

  private readonly _ocupado = signal(false);
  readonly ocupado = this._ocupado.asReadonly();

  async lista(criterio: CriterioDeCategorias): Promise<PaginaDeCategorias | null> {
    const resultado = await this.listaCategorias.ejecuta(criterio);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error));
      return null;
    }
    return resultado.valor;
  }

  async todas(): Promise<readonly CategoriaAdmin[] | null> {
    const resultado = await this.listaTodas.ejecuta();
    return resultado.ok ? resultado.valor : null;
  }

  async guarda(borrador: BorradorDeCategoria, id: string | null): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await this.guardaCategoria.ejecuta(borrador, id);
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.categories.error.generic'));
        return false;
      }
      this.avisos.exito(this.t(id ? 'admin.categories.updated_ok' : 'admin.categories.created_ok'));
      return true;
    } finally {
      this._ocupado.set(false);
    }
  }

  /** Borra una o varias. El motivo de cada negativa viaja con su identificador para poder verlo. */
  async borra(ids: readonly string[]): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await this.eliminaCategorias.ejecuta(ids);
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.categories.delete_error'));
        return false;
      }
      const { borradas, fallos } = resultado.valor;
      const mensaje = this.tCon('admin.categories.delete_selected_done', {
        ok: borradas,
        fail: fallos.length,
      });
      if (fallos.length) {
        this.avisos.muestra({ tipo: 'warning', mensaje: `${mensaje}\n${fallos.slice(0, 8).join('\n')}` });
      } else {
        this.avisos.exito(mensaje);
      }
      return true;
    } finally {
      this._ocupado.set(false);
    }
  }

  async alterna(id: string): Promise<boolean> {
    const resultado = await this.alternaCategoria.ejecuta(id);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error));
    }
    return resultado.ok;
  }

  async activaEnLote(ids: readonly string[], activa: boolean): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await this.activa.ejecuta(ids, activa);
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.categories.reindex_error'));
        return false;
      }
      this.avisos.exito(`${resultado.valor} · ${this.t('admin.categories.bulk_done')}`);
      return true;
    } finally {
      this._ocupado.set(false);
    }
  }

  async reindexa(): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await this.reindexaCategorias.ejecuta();
      if (!resultado.ok) {
        this.avisos.error(this.t('admin.categories.reindex_error'));
        return false;
      }
      this.avisos.exito(this.tCon('admin.categories.reindex_ok', { n: resultado.valor }));
      return true;
    } finally {
      this._ocupado.set(false);
    }
  }

  /** Devuelve cuántas se exportaron, o `null` si no se pudo leer el árbol completo. */
  async exporta(): Promise<number | null> {
    const resultado = await this.exportaCategorias.ejecuta();
    return resultado.ok ? resultado.valor : null;
  }
}
