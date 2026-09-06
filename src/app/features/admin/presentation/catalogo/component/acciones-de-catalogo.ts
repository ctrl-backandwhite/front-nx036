import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBoxArchive,
  faCompress,
  faFileExport,
  faPause,
  faPlay,
  faPlus,
  faRotateRight,
  faStop,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import { EstadoDeProducto } from '../../../domain/catalogo/model/producto-admin';
import { EstadoDeCompresion } from '../../../domain/catalogo/port/productos-admin.port';
import { HerramientasDeCarga } from './herramientas-de-carga';

/**
 * La barra de acciones del listado del catálogo.
 *
 * <p>Las acciones en LOTE solo aparecen cuando hay algo marcado: ocupar la cabecera con cuatro botones
 * que no se pueden pulsar es ruido, y en el móvil se come la pantalla entera.
 *
 * <p>MOBILE FIRST: los botones se reparten en varias filas (`flex-wrap`) y no se recortan; en el
 * escritorio caben en una.
 */
@Component({
  selector: 'nx-acciones-de-catalogo',
  imports: [FaIconComponent, HerramientasDeCarga],
  template: `
    <div class="flex items-center gap-2 flex-wrap">
      @if (almacen.seleccionados() > 0) {
        <button
          type="button"
          class="btn btn-outline btn-sm text-[12px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          [disabled]="ocupado()"
          (click)="cambiaEstado.emit('ACTIVE')"
        >
          <fa-icon [icon]="iconos.publicar" />
          {{ t('admin.catalog.actions.publish') }} ({{ almacen.seleccionados() }})
        </button>
        <button
          type="button"
          class="btn btn-outline btn-sm text-[12px]"
          [disabled]="ocupado()"
          (click)="cambiaEstado.emit('PAUSED')"
        >
          <fa-icon [icon]="iconos.pausar" />
          {{ t('admin.catalog.actions.pause') }} ({{ almacen.seleccionados() }})
        </button>
        <button
          type="button"
          class="btn btn-outline btn-sm text-[12px]"
          [disabled]="ocupado()"
          (click)="cambiaEstado.emit('ARCHIVED')"
        >
          <fa-icon [icon]="iconos.archivar" />
          {{ t('admin.catalog.actions.archive') }} ({{ almacen.seleccionados() }})
        </button>
        <button
          type="button"
          class="btn btn-outline btn-sm text-[12px] border-red-300 text-red-700 hover:bg-red-50"
          [disabled]="ocupado()"
          (click)="eliminaSeleccion.emit()"
        >
          <fa-icon [icon]="ocupado() ? iconos.recargar : iconos.borrar" [class.fa-spin]="ocupado()" />
          {{ t('admin.catalog.bulk_delete') }} ({{ almacen.seleccionados() }})
        </button>
      }

      <!--
        Recargar la lista sin recargar el navegador. Hace falta porque el listado no se vuelve a pedir
        al ir a una ficha y volver: eso es lo que se quiere, pero deja sin forma de traer lo que hayan
        cambiado otros mientras tanto.
      -->
      <button
        type="button"
        class="btn btn-outline btn-sm text-[12px]"
        [disabled]="cargando()"
        [title]="t('admin.catalog.refresh')"
        [attr.aria-label]="t('admin.catalog.refresh')"
        (click)="recarga.emit()"
      >
        <fa-icon [icon]="iconos.recargar" [class.fa-spin]="cargando()" />
        {{ t('admin.catalog.refresh') }}
      </button>
      <button type="button" class="btn btn-outline btn-sm text-[12px]" (click)="abreRecargo.emit()">
        <fa-icon [icon]="iconos.mas" /> {{ t('admin.catalog.surcharge.btn') }}
      </button>
      <button type="button" class="btn btn-outline btn-sm text-[12px]" (click)="abreSubvencion.emit()">
        <fa-icon [icon]="iconos.mas" /> {{ t('admin.catalog.subsidy.btn') }}
      </button>

      <!--
        Comprimir el histórico de imágenes. Arranca donde lo dejó: solo toca las que se guardaron antes
        de que existiera el compresor, y las coge de más pesada a menos.
      -->
      <button
        type="button"
        [class]="
          'btn btn-sm text-[12px] btn-outline ' +
          (comprimiendo() ? 'border-amber-300 text-amber-700' : '')
        "
        [title]="t('admin.catalog.compress.hint')"
        (click)="alternaCompresion.emit()"
      >
        <fa-icon
          [icon]="comprimiendo() ? iconos.parar : iconos.comprimir"
          [class.fa-fade]="comprimiendo()"
        />
        {{ textoDeCompresion() }}
      </button>

      <nx-herramientas-de-carga clase="products" (terminado)="recarga.emit()" />

      <button type="button" class="btn btn-outline btn-sm text-[12px]" (click)="abreExportacion.emit()">
        <fa-icon [icon]="iconos.exportar" /> {{ t('admin.export.title') }}
      </button>
      <button type="button" class="btn btn-primary btn-sm text-[12px]" (click)="abreAlta.emit()">
        <fa-icon [icon]="iconos.mas" /> {{ t('admin.create_product.btn') }}
      </button>
    </div>
  `,
})
export class AccionesDeCatalogo {
  readonly cargando = input(false);
  readonly ocupado = input(false);
  readonly comprimiendo = input(false);
  readonly compresion = input<EstadoDeCompresion | null>(null);

  readonly cambiaEstado = output<EstadoDeProducto>();
  readonly eliminaSeleccion = output<void>();
  readonly recarga = output<void>();
  readonly abreRecargo = output<void>();
  readonly abreSubvencion = output<void>();
  readonly alternaCompresion = output<void>();
  readonly abreExportacion = output<void>();
  readonly abreAlta = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly almacen = inject(CatalogoAdminStore);

  protected readonly iconos = {
    publicar: faPlay,
    pausar: faPause,
    archivar: faBoxArchive,
    borrar: faTrash,
    recargar: faRotateRight,
    mas: faPlus,
    comprimir: faCompress,
    parar: faStop,
    exportar: faFileExport,
  };

  /** Mientras comprime, el botón enseña cuántas quedan: es la única señal de que sigue avanzando. */
  protected textoDeCompresion(): string {
    if (!this.comprimiendo()) {
      return this.t('admin.catalog.compress.btn');
    }
    const pendientes = this.compresion()?.pendientes;
    return `${this.t('admin.catalog.compress.stop')}${pendientes != null ? ` · ${pendientes}` : ''}`;
  }
}
