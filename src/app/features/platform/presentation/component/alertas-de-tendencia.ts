import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FieldTree, FormField, form, max, min, required } from '@angular/forms/signals';
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

/** El umbral se pide en la escala de la tabla de anuncios, que es la que se ve. */
const UMBRAL_MINIMO = 0;
const UMBRAL_MAXIMO = 100;

/**
 * Las alertas de tendencia: crearlas, verlas y borrarlas.
 *
 * <p>El umbral se pide de 0 a 100, que es la escala en la que se enseña la puntuación en la tabla de
 * anuncios. El backend lo guarda de 0 a 1, y esa conversión la hace el caso de uso: pedirlo en una
 * escala y enseñarlo en otra era la forma segura de que nadie entendiera qué había configurado.
 *
 * <p>Los límites de la escala eran `min` y `max` escritos a mano en el HTML: el navegador los respetaba
 * con las flechas y los ignoraba al teclear, así que un 400 llegaba al backend. Ahora son reglas del
 * esquema —que además devuelven los atributos al campo—, así que el botón se apaga solo.
 *
 * <p>MOBILE FIRST: el formulario envuelve en varias líneas y cada campo tiene su ancho mínimo; en
 * pantalla ancha queda en una sola fila.
 */
@Component({
  selector: 'nx-alertas-de-tendencia',
  imports: [FaIconComponent, FormField],
  template: `
    <div class="space-y-4">
      <form class="card p-4 flex flex-wrap gap-2 items-end" (submit)="envia($event)">
        <div class="flex-1 min-w-[200px]">
          <label for="alerta-palabra" class="text-xs text-ink-500">
            {{ t('intel.alert.keyword') }}
          </label>
          <input id="alerta-palabra" class="input mt-1" [formField]="formulario.palabra" />
        </div>

        <div class="w-28">
          <label for="alerta-umbral" class="text-xs text-ink-500">
            {{ t('intel.alert.threshold') }} (0–100)
          </label>
          <input
            id="alerta-umbral"
            type="number"
            step="5"
            class="input mt-1"
            [formField]="formulario.umbral"
          />
          @if (falloDe(formulario.umbral); as fallo) {
            <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
          }
        </div>

        <div class="w-32">
          <label for="alerta-canal" class="text-xs text-ink-500">
            {{ t('intel.alert.channel') }}
          </label>
          <select id="alerta-canal" class="input mt-1" [formField]="formulario.canal">
            @for (opcion of canales; track opcion) {
              <option [value]="opcion">{{ t('intel.channel.' + opcion) }}</option>
            }
          </select>
        </div>

        <button type="submit" class="btn btn-primary" [disabled]="!sePuedeCrear()">
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

  /** El canal es elegible; antes estaba fijado a correo y no había forma de saberlo desde la pantalla. */
  protected readonly modelo = signal<{ palabra: string; umbral: number | null; canal: string }>({
    palabra: '',
    umbral: 75,
    canal: 'EMAIL',
  });

  /**
   * La palabra clave NO es obligatoria: una alerta sin ella vigila todas las tendencias, que es un uso
   * legítimo y el que trae el backend por defecto.
   *
   * <p>El tope de 100 se declara sin mensaje a propósito: no hay ninguna cadena traducida a los ocho
   * idiomas que diga «como mucho 100», y escribir una a medias en español sería peor que el atributo
   * `max` que la propia regla devuelve al campo. Queda anotado.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.umbral, { message: () => this.t('dialog.field.required') });
    min(ruta.umbral, UMBRAL_MINIMO, { message: () => this.t('dialog.field.min') });
    max(ruta.umbral, UMBRAL_MAXIMO);
  });

  protected readonly sePuedeCrear = computed(
    () => !this.creando() && !this.formulario().invalid(),
  );

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.sePuedeCrear()) {
      return;
    }
    const datos = this.modelo();
    this.crea.emit({
      palabraClave: datos.palabra,
      // El umbral viaja en texto porque así lo espera el caso de uso, que es quien cambia de escala.
      umbralSobreCien: datos.umbral === null ? '' : String(datos.umbral),
      canal: datos.canal,
    });
    // Solo la palabra: el umbral y el canal recién elegidos suelen valer para la siguiente alerta.
    this.formulario.palabra().value.set('');
  }

  protected sobreCien(alerta: AlertaDeTendencia): number {
    return puntuacionSobreCien(alerta.umbral);
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo. Se calla hasta que el campo se ha TOCADO:
   * pintar de rojo un formulario recién abierto acusa a quien todavía no ha escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }
}
