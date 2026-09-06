import { Injectable, inject, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  CambiaVerificacionDeProveedores,
  EliminaProveedores,
  GuardaProveedor,
  ListaProveedores,
  ReindexaProveedores,
} from '../../../application/catalogo/use-case/administra-proveedores.use-case';
import {
  BorradorDeProveedor,
  CriterioDeProveedores,
  PaginaDeProveedores,
} from '../../../domain/catalogo/model/proveedor-admin';
import { huboFallos, primerosErrores } from '../../../domain/catalogo/model/resultado-masivo';
import { mensajeDeError } from '../etiquetas';

/** Las acciones de la pantalla de proveedores, con su aviso. */
@Injectable()
export class AccionesDeProveedores {
  private readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly listaProveedores = inject(ListaProveedores);
  private readonly guardaProveedor = inject(GuardaProveedor);
  private readonly eliminaProveedores = inject(EliminaProveedores);
  private readonly verificacion = inject(CambiaVerificacionDeProveedores);
  private readonly reindexaProveedores = inject(ReindexaProveedores);

  private readonly _ocupado = signal(false);
  readonly ocupado = this._ocupado.asReadonly();

  async lista(criterio: CriterioDeProveedores): Promise<PaginaDeProveedores | null> {
    const resultado = await this.listaProveedores.ejecuta(criterio);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.suppliers.error'));
      return null;
    }
    return resultado.valor;
  }

  async guarda(borrador: BorradorDeProveedor, id: string | null): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await this.guardaProveedor.ejecuta(borrador, id);
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.suppliers.error'));
        return false;
      }
      this.avisos.exito(this.t('admin.suppliers.saved'));
      return true;
    } finally {
      this._ocupado.set(false);
    }
  }

  async elimina(ids: readonly string[]): Promise<boolean> {
    return this.enLote(() => this.eliminaProveedores.ejecuta(ids), 'admin.suppliers.deleted');
  }

  /** Sin valor ALTERNA el de una fila; con valor lo FIJA para todos los marcados. */
  async verifica(ids: readonly string[], verificado?: boolean): Promise<boolean> {
    return this.enLote(() => this.verificacion.ejecuta(ids, verificado), 'admin.bulk.done');
  }

  async reindexa(): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await this.reindexaProveedores.ejecuta();
      if (!resultado.ok) {
        this.avisos.error(this.t('admin.reindex_error'));
        return false;
      }
      this.avisos.exito(this.tCon('admin.reindex_ok', { n: resultado.valor }));
      return true;
    } finally {
      this._ocupado.set(false);
    }
  }

  private async enLote(
    accion: () => Promise<{
      ok: boolean;
      valor?: { correctos: number; fallidos: number; errores: readonly string[] };
      error?: { mensaje?: string };
    }>,
    claveDeExito: string,
  ): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await accion();
      if (!resultado.ok || !resultado.valor) {
        this.avisos.error(mensajeDeError(this.t, resultado.error ?? {}, 'admin.suppliers.error'));
        return false;
      }
      if (huboFallos(resultado.valor)) {
        const mensaje = this.tCon('admin.bulk.done', {
          ok: resultado.valor.correctos,
          fail: resultado.valor.fallidos,
        });
        this.avisos.muestra({
          tipo: 'warning',
          mensaje: `${mensaje}\n${primerosErrores(resultado.valor)}`,
        });
      } else {
        this.avisos.exito(this.t(claveDeExito));
      }
      return true;
    } finally {
      this._ocupado.set(false);
    }
  }
}
