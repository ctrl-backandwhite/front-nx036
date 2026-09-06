import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  CLASES_DE_PROYECTO,
  DIVISAS_DE_PRESUPUESTO,
  presupuestoEnCentimosUsd,
} from '../../domain/model/proyecto-odm';
import { TasaDeCambio, formateaImporte } from '../../domain/model/tasa-de-cambio';
import { FormularioDeProyecto } from '../../application/use-case/crea-proyecto-odm.use-case';
import { VentanaModal } from './ventana-modal';

/**
 * El formulario para abrir un proyecto a medida.
 *
 * <p>El presupuesto se escribe en la divisa que se quiera y el backend lo guarda en dólares. Se enseña
 * la conversión ANTES de enviar: es la única forma de que quien autoriza un presupuesto vea lo que se
 * va a guardar. Cuando no se enseñaba, un error en el sentido de la división convirtió 100 € en 92 $ y
 * nadie lo notó hasta que el proveedor entregó por debajo de lo esperado.
 */
@Component({
  selector: 'nx-dialogo-nuevo-proyecto',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('odm.new')" (cierra)="cancela.emit()">
      <form class="space-y-3 mt-3" (submit)="envia($event)">
        <div>
          <label for="odm-clase" class="text-xs text-ink-500">{{ t('odm.kind') }}</label>
          <select
            id="odm-clase"
            class="input mt-1"
            [value]="clase()"
            (change)="clase.set(valor($event))"
          >
            @for (opcion of clases; track opcion) {
              <option [value]="opcion">{{ t('odm.kind.' + opcion) }}</option>
            }
          </select>
        </div>

        <div>
          <label for="odm-titulo" class="text-xs text-ink-500">{{ t('odm.field.title') }}</label>
          <input
            id="odm-titulo"
            required
            class="input mt-1"
            [value]="titulo()"
            (input)="titulo.set(valor($event))"
          />
        </div>

        <div>
          <label for="odm-resumen" class="text-xs text-ink-500">{{ t('odm.field.brief') }}</label>
          <textarea
            id="odm-resumen"
            rows="3"
            class="input mt-1"
            [value]="resumen()"
            (input)="resumen.set(valor($event))"
          ></textarea>
        </div>

        <div>
          <label for="odm-presupuesto" class="text-xs text-ink-500">
            {{ t('odm.field.budget') }}
          </label>
          <div class="flex items-center gap-2 mt-1">
            <!--
              El selector de divisa necesita su propio nombre accesible: sin él, un lector de pantalla
              anuncia dos campos seguidos llamados «Presupuesto».
            -->
            <select
              class="select select-bordered text-sm w-auto"
              [attr.aria-label]="t('common.currency')"
              [value]="divisa()"
              (change)="divisa.set(valor($event))"
            >
              @for (codigo of divisas; track codigo) {
                <option [value]="codigo">{{ codigo }}</option>
              }
            </select>
            <input
              id="odm-presupuesto"
              type="number"
              step="0.01"
              class="input flex-1"
              [value]="presupuesto()"
              (input)="presupuesto.set(valor($event))"
            />
          </div>
          <div class="text-[10px] text-ink-400 mt-0.5">{{ t('odm.field.budget_hint') }}</div>
          @if (equivalenteEnDolares(); as equivalente) {
            <div class="text-[11px] text-ink-500 mt-1">
              {{ t('odm.budget_stored_usd') }}: <strong>{{ equivalente }}</strong>
            </div>
          }
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost" (click)="cancela.emit()">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="enviando() || !titulo().trim()">
            {{ t('odm.new') }}
          </button>
        </div>
      </form>
    </nx-ventana-modal>
  `,
})
export class DialogoNuevoProyecto {
  readonly tasas = input<readonly TasaDeCambio[]>([]);
  /** La divisa activa de quien mira: es la que tiene sentido preseleccionar. */
  readonly divisaInicial = input('USD');
  readonly enviando = input(false);

  readonly crea = output<FormularioDeProyecto>();
  readonly cancela = output<void>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  protected readonly clases = CLASES_DE_PROYECTO;
  protected readonly divisas = DIVISAS_DE_PRESUPUESTO;

  protected readonly clase = signal<string>('ODM_FREE');
  protected readonly titulo = signal('');
  protected readonly resumen = signal('');
  protected readonly presupuesto = signal('');
  protected readonly divisa = signal(this.divisaInicial());

  /** Solo se enseña cuando hay algo que convertir y la divisa no es ya el dólar. */
  protected readonly equivalenteEnDolares = computed(() => {
    if (this.divisa() === 'USD') {
      return null;
    }
    const centimos = presupuestoEnCentimosUsd(this.presupuesto(), this.divisa(), this.tasas());
    return centimos ? formateaImporte(centimos / 100, 'USD', this.traduccion.idioma()) : null;
  });

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.titulo().trim()) {
      return;
    }
    this.crea.emit({
      clase: this.clase(),
      titulo: this.titulo(),
      resumen: this.resumen(),
      presupuesto: this.presupuesto(),
      divisa: this.divisa(),
    });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }
}
