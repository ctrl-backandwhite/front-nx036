import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faBoxOpen,
  faCopy,
  faFileExcel,
  faRotateLeft,
  faUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { LupaImagen } from '@ds/component/lupa/lupa-imagen';
import {
  CompraAProveedor,
  DIAS_DE_AVISO,
  DIAS_HASTA_DESTRUCCION,
  PasoDeCompra,
  pasoQueToca,
  puedeReexportarse,
} from '../../../domain/logistica/model/compra';

/**
 * Una compra al proveedor en el tablero.
 *
 * <p>Enseña SOLO la acción que toca ahora, para que no haya que recordar en qué punto va cada bulto. El
 * botón de re-exportar aparece únicamente cuando serviría de algo: en una compra ya re-empaquetada, la
 * validación la rechaza por duplicada y ofrecerlo sería prometer algo que no puede pasar.
 */
@Component({
  selector: 'nx-tarjeta-de-compra',
  imports: [FaIconComponent, LupaImagen],
  template: `
    <article class="p-3 text-sm">
      <div class="mb-2 flex items-center justify-end gap-2">
        <button
          type="button"
          (click)="pide.emit('cancel')"
          [title]="t('admin.purchases.cancel')"
          [attr.aria-label]="t('admin.purchases.cancel')"
          class="text-slate-400 hover:text-red-600"
        >
          <fa-icon [icon]="iconos.anula" />
        </button>
      </div>

      @if (compra().exportadoEl; as exportado) {
        <div
          class="mb-2 flex items-center justify-between gap-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
        >
          <span class="inline-flex items-center gap-1">
            <fa-icon [icon]="iconos.hoja" />
            {{ t('admin.purchases.exported_on').replace('{date}', exportado) }}
          </span>
          @if (reexportable()) {
            <button
              type="button"
              (click)="pide.emit('reexport')"
              [disabled]="ocupado()"
              class="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline disabled:opacity-40"
            >
              <fa-icon [icon]="iconos.reexporta" /> {{ t('admin.purchases.reexport') }}
            </button>
          }
        </div>
      }

      @for (linea of compra().lineas; track linea.lineaDePedidoId) {
        <div class="mb-2 flex gap-2">
          <!-- Ampliable: con 48 píxeles hay que acertar la variante correcta al comprar, y
               equivocarse cuesta un pedido mal servido. -->
          <nx-lupa-imagen
            [src]="linea.imagenUrl"
            [alt]="linea.titulo"
            clase="h-12 w-12 rounded object-cover shrink-0"
            claseMarcador="h-12 w-12 rounded shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">{{ linea.titulo }}</p>
            <!-- El título chino es el que sirve para buscar en la web del proveedor. -->
            @if (linea.tituloZh; as chino) {
              <p class="truncate text-xs text-slate-500">{{ chino }}</p>
            }
            <p class="text-xs text-slate-500">{{ linea.variante }} × {{ linea.cantidad }}</p>
            @if (linea.origenUrl; as origen) {
              <a
                [href]="origen"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
              >
                {{ t('admin.purchases.open_1688') }} <fa-icon [icon]="iconos.externo" />
              </a>
            }
          </div>
        </div>
      }

      <!-- Lo que costó de verdad frente a lo que decía el catálogo. Todo formateado por el backend. -->
      @if (compra().costeRealFormateado) {
        <dl class="mb-2 rounded bg-slate-50 px-2 py-1.5 text-xs">
          <div class="flex items-center justify-between gap-2">
            <dt class="text-slate-500">{{ t('admin.purchases.cost_expected') }}</dt>
            <dd class="font-mono">{{ compra().costeEsperadoFormateado }}</dd>
          </div>
          <div class="flex items-center justify-between gap-2">
            <dt class="text-slate-500">{{ t('admin.purchases.cost_real') }}</dt>
            <dd class="font-mono">{{ compra().costeRealFormateado }}</dd>
          </div>
          @if (compra().desviacionFormateada; as desviacion) {
            <div class="flex items-center justify-between gap-2">
              <dt class="text-slate-500">{{ t('admin.purchases.cost_variance') }}</dt>
              <dd
                class="font-mono"
                [class.text-amber-600]="compra().fueraDePresupuesto"
                [class.text-emerald-600]="!compra().fueraDePresupuesto"
              >
                {{ desviacion }}
              </dd>
            </div>
          }
          @if (compra().margenRealFormateado; as margen) {
            <div
              class="mt-1 flex items-center justify-between gap-2 border-t border-slate-200 pt-1"
            >
              <dt class="text-slate-500">{{ t('admin.purchases.margin_real') }}</dt>
              <dd class="font-mono">
                {{ margen }}
                @if (compra().margenRealPorcentaje !== undefined) {
                  <span class="ml-1 text-slate-500">({{ compra().margenRealPorcentaje }}%)</span>
                }
              </dd>
            </div>
          }
        </dl>
      }

      @if (compra().estado === 'PENDING' && compra().direccionDeAlmacen) {
        <button
          type="button"
          (click)="copia.emit()"
          class="mb-2 flex w-full items-center gap-2 rounded bg-slate-100 px-2 py-1 text-left text-xs"
        >
          <fa-icon [icon]="iconos.copia" />
          <span class="truncate">{{ t('admin.purchases.copy_address') }}</span>
        </button>
      }

      @if (compra().seguimientoDomestico; as seguimiento) {
        <p class="mb-1 font-mono text-xs text-slate-500">{{ seguimiento }}</p>
      }
      @if (compra().diasEnAlmacen !== undefined) {
        <p
          class="mb-1 text-xs"
          [class.font-semibold]="enRiesgo()"
          [class.text-red-600]="enRiesgo()"
          [class.text-slate-500]="!enRiesgo()"
        >
          {{ compra().diasEnAlmacen }} / {{ limite }} {{ t('admin.purchases.days') }}
        </p>
      }

      @if (paso(); as siguiente) {
        <button
          type="button"
          (click)="pide.emit(siguiente)"
          [disabled]="ocupado()"
          class="btn btn-primary btn-sm w-full text-xs"
        >
          @if (siguiente === 'packed') {
            <fa-icon [icon]="iconos.caja" />
          }
          {{ t('admin.purchases.mark_' + siguiente) }}
        </button>
      }
    </article>
  `,
})
export class TarjetaDeCompra {
  readonly compra = input.required<CompraAProveedor>();
  readonly ocupado = input(false);

  readonly pide = output<PasoDeCompra>();
  readonly copia = output<void>();

  protected readonly limite = DIAS_HASTA_DESTRUCCION;
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    anula: faBan,
    hoja: faFileExcel,
    reexporta: faRotateLeft,
    externo: faUpRightFromSquare,
    copia: faCopy,
    caja: faBoxOpen,
  };

  protected readonly paso = computed(() => pasoQueToca(this.compra().estado));
  protected readonly reexportable = computed(() => puedeReexportarse(this.compra()));
  protected readonly enRiesgo = computed(
    () => (this.compra().diasEnAlmacen ?? 0) >= DIAS_DE_AVISO,
  );
}
