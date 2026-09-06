import { Component, inject, input, linkedSignal, output, resource, signal } from '@angular/core';
import { form, required, validate } from '@angular/forms/signals';
import { NgOptimizedImage } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCheck,
  faImage,
  faPen,
  faPenToSquare,
  faPlus,
  faSpinner,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { EliminaVariante } from '../../../application/catalogo/use-case/elimina-variante.use-case';
import { GuardaVariante } from '../../../application/catalogo/use-case/guarda-variante.use-case';
import { GuardaVariantesEnLote } from '../../../application/catalogo/use-case/guarda-variantes-en-lote.use-case';
import { ListaVariantes } from '../../../application/catalogo/use-case/lista-variantes.use-case';
import {
  BORRADOR_DE_VARIANTE_VACIO,
  BorradorDeVariante,
  VarianteDeProducto,
  aBorrador,
  opcionesATexto,
} from '../../../domain/catalogo/model/variante-de-producto';
import { mensajeDeError } from '../etiquetas';
import { FilasDeVariante } from './ficha/filas-de-variante';

/**
 * Un importe escrito a mano: vale si está vacío o si es un número que no baja de cero.
 *
 * <p>Vacío es legítimo —`desdeBorrador` lo traduce a «sin precio»—, pero un NEGATIVO se guardaba tal
 * cual y salía al escaparate: un precio por debajo de cero es una venta a pérdida sin que nadie lo vea.
 */
function numeroNoNegativo(texto: string): boolean {
  if (texto.trim() === '') {
    return true;
  }
  const numero = Number(texto);
  return Number.isFinite(numero) && numero >= 0;
}

/** Un borrador por variante, indexado por su identificador: es el modelo del formulario del lote. */
function borradoresDe(
  variantes: readonly VarianteDeProducto[],
): Record<string, BorradorDeVariante> {
  return Object.fromEntries(variantes.map((variante) => [variante.id, aBorrador(variante)]));
}

/**
 * El gestor de variantes de la pestaña de inventario.
 *
 * <p>Trae los precios CRUDOS del punto de administración —sin margen y en yuanes— y no los de la ficha,
 * que ya vienen con margen: editar sobre esos aplicaba el margen encima del margen.
 *
 * <p>La edición MASIVA existe porque una ficha de ropa trae treinta o cuarenta combinaciones y
 * corregirlas de una en una son cuarenta ventanas. Solo se guardan las que de verdad cambiaron.
 */
@Component({
  selector: 'nx-gestor-de-variantes',
  imports: [NgOptimizedImage, FaIconComponent, FilasDeVariante],
  template: `
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-ink-100 flex-wrap">
        <span class="text-[12px] text-ink-500">
          {{ variantes.value().length }} {{ t('admin.variants.count') }}
        </span>
        <div class="flex items-center gap-1 flex-wrap">
          @if (!enLote() && variantes.value().length > 0) {
            <button type="button" class="btn btn-outline btn-xs text-[11px]" (click)="empiezaLote()">
              <fa-icon [icon]="iconos.editarTodo" /> {{ t('admin.variants.edit_all') }}
            </button>
          }
          @if (enLote()) {
            <button
              type="button"
              class="btn btn-success btn-xs text-[11px]"
              [disabled]="ocupado()"
              (click)="guardaLote()"
            >
              <fa-icon [icon]="ocupado() ? iconos.girando : iconos.marca" [class.fa-spin]="ocupado()" />
              {{ t('admin.variants.save_all') }}
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-xs text-[11px]"
              [disabled]="ocupado()"
              (click)="enLote.set(false)"
            >
              <fa-icon [icon]="iconos.aspa" /> {{ t('common.cancel') }}
            </button>
          } @else {
            <button type="button" class="btn btn-primary btn-xs text-[11px]" (click)="empiezaAlta()">
              <fa-icon [icon]="iconos.mas" /> {{ t('admin.variants.add') }}
            </button>
          }
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
            <tr>
              <th class="px-3 py-2 font-medium w-12">{{ t('admin.variants.image') }}</th>
              <th class="px-3 py-2 font-medium">{{ t('admin.catalog.detail.inv.sku') }}</th>
              <th class="px-3 py-2 font-medium">{{ t('admin.catalog.detail.inv.variant') }}</th>
              <th class="px-3 py-2 font-medium text-right">{{ t('admin.catalog.col.price') }}</th>
              <th class="px-3 py-2 font-medium text-right">{{ t('admin.catalog.detail.inv.stock') }}</th>
              <th class="px-3 py-2 font-medium">{{ t('admin.catalog.detail.inv.options') }}</th>
              <th class="px-3 py-2 font-medium text-right">{{ t('admin.variants.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @if (creando() && !enLote()) {
              <nx-filas-de-variante [campos]="formulario">
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    class="btn btn-success btn-xs btn-square mr-1"
                    [disabled]="ocupado() || formulario().invalid()"
                    [attr.aria-label]="t('actions.save')"
                    (click)="guardaBorrador()"
                  >
                    <fa-icon [icon]="iconos.marca" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square"
                    [attr.aria-label]="t('common.cancel')"
                    (click)="creando.set(false)"
                  >
                    <fa-icon [icon]="iconos.aspa" />
                  </button>
                </td>
              </nx-filas-de-variante>
            }
            @for (variante of variantes.value(); track variante.id) {
              @if (enLote()) {
                <nx-filas-de-variante [campos]="formularioDeLote[variante.id]">
                  <td class="px-3 py-2 text-right text-ink-300 text-[11px] font-mono">
                    {{ variante.sku ?? '' }}
                  </td>
                </nx-filas-de-variante>
              } @else if (editandoId() === variante.id) {
                <nx-filas-de-variante [campos]="formulario">
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="btn btn-success btn-xs btn-square mr-1"
                      [disabled]="ocupado() || formulario().invalid()"
                      [attr.aria-label]="t('actions.save')"
                      (click)="guardaBorrador(variante.id)"
                    >
                      <fa-icon [icon]="iconos.marca" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs btn-square"
                      [attr.aria-label]="t('common.cancel')"
                      (click)="editandoId.set(null)"
                    >
                      <fa-icon [icon]="iconos.aspa" />
                    </button>
                  </td>
                </nx-filas-de-variante>
              } @else {
                <tr class="border-t border-ink-100">
                  <td class="px-3 py-2">
                    @if (variante.urlImagen) {
                      <img
                        [ngSrc]="variante.urlImagen"
                        width="36"
                        height="36"
                        [alt]="variante.sku ?? ''"
                        class="w-9 h-9 rounded object-cover border border-ink-100"
                      />
                    } @else {
                      <span class="w-9 h-9 rounded border border-dashed border-ink-200 grid place-items-center text-ink-300">
                        <fa-icon [icon]="iconos.imagen" class="text-xs" />
                      </span>
                    }
                  </td>
                  <td class="px-3 py-2 font-mono text-[11px]">{{ variante.sku ?? '—' }}</td>
                  <td class="px-3 py-2">{{ variante.titulo ?? '—' }}</td>
                  <td class="px-3 py-2 text-right font-mono">{{ precioCrudo(variante) }}</td>
                  <td class="px-3 py-2 text-right">{{ variante.existencias }}</td>
                  <td class="px-3 py-2 text-xs">{{ opciones(variante) || '—' }}</td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs btn-square mr-1"
                      [title]="t('admin.variants.edit')"
                      [attr.aria-label]="t('admin.variants.edit')"
                      (click)="empiezaEdicion(variante)"
                    >
                      <fa-icon [icon]="iconos.editar" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs btn-square text-error"
                      [title]="t('admin.variants.delete')"
                      [attr.aria-label]="t('admin.variants.delete')"
                      (click)="borra(variante)"
                    >
                      <fa-icon [icon]="iconos.borrar" />
                    </button>
                  </td>
                </tr>
              }
            }
            @if (variantes.value().length === 0 && !creando()) {
              <tr>
                <td colspan="7" class="px-3 py-6 text-center text-ink-400 text-[13px]">
                  {{ t('admin.variants.empty') }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class GestorDeVariantes {
  readonly productoId = input.required<string>();
  readonly cambiado = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly avisos = inject(AvisosStore);
  private readonly dialogos = inject(DialogoStore);
  private readonly lista = inject(ListaVariantes);
  private readonly guarda = inject(GuardaVariante);
  private readonly guardaLote_ = inject(GuardaVariantesEnLote);
  private readonly eliminaVariante = inject(EliminaVariante);

  protected readonly iconos = {
    mas: faPlus,
    editar: faPen,
    editarTodo: faPenToSquare,
    borrar: faTrash,
    marca: faCheck,
    aspa: faXmark,
    girando: faSpinner,
    imagen: faImage,
  };

  protected readonly variantes = resource({
    params: () => this.productoId(),
    loader: async ({ params }) => {
      const resultado = await this.lista.ejecuta(params);
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  protected readonly creando = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly enLote = signal(false);
  protected readonly ocupado = signal(false);
  /** La variante que se está creando o editando, una sola cada vez. */
  private readonly borrador = signal<BorradorDeVariante>(BORRADOR_DE_VARIANTE_VACIO);

  /**
   * Las reglas de una variante.
   *
   * <p>El SKU es lo único imprescindible —es lo que la identifica en el almacén— y antes se comprobaba
   * a mano sobre el botón. El precio y las existencias no pueden ser negativos: se tecleaban en un campo
   * numérico sin tope por abajo y llegaban al guardado tal cual.
   */
  protected readonly formulario = form(this.borrador, (ruta) => {
    required(ruta.sku);
    validate(ruta.sku, ({ value }) =>
      value().trim() === '' ? { kind: 'required' } : undefined,
    );
    validate(ruta.precio, ({ value }) =>
      numeroNoNegativo(value()) ? undefined : { kind: 'min', min: 0 },
    );
    validate(ruta.existencias, ({ value }) =>
      numeroNoNegativo(value()) ? undefined : { kind: 'min', min: 0 },
    );
  });

  /**
   * Los borradores de la edición masiva, uno por variante.
   *
   * <p>Se DERIVAN de la lista en vez de rellenarse a mano al entrar en modo lote: así una recarga del
   * servidor no deja borradores de variantes que ya no existen ni filas nuevas sin borrador. Sigue
   * siendo escribible, que es lo que hace `linkedSignal`, porque es el modelo del formulario del lote.
   */
  private readonly borradoresDeLote = linkedSignal<
    readonly VarianteDeProducto[],
    Record<string, BorradorDeVariante>
  >({
    source: () => this.variantes.value(),
    computation: (variantes) => borradoresDe(variantes),
  });

  protected readonly formularioDeLote = form(this.borradoresDeLote);

  protected precioCrudo(variante: VarianteDeProducto): string {
    return variante.precio != null ? `${Number(variante.precio).toFixed(2)} CNY` : '—';
  }

  protected opciones(variante: VarianteDeProducto): string {
    return opcionesATexto(variante.opciones);
  }

  protected empiezaAlta(): void {
    this.editandoId.set(null);
    this.borrador.set(BORRADOR_DE_VARIANTE_VACIO);
    this.creando.set(true);
  }

  protected empiezaEdicion(variante: VarianteDeProducto): void {
    this.creando.set(false);
    this.borrador.set(aBorrador(variante));
    this.editandoId.set(variante.id);
  }

  protected empiezaLote(): void {
    this.creando.set(false);
    this.editandoId.set(null);
    // Se rehacen al entrar: lo tecleado en un lote que se canceló no puede reaparecer en el siguiente.
    this.borradoresDeLote.set(borradoresDe(this.variantes.value()));
    this.enLote.set(true);
  }

  protected async guardaBorrador(varianteId?: string): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.guarda.ejecuta(this.productoId(), this.borrador(), varianteId);
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.variants.error'));
        return;
      }
      this.avisos.exito(this.t(varianteId ? 'admin.variants.updated' : 'admin.variants.created'));
      this.creando.set(false);
      this.editandoId.set(null);
      this.refresca();
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async guardaLote(): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.guardaLote_.ejecuta(
        this.variantes.value(),
        this.borradoresDeLote(),
      );
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.variants.error'));
        return;
      }
      this.avisos.exito(`${this.t('admin.variants.saved_all')} (${resultado.valor})`);
      this.enLote.set(false);
      this.refresca();
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async borra(variante: VarianteDeProducto): Promise<void> {
    const confirmado = await this.dialogos.confirma(
      this.t('admin.variants.delete_confirm').replace('{sku}', variante.sku ?? variante.id),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.eliminaVariante.ejecuta(variante.id);
    if (resultado.ok) {
      this.avisos.exito(this.t('admin.variants.deleted'));
      this.refresca();
    } else {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.variants.error'));
    }
  }

  private refresca(): void {
    this.variantes.reload();
    this.cambiado.emit();
  }
}
