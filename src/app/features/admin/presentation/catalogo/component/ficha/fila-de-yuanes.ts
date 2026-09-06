import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, min, required } from '@angular/forms/signals';
import { GuiaPuntos } from '@ds/component/guia-puntos/guia-puntos';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImporteEnYuanes } from '../../../../domain/catalogo/model/ficha-de-producto';

/**
 * Un importe en yuanes que se edita con doble clic desde el resumen de la ficha.
 *
 * <p>Los tres importes —el recargo y las dos bolsas de subvención— se editan igual, así que comparten
 * componente. Lo que se ENSEÑA es lo que manda el backend ya convertido; lo que se ESCRIBE son yuanes,
 * que es como se guardan. Mezclarlos haría que el importe cambiara solo al cambiar de moneda.
 *
 * <p>Se guarda con Intro y se cancela con Escape. Salir del campo cancela también: un doble clic sin
 * querer no puede acabar cambiando un importe que decide el precio.
 */
@Component({
  selector: 'nx-fila-de-yuanes',
  imports: [FormField, GuiaPuntos],
  template: `
    @if (editando()) {
      <div class="flex items-baseline text-[13px]">
        <span class="text-ink-500 whitespace-nowrap">{{ etiqueta() }}</span>
        <nx-guia-puntos />
        <input
          type="number"
          step="0.01"
          class="input input-sm w-28 text-right"
          [attr.aria-label]="etiquetaDelCampo()"
          [formField]="formulario.importe"
          (keydown.enter)="guarda()"
          (keydown.escape)="editando.set(false)"
          (blur)="editando.set(false)"
        />
      </div>
    } @else {
      <div
        class="flex items-baseline text-[13px] cursor-pointer"
        [title]="ayuda()"
        (dblclick)="empieza()"
      >
        <span class="text-ink-500 whitespace-nowrap">{{ etiqueta() }}</span>
        <nx-guia-puntos />
        <span class="font-medium text-right whitespace-nowrap">{{ formateado() || '—' }}</span>
      </div>
    }
  `,
})
export class FilaDeYuanes {
  readonly campo = input.required<ImporteEnYuanes>();
  readonly etiqueta = input.required<string>();
  readonly etiquetaDelCampo = input.required<string>();
  readonly ayuda = input('');
  /** Lo que se enseña: el importe ya convertido y formateado por el backend. */
  readonly formateado = input<string | undefined>(undefined);
  /** Lo que se edita: el importe crudo en yuanes. */
  readonly crudo = input<number | null | undefined>(undefined);

  readonly guardado = output<{ campo: ImporteEnYuanes; importe: number }>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly editando = signal(false);

  protected readonly modelo = signal<{ importe: number | null }>({ importe: 0 });

  /**
   * Las dos reglas del importe, que antes vivían repartidas entre un atributo `min="0"` y una
   * comprobación al guardar. Un importe vacío o negativo no se manda: el `min` del marcado solo limitaba
   * las flechas del navegador, así que un −5 tecleado llegaba a la comprobación y se descartaba en
   * silencio; ahora es el formulario el que lo sabe.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.importe);
    min(ruta.importe, 0);
  });

  protected empieza(): void {
    this.modelo.set({ importe: this.crudo() ?? 0 });
    this.editando.set(true);
  }

  protected guarda(): void {
    this.editando.set(false);
    const importe = this.modelo().importe;
    if (this.formulario().invalid() || importe === null) {
      return;
    }
    this.guardado.emit({ campo: this.campo(), importe });
  }
}
