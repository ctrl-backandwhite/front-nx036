import { Component, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  AlertaDeTendencia,
  CANALES_DE_ALERTA,
  puntuacionSobreCien,
} from '../../domain/model/inteligencia';

/** Lo que se pide para crear una alerta. */
export interface PeticionDeAlerta {
  readonly palabraClave: string;
  readonly umbralSobreCien: string;
  readonly canal: string;
}

/**
 * Las alertas de tendencia: crearlas, verlas y borrarlas.
 *
 * <p>El umbral se pide de 0 a 100, que es la escala en la que se enseña la puntuación en la tabla de
 * anuncios. El backend lo guarda de 0 a 1, y esa conversión la hace el caso de uso: pedirlo en una
 * escala y enseñarlo en otra era la forma segura de que nadie entendiera qué había configurado.
 *
 * <p>MOBILE FIRST: el formulario envuelve en varias líneas y cada campo tiene su ancho mínimo; en
 * pantalla ancha queda en una sola fila.
 */
@Component({
  selector: 'nx-alertas-de-tendencia',
  imports: [FaIconComponent],
  template: `
    <div class="space-y-4">
      <form class="card p-4 flex flex-wrap gap-2 items-end" (submit)="envia($event)">
        <div class="flex-1 min-w-[200px]">
          <label for="alerta-palabra" class="text-xs text-ink-500">
            {{ t('intel.alert.keyword') }}
          </label>
          <input
            id="alerta-palabra"
            class="input mt-1"
            [value]="palabra()"
            (input)="palabra.set(valor($event))"
          />
        </div>

        <div class="w-28">
          <label for="alerta-umbral" class="text-xs text-ink-500">
            {{ t('intel.alert.threshold') }} (0–100)
          </label>
          <input
            id="alerta-umbral"
            type="number"
            step="5"
            min="0"
            max="100"
            class="input mt-1"
            [value]="umbral()"
            (input)="umbral.set(valor($event))"
          />
        </div>

        <div class="w-32">
          <label for="alerta-canal" class="text-xs text-ink-500">
            {{ t('intel.alert.channel') }}
          </label>
          <select
            id="alerta-canal"
            class="input mt-1"
            [value]="canal()"
            (change)="canal.set(valor($event))"
          >
            @for (opcion of canales; track opcion) {
              <option [value]="opcion">{{ t('intel.channel.' + opcion) }}</option>
            }
          </select>
        </div>

        <button type="submit" class="btn btn-primary" [disabled]="creando()">
          <fa-icon [icon]="iconos.mas" /> {{ t('intel.add_alert') }}
        </button>
      </form>

      @if (alertas().length === 0) {
        <div class="card p-8 text-center text-ink-500">{{ t('intel.empty.alerts') }}</div>
      }

      <div class="space-y-2">
        @for (alerta of alertas(); track alerta.id) {
          <div class="card p-3 flex items-center gap-3">
            <span class="badge bg-brand-50 text-brand-700">{{ alerta.canal }}</span>
            <div class="flex-1 text-[13px]">
              {{ alerta.palabraClave ?? '—' }}
              @if (alerta.umbral !== null && alerta.umbral !== undefined) {
                <span class="text-ink-500 text-[11px]">≥ {{ sobreCien(alerta) }}/100</span>
              }
            </div>
            <button
              type="button"
              class="btn btn-ghost text-red-600 text-[12px]"
              [attr.aria-label]="t('actions.delete')"
              (click)="elimina.emit(alerta.id)"
            >
              <fa-icon [icon]="iconos.papelera" />
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class AlertasDeTendencia {
  readonly alertas = input<readonly AlertaDeTendencia[]>([]);
  readonly creando = input(false);
  readonly crea = output<PeticionDeAlerta>();
  readonly elimina = output<string>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly canales = CANALES_DE_ALERTA;
  protected readonly iconos = { mas: faPlus, papelera: faTrashCan };

  protected readonly palabra = signal('');
  protected readonly umbral = signal('75');
  /** El canal es elegible; antes estaba fijado a correo y no había forma de saberlo desde la pantalla. */
  protected readonly canal = signal<string>('EMAIL');

  protected envia(evento: Event): void {
    evento.preventDefault();
    this.crea.emit({
      palabraClave: this.palabra(),
      umbralSobreCien: this.umbral(),
      canal: this.canal(),
    });
    this.palabra.set('');
  }

  protected sobreCien(alerta: AlertaDeTendencia): number {
    return puntuacionSobreCien(alerta.umbral);
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
