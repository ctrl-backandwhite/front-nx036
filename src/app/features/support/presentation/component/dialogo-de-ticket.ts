import { Component, computed, inject, output, signal } from '@angular/core';
import { FieldTree, FormField, form, required, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ClaseDeTicket, NuevoTicket } from '../../domain/model/ticket';

/**
 * El formulario para abrir un ticket.
 *
 * <p>Va aparte de la página porque son responsabilidades distintas: la página decide qué pasa con lo que
 * se escribe y esto solo lo recoge.
 *
 * <p>NO se limpia solo al enviar. Si el backend rechaza, lo escrito sigue ahí para corregirlo sin volver
 * a teclearlo; quien lo borra es la página, y solo cuando el ticket existe de verdad.
 */
@Component({
  selector: 'nx-dialogo-de-ticket',
  imports: [FormField],
  template: `
    <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
         role="dialog" aria-modal="true" [attr.aria-label]="t('support.new')">
      <div class="absolute inset-0" (click)="cierra.emit()" (keydown.escape)="cierra.emit()" tabindex="-1"></div>
      <div class="card bg-base-100 relative w-full max-w-md p-5 border border-base-200 shadow-xl">
        <h3 class="text-lg font-semibold">{{ t('support.new') }}</h3>
        <form (submit)="envia($event)" class="space-y-3 mt-3">
          <div>
            <label for="ticket-clase" class="text-xs opacity-70">{{ t('support.kind') }}</label>
            <select id="ticket-clase" class="select select-bordered w-full mt-1"
                    [formField]="formulario.clase">
              <option value="SUPPORT">{{ t('support.kind.SUPPORT') }}</option>
              <option value="DISPUTE">{{ t('support.kind.DISPUTE') }}</option>
            </select>
          </div>
          <div>
            <label for="ticket-asunto" class="text-xs opacity-70">{{ t('support.subject') }}</label>
            <input id="ticket-asunto" class="input input-bordered w-full mt-1"
                   [formField]="formulario.asunto" />
            @if (falloDe(formulario.asunto); as fallo) {
              <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
            }
          </div>
          <div>
            <label for="ticket-cuerpo" class="text-xs opacity-70">{{ t('support.body') }}</label>
            <textarea id="ticket-cuerpo" rows="4" class="textarea textarea-bordered w-full mt-1"
                      [formField]="formulario.cuerpo"></textarea>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" (click)="cierra.emit()">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary" [disabled]="!sePuedeEnviar()">
              {{ t('support.new') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class DialogoDeTicket {
  protected readonly t = inject(TraduccionService).t;

  readonly enviando = signal(false);
  readonly cierra = output<void>();
  readonly abre = output<NuevoTicket>();

  /**
   * La clase viaja como texto porque un `<select>` atado con `[formField]` habla en texto: el tipo del
   * dominio se recupera al emitir, y solo con los dos valores que tienen `<option>`.
   */
  protected readonly modelo = signal({ clase: 'SUPPORT', asunto: '', cuerpo: '' });

  /**
   * Sin asunto no hay ticket: es lo único que ve quien atiende en la lista de la bandeja, y una fila
   * sin título es indistinguible de las demás. El cuerpo sí puede ir vacío —se sigue en el hilo—.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.asunto, { message: () => this.t('dialog.field.required') });
    // Un asunto de solo espacios está tan vacío como uno sin nada, y `required` no lo ve.
    validate(ruta.asunto, ({ value }) =>
      value().trim() === '' ? { kind: 'en-blanco', message: this.t('dialog.field.required') } : null,
    );
  });

  /** Un único sitio al que preguntar si el ticket se puede abrir. */
  protected readonly sePuedeEnviar = computed(
    () => !this.enviando() && !this.formulario().invalid(),
  );

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    const datos = this.modelo();
    this.abre.emit({ clase: this.claseDelDominio(), asunto: datos.asunto, cuerpo: datos.cuerpo });
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo. Se calla hasta que el campo se ha TOCADO:
   * pintar de rojo un formulario recién abierto acusa a quien todavía no ha escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  /** Sin conversión forzada: se compara con el valor que existe y el otro es el de partida. */
  private claseDelDominio(): ClaseDeTicket {
    return this.modelo().clase === 'DISPUTE' ? 'DISPUTE' : 'SUPPORT';
  }
}
