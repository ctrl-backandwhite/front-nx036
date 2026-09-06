import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faCircleCheck,
  faPen,
  faPlus,
  faTrash,
  faWarehouse,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  Almacen,
  DatosDeAlmacen,
  ParteDeLote,
  almacenEnBlanco,
  datosDe,
} from '../../../domain/logistica/model/almacen';
import { Seleccion } from '../../../application/logistica/state/seleccion';
import {
  AplicaLoteDeAlmacenes,
  BorraAlmacen,
  ConsultaAlmacenes,
  GuardaAlmacen,
} from '../../../application/logistica/use-case/configura-logistica.use-case';
import { FormularioDeAlmacen } from '../component/formulario-de-almacen';

/**
 * Los almacenes de la red.
 *
 * <p>El CÓDIGO es el que se pega en la dirección de envío del proveedor, así que cambiarlo tiene
 * consecuencias fuera de la aplicación: lo que va de camino se emparejó con el anterior.
 *
 * <p>Las acciones en lote no tienen endpoint propio: se repite la escritura por fila y se junta el
 * parte. Por eso se dice cuántas salieron y cuáles no — repetir el lote entero volvería a borrar lo ya
 * borrado y daría otro error encima.
 */
@Component({
  selector: 'nx-almacenes-page',
  imports: [FaIconComponent, FormularioDeAlmacen],
  template: `
    <div class="space-y-5">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1>{{ t('admin.warehouses.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.warehouses.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          @if (seleccion.hayAlguno()) {
            <div class="flex items-center gap-1 flex-wrap mr-1">
              <span class="text-[11px] text-ink-500 mr-1">
                {{ t('admin.bulk.selected').replace('{n}', seleccion.cuantos().toString()) }}
              </span>
              <button
                type="button"
                (click)="cambiaActividad(true)"
                [disabled]="enLote()"
                class="btn btn-outline btn-sm text-[12px]"
              >
                <fa-icon [icon]="iconos.si" /> {{ t('admin.warehouses.active') }}
              </button>
              <button
                type="button"
                (click)="cambiaActividad(false)"
                [disabled]="enLote()"
                class="btn btn-outline btn-sm text-[12px]"
              >
                <fa-icon [icon]="iconos.no" /> {{ t('admin.warehouses.inactive') }}
              </button>
              <button
                type="button"
                (click)="borraEnLote()"
                [disabled]="enLote()"
                class="btn btn-outline btn-sm text-[12px] border-red-300 text-red-700"
              >
                <fa-icon [icon]="iconos.papelera" /> {{ t('actions.delete') }}
              </button>
            </div>
          }
          <button type="button" (click)="abreAlta()" class="btn btn-primary text-[12px]">
            <fa-icon [icon]="iconos.mas" /> {{ t('admin.warehouses.create') }}
          </button>
        </div>
      </header>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    [checked]="todosMarcados()"
                    (change)="seleccion.alternaTodos(identificadores())"
                    [attr.aria-label]="t('admin.categories.select_all')"
                  />
                </th>
                <th class="px-4 py-2 font-medium">{{ t('admin.warehouses.field.code') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.warehouses.field.name') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.warehouses.field.country') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.warehouses.field.city') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.warehouses.field.status') }}</th>
                <th class="px-4 py-2 font-medium text-right">
                  {{ t('admin.warehouses.actions') }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (almacen of almacenes(); track almacen.id) {
                <tr
                  class="border-t border-ink-100"
                  [class.bg-brand-50]="seleccion.tiene(almacen.id)"
                >
                  <td class="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-xs"
                      [checked]="seleccion.tiene(almacen.id)"
                      (change)="seleccion.alterna(almacen.id)"
                      [attr.aria-label]="almacen.codigo"
                    />
                  </td>
                  <td class="px-4 py-2 font-mono text-[11px]">{{ almacen.codigo }}</td>
                  <td class="px-4 py-2">{{ almacen.nombre }}</td>
                  <td class="px-4 py-2">{{ almacen.pais || '—' }}</td>
                  <td class="px-4 py-2">{{ almacen.ciudad || '—' }}</td>
                  <td class="px-4 py-2">
                    <span
                      class="badge badge-sm"
                      [class.badge-success]="almacen.activo"
                      [class.badge-ghost]="!almacen.activo"
                    >
                      {{
                        almacen.activo
                          ? t('admin.warehouses.active')
                          : t('admin.warehouses.inactive')
                      }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      (click)="abreEdicion(almacen)"
                      class="btn btn-ghost btn-xs btn-square mr-1"
                      [title]="t('admin.warehouses.edit')"
                      [attr.aria-label]="t('admin.warehouses.edit')"
                    >
                      <fa-icon [icon]="iconos.lapiz" />
                    </button>
                    <button
                      type="button"
                      (click)="borra(almacen)"
                      class="btn btn-ghost btn-xs btn-square text-error"
                      [title]="t('actions.delete')"
                      [attr.aria-label]="t('actions.delete')"
                    >
                      <fa-icon [icon]="iconos.papelera" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-4 py-10 text-center text-ink-400 text-[13px]">
                    <fa-icon [icon]="iconos.almacen" class="text-2xl text-ink-300 block mx-auto mb-2" />
                    {{ t('admin.warehouses.empty') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (abierto()) {
        <nx-formulario-de-almacen
          [datos]="borrador()"
          [editando]="editandoId() !== null"
          [guardando]="guardando()"
          (cancela)="abierto.set(false)"
          (guarda)="guardaAlmacen($event)"
        />
      }
    </div>
  `,
})
export class AlmacenesPage {
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    mas: faPlus,
    lapiz: faPen,
    papelera: faTrash,
    almacen: faWarehouse,
    si: faCircleCheck,
    no: faBan,
  };

  private readonly consulta = inject(ConsultaAlmacenes);
  private readonly guardador = inject(GuardaAlmacen);
  private readonly eliminador = inject(BorraAlmacen);
  private readonly lote = inject(AplicaLoteDeAlmacenes);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  protected readonly seleccion = new Seleccion();
  protected readonly almacenes = signal<readonly Almacen[]>([]);
  protected readonly abierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly borrador = signal<DatosDeAlmacen>(almacenEnBlanco());
  protected readonly guardando = signal(false);
  protected readonly enLote = signal(false);

  protected readonly identificadores = computed(() => this.almacenes().map((a) => a.id));
  protected readonly todosMarcados = computed(() =>
    this.seleccion.todosMarcados(this.identificadores()),
  );

  constructor() {
    void this.recarga();
  }

  private async recarga(): Promise<void> {
    const resultado = await this.consulta.ejecuta();
    if (resultado.ok) {
      this.almacenes.set(resultado.valor);
    } else {
      this.avisos.error(resultado.error.mensaje || this.t('admin.warehouses.error'));
    }
  }

  protected abreAlta(): void {
    this.editandoId.set(null);
    this.borrador.set(almacenEnBlanco());
    this.abierto.set(true);
  }

  protected abreEdicion(almacen: Almacen): void {
    this.editandoId.set(almacen.id);
    this.borrador.set(datosDe(almacen));
    this.abierto.set(true);
  }

  protected async guardaAlmacen(datos: DatosDeAlmacen): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.guardador.ejecuta(this.editandoId(), datos);
      if (!resultado.ok) {
        this.avisos.error(
          resultado.error === 'sin-clave'
            ? this.t('admin.warehouses.error')
            : (resultado.error as { mensaje?: string }).mensaje ||
                this.t('admin.warehouses.error'),
        );
        return;
      }
      this.abierto.set(false);
      this.avisos.exito(this.t('admin.warehouses.saved'));
      await this.recarga();
    } finally {
      this.guardando.set(false);
    }
  }

  protected async borra(almacen: Almacen): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.t('admin.warehouses.delete_confirm').replace('{name}', almacen.nombre),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.eliminador.ejecuta(almacen.id);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.warehouses.error'));
      return;
    }
    this.avisos.exito(this.t('admin.warehouses.deleted'));
    await this.recarga();
  }

  protected async cambiaActividad(activo: boolean): Promise<void> {
    const marcados = this.seleccion.filasDe(this.almacenes());
    if (marcados.length === 0) {
      return;
    }
    await this.corre(() => this.lote.activa(marcados, activo));
  }

  protected async borraEnLote(): Promise<void> {
    const marcados = this.seleccion.filasDe(this.almacenes());
    if (marcados.length === 0) {
      return;
    }
    const confirmado = await this.dialogo.confirma(
      this.t('admin.bulk.delete_confirm').replace('{n}', String(marcados.length)),
    );
    if (!confirmado) {
      return;
    }
    await this.corre(() => this.lote.borra(marcados));
  }

  private async corre(accion: () => Promise<ParteDeLote>): Promise<void> {
    this.enLote.set(true);
    try {
      const parte = await accion();
      this.seleccion.limpia();
      await this.recarga();
      const resumen = this.t('admin.bulk.done')
        .replace('{ok}', String(parte.correctas))
        .replace('{fail}', String(parte.errores.length));
      this.avisos.muestra({
        tipo: parte.errores.length ? 'warning' : 'success',
        mensaje: parte.errores.length
          ? `${resumen}\n${parte.errores.slice(0, 8).join('\n')}`
          : resumen,
      });
    } finally {
      this.enLote.set(false);
    }
  }
}
