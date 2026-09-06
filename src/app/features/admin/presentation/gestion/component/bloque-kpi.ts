import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition, faArrowTrendDown, faArrowTrendUp,
} from '@fortawesome/free-solid-svg-icons';
import { ContadorAnimado } from '@ds/component/movimiento/contador-animado';

/**
 * Una cifra de cabecera del cuadro de mando.
 *
 * <p>El icono va dentro de un círculo teñido con el color del indicador: en una fila de seis cifras,
 * el color es lo que permite volver a encontrar la que se estaba mirando.
 *
 * <p>Mientras carga se enseña un indicador de espera y NO un cero: un cero es un dato, y verlo un
 * instante hace pensar que el catálogo está vacío.
 */
@Component({
  selector: 'nx-bloque-kpi',
  imports: [FaIconComponent, ContadorAnimado],
  template: `
    <div class="stat">
      <div class="stat-figure" [class]="'text-' + tono()">
        <span class="kpi-icon"><fa-icon [icon]="icono()" class="text-lg" /></span>
      </div>
      <div class="stat-title text-[11px]">{{ etiqueta() }}</div>
      <div class="stat-value text-2xl">
        @if (cargando()) {
          <span class="loading loading-bars loading-md"></span>
        } @else {
          <nx-contador-animado [valor]="valor() ?? 0" />
        }
      </div>
      @if (tendencia(); as texto) {
        <div class="stat-desc inline-flex items-center gap-1" [class.text-success]="alAlza()">
          <fa-icon [icon]="alAlza() ? iconoArriba : iconoAbajo" class="text-[10px]" />
          {{ texto }}
        </div>
      }
    </div>
  `,
})
export class BloqueKpi {
  readonly icono = input.required<IconDefinition>();
  readonly etiqueta = input.required<string>();
  readonly valor = input<number | undefined>(undefined);
  readonly tendencia = input<string | undefined>(undefined);
  readonly alAlza = input(false);
  readonly cargando = input(false);
  readonly tono = input('primary');

  protected readonly iconoArriba = faArrowTrendUp;
  protected readonly iconoAbajo = faArrowTrendDown;
}
