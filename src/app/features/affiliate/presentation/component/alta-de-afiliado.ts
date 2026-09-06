import { Component, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHandshakeAngle } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La invitación al programa de referidos, con lo que se gana y lo que se acepta.
 *
 * <p>El alta es EXPLÍCITA y con condiciones marcadas a mano: sin ese gesto no hay panel. Dar de alta a
 * alguien por el hecho de abrir la pantalla convertiría un contrato en un descuido.
 */
@Component({
  selector: 'nx-alta-de-afiliado',
  imports: [FaIconComponent],
  template: `
    <div class="space-y-5 max-w-2xl mx-auto">
      <header class="text-center max-w-xl mx-auto">
        <h1>{{ t('affiliate.title') }}</h1>
        <p class="text-sm text-ink-500 mt-1">{{ subtitulo() }}</p>
      </header>
      <section class="card p-6 space-y-4 max-w-lg mx-auto w-full">
        <h2 class="font-medium text-center">{{ t('affiliate.join.how_title') }}</h2>
        <ol class="text-sm text-ink-700 space-y-1 list-decimal pl-5 mx-auto w-fit text-left">
          <li>{{ t('affiliate.join.step1') }}</li>
          <li>{{ paso2() }}</li>
          <li>{{ paso3() }}</li>
        </ol>
        <label class="flex items-start gap-2 text-sm justify-center" for="afiliado-condiciones">
          <input
            id="afiliado-condiciones"
            type="checkbox"
            class="checkbox checkbox-sm mt-0.5"
            [checked]="acepta()"
            (change)="cambiaAceptacion($event)"
          />
          <span>{{ t('affiliate.join.terms') }}</span>
        </label>
        <button
          type="button"
          (click)="inscribe.emit()"
          [disabled]="!acepta() || enviando()"
          class="btn btn-primary mx-auto"
        >
          <fa-icon [icon]="iconoAcuerdo" /> {{ t('affiliate.join.cta') }}
        </button>
      </section>
    </div>
  `,
})
export class AltaDeAfiliado {
  readonly porcentaje = input.required<number>();
  readonly minimoFormateado = input.required<string>();
  readonly enviando = input(false);
  readonly inscribe = output<void>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly iconoAcuerdo = faHandshakeAngle;
  protected readonly acepta = signal(false);

  protected subtitulo(): string {
    return this.traduccion.tCon('affiliate.subtitle', { pct: this.porcentaje() });
  }

  protected paso2(): string {
    return this.traduccion.tCon('affiliate.join.step2', { pct: this.porcentaje() });
  }

  protected paso3(): string {
    return this.traduccion.tCon('affiliate.join.step3', { n: this.minimoFormateado() });
  }

  protected cambiaAceptacion(evento: Event): void {
    this.acepta.set((evento.target as HTMLInputElement).checked);
  }
}
