import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  ESTADOS_DE_PROYECTO,
  ProyectoOdm,
  presupuestoEnDolares,
} from '../../domain/model/proyecto-odm';
import { VentanaModal } from './ventana-modal';

/** Lo que se guarda al editar. El presupuesto ya viene en dólares: aquí no se convierte nada. */
export interface EdicionDeProyecto {
  readonly titulo: string;
  readonly resumen: string;
  readonly presupuestoEnDolares: string;
}

/**
 * El detalle de un proyecto: editarlo, avanzar su estado o borrarlo.
 *
 * <p>El presupuesto de esta ficha se escribe SIEMPRE en dólares —así lo dice la etiqueta— y por eso no
 * lleva selector de divisa: aquí se está corrigiendo un importe ya guardado, no autorizando uno nuevo.
 * Mezclar las dos cosas en el mismo formulario era pedir que alguien escribiera euros donde se leían
 * dólares.
 */
@Component({
  selector: 'nx-dialogo-detalle-de-proyecto',
  imports: [FaIconComponent, VentanaModal],
  template: `
    <nx-ventana-modal
      [titulo]="t('odm.kind.' + proyecto().clase)"
      ancho="lg"
      (cierra)="cancela.emit()"
    >
      <div class="space-y-3">
        <div>
          <label for="odm-detalle-estado" class="text-xs text-ink-500">{{ t('odm.status') }}</label>
          <select
            id="odm-detalle-estado"
            class="input mt-1"
            [value]="proyecto().estado"
            (change)="cambiaEstado.emit(valor($event))"
          >
            @for (opcion of estados; track opcion) {
              <option [value]="opcion">{{ opcion }}</option>
            }
          </select>
        </div>

        <div>
          <label for="odm-detalle-titulo" class="text-xs text-ink-500">
            {{ t('odm.field.title') }}
          </label>
          <input
            id="odm-detalle-titulo"
            class="input mt-1"
            [value]="titulo()"
            (input)="titulo.set(valor($event))"
          />
        </div>

        <div>
          <label for="odm-detalle-resumen" class="text-xs text-ink-500">
            {{ t('odm.field.brief') }}
          </label>
          <textarea
            id="odm-detalle-resumen"
            rows="3"
            class="input mt-1"
            [value]="resumen()"
            (input)="resumen.set(valor($event))"
          ></textarea>
        </div>

        <div>
          <label for="odm-detalle-presupuesto" class="text-xs text-ink-500">
            {{ t('odm.field.budget') }} (USD)
          </label>
          <input
            id="odm-detalle-presupuesto"
            type="number"
            step="0.01"
            class="input mt-1"
            [value]="presupuesto()"
            (input)="presupuesto.set(valor($event))"
          />
        </div>

        <div class="text-[11px] text-ink-500">SLA {{ proyecto().diasDeCompromiso }}d</div>
      </div>

      <div class="flex justify-between gap-2 mt-4">
        <button type="button" class="btn btn-outline btn-error btn-sm" (click)="elimina.emit()">
          <fa-icon [icon]="iconos.papelera" /> {{ t('odm.action.delete') }}
        </button>
        <div class="flex gap-2">
          <button type="button" class="btn btn-ghost btn-sm" (click)="cancela.emit()">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            [disabled]="!titulo().trim() || guardando()"
            (click)="guarda()"
          >
            <fa-icon [icon]="iconos.lapiz" /> {{ t('odm.action.save') }}
          </button>
        </div>
      </div>
    </nx-ventana-modal>
  `,
})
export class DialogoDetalleDeProyecto {
  readonly proyecto = input.required<ProyectoOdm>();
  readonly guardando = input(false);

  readonly cambiaEstado = output<string>();
  readonly guardaCambios = output<EdicionDeProyecto>();
  readonly elimina = output<void>();
  readonly cancela = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly estados = ESTADOS_DE_PROYECTO;
  protected readonly iconos = { lapiz: faPen, papelera: faTrash };

  /**
   * `linkedSignal` sobre el proyecto: cuando el servidor devuelve la versión guardada, los campos se
   * ponen al día solos sin que la pantalla tenga que acordarse de rellenarlos otra vez.
   */
  protected readonly titulo = linkedSignal(() => this.proyecto().titulo);
  protected readonly resumen = linkedSignal(() => this.proyecto().resumen ?? '');
  protected readonly presupuesto = linkedSignal(() => {
    const dolares = presupuestoEnDolares(this.proyecto());
    // Vacío y no «0»: un proyecto sin presupuesto no es un proyecto de cero dólares.
    return dolares > 0 ? String(dolares) : '';
  });

  protected guarda(): void {
    this.guardaCambios.emit({
      titulo: this.titulo(),
      resumen: this.resumen(),
      presupuestoEnDolares: this.presupuesto(),
    });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }
}
