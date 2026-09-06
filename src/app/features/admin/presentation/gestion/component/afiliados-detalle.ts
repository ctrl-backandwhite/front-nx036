import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { Comision, DetalleDeAfiliado } from '../../../domain/gestion/model/afiliados';
import {
  ConsultaElAfiliado, ResuelveLaRevision,
} from '../../../application/gestion/use-case/afiliados.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { VentanaModal } from './ventana-modal';

/**
 * El color de cada estado de comisión.
 *
 * <p>No se reutiliza `nx-insignia-de-estado`: aquel habla el vocabulario de los PEDIDOS —sus colores y
 * sus claves son `orders.status.*`— y una comisión «en revisión» no existe allí. Compartir el
 * componente obligaría a mezclar dos vocabularios en el mismo mapa.
 */
const COLORES: Readonly<Record<string, string>> = {
  PENDING: 'badge-warning',
  APPROVED: 'badge-info',
  PAID: 'badge-success',
  REJECTED: 'badge-ghost',
  REVIEW: 'badge-error',
};

/**
 * La ficha de un afiliado: sus códigos y sus comisiones.
 *
 * <p>Las comisiones marcadas para REVISIÓN se resuelven desde aquí. Al resolver una hay que releer las
 * dos cosas —la ficha y el listado de detrás—, porque aprobar mueve el importe de «pendiente» a
 * «aprobado» y esas columnas están en la tabla de fuera.
 *
 * <p>Los importes van en la divisa del PROGRAMA, no en dólares: es la divisa en la que se paga y
 * convertirla daría una cifra que no coincide con la transferencia.
 */
@Component({
  selector: 'nx-afiliados-detalle',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="nombre()" ancho="sm:max-w-2xl" (cierra)="cierra.emit()">
      <div class="text-[12px] text-ink-500 font-mono">{{ detalle()?.afiliado?.email }}</div>

      @if (detalle()?.afiliado) {
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
          @for (dato of estadisticas(); track dato.etiqueta) {
            <div class="rounded-box bg-base-200/50 p-2">
              <div class="text-ink-500">{{ dato.etiqueta }}</div>
              <div class="font-semibold text-sm">{{ dato.valor }}</div>
            </div>
          }
        </div>
      }

      <div>
        <h3 class="font-medium text-sm mb-1">{{ t('affiliate.codes.title') }}</h3>
        <div class="space-y-1">
          @for (codigo of detalle()?.codigos ?? []; track codigo.id) {
            <div class="flex items-center gap-2 text-[12px]">
              <code class="font-mono">{{ codigo.codigo }}</code>
              <span class="text-ink-500">
                · {{ codigo.clics }} {{ t('affiliate.codes.clicks') }}
              </span>
              @if (!codigo.activo) {
                <span class="badge badge-ghost badge-xs">{{ t('common.no') }}</span>
              }
            </div>
          }
        </div>
      </div>

      <div>
        <h3 class="font-medium text-sm mb-1">{{ t('affiliate.commissions.title') }}</h3>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead class="text-[11px] text-ink-500">
              <tr>
                <th class="px-2">{{ t('affiliate.commissions.date') }}</th>
                <th class="px-2 text-right">{{ t('affiliate.commissions.amount') }}</th>
                <th class="px-2">{{ t('affiliate.commissions.status') }}</th>
                <th class="px-2"><span class="sr-only">{{ t('common.actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (comision of detalle()?.comisiones ?? []; track comision.id) {
                <tr class="text-[12px]">
                  <td class="px-2 text-ink-500">{{ fecha(comision) }}</td>
                  <td class="px-2 text-right font-medium">
                    {{ importe(comision.importeCentimos) }}
                    <span class="opacity-50">({{ comision.porcentaje }}%)</span>
                  </td>
                  <td class="px-2">
                    <span class="badge badge-sm" [class]="color(comision.estado)">
                      {{ rotulo(comision.estado) }}
                    </span>
                  </td>
                  <td class="px-2 text-right whitespace-nowrap">
                    @if (comision.estado === 'REVIEW') {
                      <button type="button" class="btn btn-ghost btn-xs text-emerald-600"
                              [disabled]="resolviendo()" (click)="resuelve(comision.id, true)">
                        {{ t('admin.affiliates.action.approve') }}
                      </button>
                      <button type="button" class="btn btn-ghost btn-xs text-error"
                              [disabled]="resolviendo()" (click)="resuelve(comision.id, false)">
                        {{ t('admin.affiliates.action.reject') }}
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-2 py-4 text-center text-ink-400 text-[12px]">
                    {{ t('affiliate.commissions.empty') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </nx-ventana-modal>
  `,
})
export class AfiliadosDetalle {
  readonly id = input.required<string>();
  /** La divisa del programa: los importes de un afiliado se pagan en ella. */
  readonly divisa = input.required<string>();
  readonly cierra = output<void>();
  /** Se resolvió una revisión: el listado de detrás tiene que releerse. */
  readonly cambia = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly importes = inject(ImportesStore);
  private readonly avisos = inject(AvisosStore);
  private readonly consulta = inject(ConsultaElAfiliado);
  private readonly resuelveLaRevision = inject(ResuelveLaRevision);

  protected readonly detalle = signal<DetalleDeAfiliado | null>(null);
  protected readonly resolviendo = signal(false);

  protected readonly nombre = computed(() => this.detalle()?.afiliado?.nombre ?? '—');

  protected readonly estadisticas = computed(() => {
    const afiliado = this.detalle()?.afiliado;
    return [
      { etiqueta: this.t('admin.affiliates.col.clicks'), valor: String(afiliado?.clics ?? 0) },
      {
        etiqueta: this.t('admin.affiliates.col.conversions'),
        valor: String(afiliado?.conversiones ?? 0),
      },
      {
        etiqueta: this.t('admin.affiliates.col.approved'),
        valor: this.importe(afiliado?.aprobadoCentimos),
      },
      { etiqueta: this.t('admin.affiliates.col.paid'), valor: this.importe(afiliado?.pagadoCentimos) },
    ];
  });

  constructor() {
    // La ficha se pide al saber de QUIÉN es. En el constructor todavía no hay entradas, así que el
    // efecto es lo que ata «cambió el identificador» con «vuelve a leer».
    effect(() => {
      const id = this.id();
      void this.carga(id);
    });
  }

  protected importe(centimos: number | null | undefined): string {
    return this.importes.escribeCentimos(centimos ?? 0, this.divisa());
  }

  protected color(estado: string): string {
    return COLORES[estado] ?? 'badge-ghost';
  }

  /** Un estado nuevo del backend se enseña crudo: en blanco, la fila parecería no tener estado. */
  protected rotulo(estado: string): string {
    const clave = `affiliate.commissions.st.${estado}`;
    const texto = this.t(clave);
    return texto === clave ? estado : texto;
  }

  protected fecha(comision: Comision): string {
    return comision.creadaEl ? new Date(comision.creadaEl).toLocaleDateString() : '—';
  }

  protected async resuelve(idComision: string, aprueba: boolean): Promise<void> {
    this.resolviendo.set(true);
    const resultado = await this.resuelveLaRevision.ejecuta(idComision, aprueba);
    this.resolviendo.set(false);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    await this.carga(this.id());
    this.cambia.emit();
  }

  private async carga(id: string): Promise<void> {
    const resultado = await this.consulta.ejecuta(id);
    // Un fallo al leer deja la ficha vacía y avisa: cerrar la ventana sola escondería el problema.
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.detalle.set(resultado.valor);
  }
}
