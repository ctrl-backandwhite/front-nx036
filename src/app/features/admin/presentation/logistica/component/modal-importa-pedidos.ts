import { Component, inject, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { ResultadoDeImportacion } from '../../../domain/logistica/model/pedido';
import { ImportaPedidos } from '../../../application/logistica/use-case/alta-de-pedidos.use-case';
import { LeePedidosPegados } from '../../../application/logistica/use-case/lee-pedidos-pegados.use-case';

/** El ejemplo que se carga al pulsar «cargar ejemplo». Es la forma que espera el endpoint. */
const EJEMPLO = JSON.stringify(
  [
    {
      customerEmail: 'cliente@ejemplo.com',
      externalOrderId: '#1001',
      shippingAddress: {
        fullName: 'Juan Pérez',
        phone: '+34600000000',
        email: 'cliente@ejemplo.com',
        line1: 'C/ Mayor 1',
        city: 'Madrid',
        state: 'M',
        postalCode: '28001',
        country: 'ES',
      },
      items: [{ productId: '00000000-0000-0000-0000-000000000000', quantity: 2 }],
      notes: 'Importada desde CSV',
    },
  ],
  null,
  2,
);

/**
 * Importación masiva de pedidos pegando su JSON.
 *
 * <p>El parte se enseña POR FILA y no como un «importados: 12»: cuando una fila falla, quien la pegó
 * necesita saber cuál para corregirla y volver a intentarlo solo con esa.
 */
@Component({
  selector: 'nx-modal-importa-pedidos',
  imports: [FaIconComponent],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="t('admin.orders.import.title')"
    >
      <!-- El fondo cierra al pulsarlo, como hermano del panel: ver la nota del alta manual. -->
      <div class="absolute inset-0 bg-black/40" (click)="cierra.emit()" aria-hidden="true"></div>
      <div
        class="relative bg-base-100 rounded-box shadow-xl w-[95vw] max-w-6xl h-[90vh] max-h-[92vh] p-5 border border-base-200 flex flex-col overflow-hidden gap-3"
      >
        <div class="flex items-center justify-between shrink-0">
          <h3 class="font-semibold text-lg">{{ t('admin.orders.import.title') }}</h3>
          <button
            type="button"
            (click)="cierra.emit()"
            class="btn btn-ghost btn-xs btn-square"
            [attr.aria-label]="t('common.close')"
          >
            <fa-icon [icon]="iconoAspa" />
          </button>
        </div>
        <p class="text-[12px] text-ink-500 shrink-0">{{ t('admin.orders.import.help') }}</p>

        <textarea
          [attr.aria-label]="t('admin.orders.import.title')"
          class="textarea textarea-bordered textarea-sm w-full flex-1 min-h-0 resize-none overflow-auto font-mono text-[11px]"
          [value]="texto()"
          [placeholder]="ejemplo"
          (input)="texto.set($any($event.target).value)"
        ></textarea>
        <button
          type="button"
          (click)="texto.set(ejemplo)"
          class="btn btn-ghost btn-xs shrink-0 self-start"
        >
          {{ t('admin.orders.import.load_example') }}
        </button>

        @if (parte(); as resultado) {
          <div
            class="text-[12px] border border-ink-100 rounded-md p-3 space-y-1 max-h-40 overflow-auto shrink-0"
            role="status"
          >
            <div class="text-success font-medium">
              {{ t('admin.orders.import.imported') }}: {{ resultado.importados }}
            </div>
            @if (resultado.fallidos > 0) {
              <div class="text-error font-medium">
                {{ t('admin.orders.import.failed') }}: {{ resultado.fallidos }}
              </div>
            }
            @for (error of resultado.errores; track $index) {
              <div class="text-ink-500">• {{ error }}</div>
            }
          </div>
        }

        <div class="flex justify-end gap-2 pt-1 shrink-0">
          <button type="button" (click)="cierra.emit()" class="btn btn-ghost btn-sm">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            (click)="importa()"
            [disabled]="importando()"
            class="btn btn-primary btn-sm"
          >
            {{ t('admin.orders.import.run') }}
          </button>
        </div>
      </div>
    </div>
  `,
  host: { '(document:keydown.escape)': 'cierra.emit()' },
})
export class ModalImportaPedidos {
  readonly cierra = output<void>();
  readonly importado = output<void>();

  protected readonly ejemplo = EJEMPLO;
  protected readonly iconoAspa = faXmark;
  protected readonly t = inject(TraduccionService).t;

  private readonly lector = inject(LeePedidosPegados);
  private readonly importador = inject(ImportaPedidos);
  private readonly avisos = inject(AvisosStore);

  protected readonly texto = signal('');
  protected readonly importando = signal(false);
  protected readonly parte = signal<ResultadoDeImportacion | null>(null);

  protected async importa(): Promise<void> {
    const leido = this.lector.ejecuta(this.texto());
    if (!leido.ok) {
      this.avisos.error(
        this.t(
          leido.error === 'formato'
            ? 'admin.orders.import.bad_json'
            : 'admin.orders.import.empty',
        ),
      );
      return;
    }
    this.importando.set(true);
    try {
      const resultado = await this.importador.ejecuta(leido.valor);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      this.parte.set(resultado.valor);
      // Se avisa aunque haya fallos: lo importado ya está y el listado de detrás está desfasado.
      this.importado.emit();
    } finally {
      this.importando.set(false);
    }
  }
}
