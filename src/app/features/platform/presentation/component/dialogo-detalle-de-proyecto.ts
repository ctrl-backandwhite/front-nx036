import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FieldTree, FormField, form, min, required, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  ESTADOS_DE_PROYECTO,
  ProyectoOdm,
  presupuestoEnDolares,
} from '../../domain/model/proyecto-odm';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { VentanaModal } from './ventana-modal';

/** Lo que se guarda al editar. El presupuesto ya viene en dólares: aquí no se convierte nada. */
export interface EdicionDeProyecto {
  readonly titulo: string;
  readonly resumen: string;
  readonly presupuestoEnDolares: string;
}

/** La ficha editable. El presupuesto va en número porque el campo es `type="number"`; nulo = sin importe. */
interface FichaDeProyecto {
  estado: string;
  titulo: string;
  resumen: string;
  presupuesto: number | null;
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
  imports: [FaIconComponent, FormField, VentanaModal],
  template: `
    <nx-ventana-modal
      [titulo]="t('odm.kind.' + proyecto().clase)"
      ancho="lg"
      (cierra)="cancela.emit()"
    >
      <div class="space-y-3">
        <div>
          <label for="odm-detalle-estado" class="text-xs text-ink-500">{{ t('odm.status') }}</label>
          <!-- El estado no se guarda con el resto: avanza en cuanto se elige, que es como lo trata el
               backend. Por eso sigue avisando al padre en el propio (change). -->
          <select
            id="odm-detalle-estado"
            class="input mt-1"
            [formField]="formulario.estado"
            (change)="avisaDelEstado()"
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
          <input id="odm-detalle-titulo" class="input mt-1" [formField]="formulario.titulo" />
          @if (falloDe(formulario.titulo); as fallo) {
            <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
          }
        </div>

        <div>
          <label for="odm-detalle-resumen" class="text-xs text-ink-500">
            {{ t('odm.field.brief') }}
          </label>
          <textarea
            id="odm-detalle-resumen"
            rows="3"
            class="input mt-1"
            [formField]="formulario.resumen"
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
            [formField]="formulario.presupuesto"
          />
          @if (falloDe(formulario.presupuesto); as fallo) {
            <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
          }
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
            [disabled]="!sePuedeGuardar()"
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
  protected readonly modelo = linkedSignal<FichaDeProyecto>(() => {
    const proyecto = this.proyecto();
    const dolares = presupuestoEnDolares(proyecto);
    return {
      estado: proyecto.estado,
      titulo: proyecto.titulo,
      resumen: proyecto.resumen ?? '',
      // Nulo y no cero: un proyecto sin presupuesto no es un proyecto de cero dólares.
      presupuesto: dolares > 0 ? dolares : null,
    };
  });

  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.titulo, { message: () => this.t('dialog.field.required') });
    // Un título de solo espacios está tan vacío como uno sin nada, y `required` no lo ve.
    validate(ruta.titulo, ({ value }) =>
      value().trim() === '' ? { kind: 'en-blanco', message: this.t('dialog.field.required') } : null,
    );
    min(ruta.presupuesto, 0, { message: () => this.t('dialog.field.min') });
  });

  /** Un único sitio al que preguntar si los cambios se pueden guardar. */
  protected readonly sePuedeGuardar = computed(
    () => !this.guardando() && !this.formulario().invalid(),
  );

  protected avisaDelEstado(): void {
    this.cambiaEstado.emit(this.formulario.estado().value());
  }

  protected guarda(): void {
    const ficha = this.modelo();
    this.guardaCambios.emit({
      titulo: ficha.titulo,
      resumen: ficha.resumen,
      // El importe viaja en texto porque así lo espera la pantalla, que es quien lo pasa a céntimos.
      presupuestoEnDolares: ficha.presupuesto === null ? '' : String(ficha.presupuesto),
    });
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo. Se calla hasta que el campo se ha TOCADO:
   * pintar de rojo una ficha recién abierta acusa a quien todavía no ha tocado nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }
}
