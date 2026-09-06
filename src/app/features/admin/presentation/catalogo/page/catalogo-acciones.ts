import { Injectable, inject, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { AplicaRecargo } from '../../../application/catalogo/use-case/aplica-recargo.use-case';
import { AplicaSubvencion } from '../../../application/catalogo/use-case/aplica-subvencion.use-case';
import { CambiaEstadoDeProductos } from '../../../application/catalogo/use-case/cambia-estado-de-productos.use-case';
import { DuplicaProducto } from '../../../application/catalogo/use-case/duplica-producto.use-case';
import { EliminaProductos } from '../../../application/catalogo/use-case/elimina-productos.use-case';
import { MarcaProductoVerificado } from '../../../application/catalogo/use-case/marca-producto-verificado.use-case';
import { EstadoDeProducto } from '../../../domain/catalogo/model/producto-admin';
import {
  ResultadoMasivo,
  huboFallos,
  primerosErrores,
} from '../../../domain/catalogo/model/resultado-masivo';
import {
  PeticionDeRecargo,
  PeticionDeSubvencion,
} from '../../../domain/catalogo/port/productos-admin.port';
import { mensajeDeError } from '../etiquetas';

/**
 * Las acciones del listado, con su aviso.
 *
 * <p>Está aparte de la pantalla porque son NUEVE acciones y cada una tiene el mismo patrón: ejecutar,
 * decir cómo fue y dejar de estar ocupada. Metidas en el componente, la página pasaba de las
 * cuatrocientas líneas y el patrón se copiaba nueve veces.
 *
 * <p>Todas avisan del fallo, incluso las de lote. Una petición que ni siquiera llega —red caída, sesión
 * perdida— no ha aplicado nada: sin aviso, la pantalla se queda igual que antes y se dan por publicados
 * decenas de productos que siguen en borrador.
 */
@Injectable()
export class AccionesDelCatalogo {
  private readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly cambiaEstados = inject(CambiaEstadoDeProductos);
  private readonly eliminaProductos = inject(EliminaProductos);
  private readonly marca = inject(MarcaProductoVerificado);
  private readonly duplica_ = inject(DuplicaProducto);
  private readonly recargo_ = inject(AplicaRecargo);
  private readonly subvencion_ = inject(AplicaSubvencion);

  private readonly _ocupado = signal(false);
  readonly ocupado = this._ocupado.asReadonly();

  async cambiaEstado(ids: readonly string[], estado: EstadoDeProducto): Promise<boolean> {
    return this.enLote(() => this.cambiaEstados.ejecuta(ids, estado), 'admin.bulk.done');
  }

  async elimina(ids: readonly string[]): Promise<boolean> {
    return this.enLote(
      () => this.eliminaProductos.ejecuta(ids),
      'admin.catalog.bulk_delete_done',
    );
  }

  async marcaVerificado(id: string, verificado: boolean): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await this.marca.ejecuta(id, verificado, 'es');
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error));
      }
      return resultado.ok;
    } finally {
      this._ocupado.set(false);
    }
  }

  async duplica(id: string): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await this.duplica_.ejecuta(id);
      if (resultado.ok) {
        this.avisos.exito(this.t('admin.catalog.actions.duplicated'));
      } else {
        this.avisos.error(mensajeDeError(this.t, resultado.error));
      }
      return resultado.ok;
    } finally {
      this._ocupado.set(false);
    }
  }

  async recargo(peticion: PeticionDeRecargo): Promise<boolean> {
    return this.conRecuento(
      () => this.recargo_.ejecuta(peticion),
      'admin.catalog.surcharge.done',
    );
  }

  async subvencion(peticion: PeticionDeSubvencion): Promise<boolean> {
    return this.conRecuento(
      () => this.subvencion_.ejecuta(peticion),
      'admin.catalog.subsidy.done',
    );
  }

  /** El patrón de un lote: recuento de aciertos y fallos, con los primeros motivos si los hubo. */
  private async enLote(
    accion: () => Promise<{ ok: boolean; valor?: ResultadoMasivo; error?: { mensaje?: string } }>,
    clave: string,
  ): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await accion();
      if (!resultado.ok || !resultado.valor) {
        this.avisos.error(mensajeDeError(this.t, resultado.error ?? {}));
        return false;
      }
      const recuento = resultado.valor;
      const mensaje = this.tCon(clave, { ok: recuento.correctos, fail: recuento.fallidos });
      if (huboFallos(recuento)) {
        this.avisos.muestra({ tipo: 'warning', mensaje: `${mensaje}\n${primerosErrores(recuento)}` });
      } else {
        this.avisos.exito(mensaje);
      }
      return true;
    } finally {
      this._ocupado.set(false);
    }
  }

  /** El patrón de un cambio masivo que devuelve cuántos productos se tocaron. */
  private async conRecuento(
    accion: () => Promise<{ ok: boolean; valor?: number; error?: { mensaje?: string } }>,
    clave: string,
  ): Promise<boolean> {
    this._ocupado.set(true);
    try {
      const resultado = await accion();
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error ?? {}));
        return false;
      }
      this.avisos.exito(this.tCon(clave, { n: resultado.valor ?? 0 }));
      return true;
    } finally {
      this._ocupado.set(false);
    }
  }
}
