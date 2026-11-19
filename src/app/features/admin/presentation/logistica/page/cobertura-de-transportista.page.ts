import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormField, form } from '@angular/forms/signals';
import {
  faCircleCheck,
  faCircleXmark,
  faEarthAmericas,
  faPencil,
  faPlus,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  CoberturaDeTransportista,
  claveDeCobertura,
  coberturaEnBlanco,
  importeLegible,
  plazoLegible,
  transportistasDeCobertura,
} from '../../../domain/logistica/model/cobertura-transportista';
import {
  AlternaCoberturaDeTransportista,
  BorraCoberturaDeTransportista,
  ConsultaCoberturaDeTransportista,
  ConsultaTransportistasDisponibles,
  GuardaCoberturaDeTransportista,
} from '../../../application/logistica/use-case/configura-logistica.use-case';
import { FormularioDeCobertura } from '../component/formulario-de-cobertura';

/**
 * A qué países llega cada transportista.
 *
 * <p>Esta pantalla no existía. Hasta el 9-nov-2026 los destinos solo se cambiaban con migraciones SQL,
 * y con un solo transportista se podía vivir con eso; con dos, no: el segundo llega a 17 destinos que
 * el primero no cubre y encender cada uno no puede costar un despliegue.
 *
 * <p>Lo que se toca aquí surte efecto de inmediato: el desplegable de países del escaparate sale de la
 * UNIÓN de las coberturas, y esa consulta no se cachea.
 *
 * <p>El interruptor es la acción normal y el borrado la excepción: apagar un destino conserva su tarifa
 * de reserva y su plazo para cuando vuelva, borrarlo los pierde.
 */
@Component({
  selector: 'nx-cobertura-de-transportista-page',
  imports: [FaIconComponent, FormularioDeCobertura, FormField],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="flex items-center gap-2">
            <fa-icon [icon]="iconos.mundo" class="text-primary" />
            {{ t('admin.carrier_coverage.title') }}
          </h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.carrier_coverage.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-xs text-ink-500 flex items-center gap-2">
            {{ t('admin.carrier_coverage.filter_carrier') }}
            <select
              class="select select-bordered select-sm font-mono"
              [attr.aria-label]="t('admin.carrier_coverage.filter_carrier')"
              [formField]="filtro.carrier"
            >
              <option value="">{{ t('admin.carrier_coverage.all_carriers') }}</option>
              @for (opcion of presentes(); track opcion) {
                <option [value]="opcion">{{ opcion }}</option>
              }
            </select>
          </label>
          <button type="button" (click)="abreAlta()" class="btn btn-primary btn-sm">
            <fa-icon [icon]="iconos.mas" /> {{ t('admin.carrier_coverage.add') }}
          </button>
        </div>
      </div>

      <!-- Sin esto, la tabla parece la lista de precios y no lo es: lo que se cobra sale de la tarifa
           medida, y esta es la de reserva. -->
      <div class="card p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-ink-600">
        <p>
          <span class="font-medium">{{ t('admin.carrier_coverage.col.enabled') }}:</span>
          {{ t('admin.carrier_coverage.hint.enabled') }}
        </p>
        <p>
          <span class="font-medium">{{ t('admin.carrier_coverage.col.fallback') }}:</span>
          {{ t('admin.carrier_coverage.hint.fallback_rate') }}
        </p>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_coverage.col.carrier') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_coverage.col.country') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_coverage.col.zone') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_coverage.col.fallback') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_coverage.col.eta') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_coverage.col.enabled') }}</th>
                <th class="px-4 py-2 font-medium w-24">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (destino of visibles(); track clave(destino)) {
                <tr>
                  <td class="px-4 py-2 font-mono text-[12px]">{{ destino.carrier }}</td>
                  <td class="px-4 py-2 text-[13px]">
                    <span class="font-mono">{{ destino.pais }}</span>
                    <span class="ml-1 text-ink-500">{{ destino.nombre }}</span>
                  </td>
                  <td class="px-4 py-2 font-mono text-[12px]">{{ destino.zona || '—' }}</td>
                  <td class="px-4 py-2 tabular-nums text-[12px]">
                    {{ destino.tarifaLegible }}
                  </td>
                  <td class="px-4 py-2 tabular-nums text-[13px]">
                    @if (destino.plazoLegible) {
                      {{ destino.plazoLegible }} {{ t('admin.carrier_coverage.days') }}
                    } @else {
                      <span class="text-ink-400">{{ t('admin.carrier_coverage.no_eta') }}</span>
                    }
                  </td>
                  <td class="px-4 py-2">
                    <button
                      type="button"
                      (click)="alterna(destino)"
                      class="badge cursor-pointer"
                      [class.badge-success]="destino.habilitado"
                      [class.badge-ghost]="!destino.habilitado"
                      [attr.aria-label]="
                        destino.habilitado
                          ? t('admin.carrier_coverage.disable')
                          : t('admin.carrier_coverage.enable')
                      "
                    >
                      <fa-icon
                        [icon]="destino.habilitado ? iconos.si : iconos.no"
                        class="mr-1"
                      />
                      {{
                        destino.habilitado
                          ? t('admin.carrier_coverage.enabled')
                          : t('admin.carrier_coverage.disabled')
                      }}
                    </button>
                  </td>
                  <td class="px-4 py-2">
                    <div class="flex gap-1">
                      <button
                        type="button"
                        (click)="abreEdicion(destino)"
                        class="btn btn-ghost btn-xs btn-square"
                        [attr.aria-label]="t('actions.edit')"
                        [title]="t('actions.edit')"
                      >
                        <fa-icon [icon]="iconos.lapiz" />
                      </button>
                      <button
                        type="button"
                        (click)="borra(destino)"
                        class="btn btn-ghost btn-xs btn-square text-error"
                        [attr.aria-label]="t('actions.delete')"
                        [title]="t('actions.delete')"
                      >
                        <fa-icon [icon]="iconos.papelera" />
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-4 py-10 text-center text-ink-500 text-[13px]">
                    {{ t('admin.carrier_coverage.empty') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (editando(); as destino) {
        <nx-formulario-de-cobertura
          [cobertura]="destino"
          [transportistas]="disponibles()"
          [esAlta]="esAlta()"
          [guardando]="guardando()"
          (cancela)="editando.set(null)"
          (guarda)="guardaCobertura($event)"
        />
      }
    </div>
  `,
})
export class CoberturaDeTransportistaPage {
  protected readonly clave = claveDeCobertura;
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    mundo: faEarthAmericas,
    mas: faPlus,
    lapiz: faPencil,
    papelera: faTrashCan,
    si: faCircleCheck,
    no: faCircleXmark,
  };

  private readonly consulta = inject(ConsultaCoberturaDeTransportista);
  private readonly consultaTransportistas = inject(ConsultaTransportistasDisponibles);
  private readonly guardador = inject(GuardaCoberturaDeTransportista);
  private readonly alternador = inject(AlternaCoberturaDeTransportista);
  private readonly borrador = inject(BorraCoberturaDeTransportista);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  private readonly coberturas = signal<readonly CoberturaDeTransportista[]>([]);
  /** Los transportistas que EXISTEN, para el desplegable del formulario. Salen del backend. */
  protected readonly disponibles = signal<readonly string[]>([]);

  /** El filtro también es un formulario: el vacío significa «todos», no «ninguno». */
  protected readonly seleccion = signal({ carrier: '' });
  protected readonly filtro = form(this.seleccion);
  protected readonly editando = signal<CoberturaDeTransportista | null>(null);
  /** La pareja transportista+país es la CLAVE: al editar se bloquean, o se crearía otra fila. */
  protected readonly esAlta = signal(false);
  protected readonly guardando = signal(false);

  /** Los transportistas PRESENTES en la tabla, que no son los mismos que los disponibles. */
  protected readonly presentes = computed(() => transportistasDeCobertura(this.coberturas()));

  /**
   * Las filas que se ven, con lo legible ya resuelto.
   *
   * <p>Se calcula una vez por cambio y no desde la plantilla fila a fila: la tabla puede tener los 90
   * destinos de un transportista más los del otro, y formatear en cada repintado se nota.
   */
  protected readonly visibles = computed(() => {
    const carrier = this.seleccion().carrier;
    const filas = carrier
      ? this.coberturas().filter((c) => c.carrier === carrier)
      : this.coberturas();
    return filas.map((destino) => ({
      ...destino,
      plazoLegible: plazoLegible(destino),
      tarifaLegible: `${importeLegible(destino.baseCents)} + ${importeLegible(destino.porKgCents)}/kg`,
    }));
  });

  constructor() {
    void this.recarga();
  }

  private async recarga(): Promise<void> {
    const [filas, transportistas] = await Promise.all([
      this.consulta.ejecuta(),
      this.consultaTransportistas.ejecuta(),
    ]);
    if (filas.ok) {
      this.coberturas.set(filas.valor);
    } else {
      this.avisos.error(filas.error.mensaje || this.t('common.error'));
    }
    // Que falle la lista de transportistas no impide ver la tabla: solo deja el desplegable del
    // formulario vacío, y es mejor eso que una pantalla en blanco.
    if (transportistas.ok) {
      this.disponibles.set(transportistas.valor);
    }
  }

  /** Un destino nuevo nace con el transportista filtrado, que es casi siempre el que se quiere. */
  protected abreAlta(): void {
    this.editando.set(coberturaEnBlanco(this.seleccion().carrier));
    this.esAlta.set(true);
  }

  protected abreEdicion(destino: CoberturaDeTransportista): void {
    this.editando.set({ ...destino });
    this.esAlta.set(false);
  }

  protected async guardaCobertura(destino: CoberturaDeTransportista): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.guardador.ejecuta(destino);
      if (!resultado.ok) {
        this.avisos.error(this.mensajeDeFallo(resultado.error));
        return;
      }
      this.editando.set(null);
      await this.recarga();
    } finally {
      this.guardando.set(false);
    }
  }

  protected async alterna(destino: CoberturaDeTransportista): Promise<void> {
    const resultado = await this.alternador.ejecuta(destino);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    await this.recarga();
  }

  /**
   * Borrar pide confirmación nombrando el destino.
   *
   * <p>Y el texto dice que se pierden la tarifa y el plazo, porque es lo que distingue borrar de
   * apagar: con el interruptor el destino vuelve tal como estaba, borrado hay que medirlo otra vez.
   */
  protected async borra(destino: CoberturaDeTransportista): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.t('admin.carrier_coverage.delete_confirm')
        .replace('{ca}', destino.carrier)
        .replace('{co}', destino.nombre || destino.pais),
      this.t('admin.carrier_coverage.delete_title'),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.borrador.ejecuta(destino);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    await this.recarga();
  }

  private mensajeDeFallo(error: unknown): string {
    if (error === 'sin-clave') {
      return this.t('admin.carrier_coverage.hint.country');
    }
    return (error as { mensaje?: string }).mensaje || this.t('common.error');
  }
}
