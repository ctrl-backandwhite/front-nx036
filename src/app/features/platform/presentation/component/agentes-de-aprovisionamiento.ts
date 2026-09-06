import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AgenteResumido } from '../../domain/model/aprovisionamiento';

/**
 * El escaparate de agentes de aprovisionamiento.
 *
 * <p>MOBILE FIRST: una columna en el móvil, dos a partir de `sm` y tres en pantalla grande.
 */
@Component({
  selector: 'nx-agentes-de-aprovisionamiento',
  imports: [FaIconComponent],
  template: `
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      @for (agente of agentes(); track agente.id) {
        <div class="card p-4">
          <div class="flex items-baseline justify-between mb-2">
            <span class="badge" [class]="clasesDeCategoria(agente.categoria)">
              {{ agente.categoria }}
            </span>
            <span class="text-[12px] text-ink-700">
              <fa-icon [icon]="iconoEstrella" class="text-amber-500 mr-1" />
              {{ satisfaccion(agente) }}
            </span>
          </div>
          <div class="font-medium">{{ agente.nombre }}</div>
          <div class="text-[11px] text-ink-500 mt-1">
            {{ agente.trabajosCompletados }} {{ t('sourcing.agent_completed').toLowerCase() }}
          </div>
        </div>
      }
    </div>
  `,
})
export class AgentesDeAprovisionamiento {
  readonly agentes = input<readonly AgenteResumido[]>([]);

  protected readonly iconoEstrella = faStar;
  protected readonly t = inject(TraduccionService).t;

  /**
   * El color de la categoría del agente. Una categoría desconocida cae en el neutro: el día que el
   * backend añada un escalón, la ficha se sigue pintando en vez de quedarse sin insignia.
   */
  protected clasesDeCategoria(categoria: string): string {
    const colores: Readonly<Record<string, string>> = {
      STRATEGIC: 'bg-brand-100 text-brand-800',
      SENIOR: 'bg-emerald-100 text-emerald-700',
      MID: 'bg-amber-100 text-amber-700',
      JUNIOR: 'bg-ink-100 text-ink-700',
    };
    return colores[categoria] ?? 'bg-ink-100 text-ink-700';
  }

  /** Dos decimales, y `Number` antes: el backend serializa esto como cadena en algunas rutas. */
  protected satisfaccion(agente: AgenteResumido): string {
    return Number(agente.satisfaccion).toFixed(2);
  }
}
