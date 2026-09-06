import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faEnvelopeOpenText,
  faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { GestionaElBoletin } from '../../application/use-case/gestiona-el-boletin.use-case';

/**
 * La suscripción al boletín, para la portada.
 *
 * <p>Antes solo estaba en el pie y, con el desplazamiento infinito del catálogo, llegar hasta allí era
 * casi imposible. Reutiliza la misma llamada y los mismos textos que el pie.
 *
 * <p>Cuando el envío falla también se enseña el «hecho». No es descuido: la respuesta del backend es
 * NEUTRA a propósito —no dice si ese correo ya estaba— y distinguir aquí un fallo de red de una
 * dirección repetida daría justo la información que la neutralidad quiere ocultar.
 */
@Component({
  selector: 'nx-seccion-boletin',
  imports: [FaIconComponent],
  template: `
    <section class="card p-8 lg:p-10 text-center bg-base-200/60 border border-base-300">
      <div class="max-w-xl mx-auto">
        <div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <fa-icon [icon]="iconos.sobre" class="text-lg" />
        </div>
        <h2 class="text-xl md:text-2xl font-medium tracking-tight">{{ t('newsletter.footer.title') }}</h2>
        <p class="mt-2 opacity-70">{{ t('newsletter.footer.pitch') }}</p>

        @if (hecho()) {
          <p role="status" class="mt-4 flex items-center justify-center gap-2"
             [class.opacity-60]="yaEstaba()" [class.text-success]="!yaEstaba()">
            <fa-icon [icon]="iconos.hecho" />
            {{ t(yaEstaba() ? 'newsletter.footer.already' : 'newsletter.footer.done') }}
          </p>
        } @else {
          <form (submit)="envia($event)" class="mt-5 flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto">
            <label class="sr-only" for="boletin-email">{{ t('newsletter.footer.placeholder') }}</label>
            <input id="boletin-email" type="email" required autocomplete="email"
                   class="input input-bordered flex-1"
                   [placeholder]="t('newsletter.footer.placeholder')"
                   [value]="correo()" (input)="correo.set(valorDe($event))" />
            <button type="submit" class="btn btn-primary" [disabled]="enviando()">
              <fa-icon [icon]="iconos.enviar" /> {{ t('newsletter.footer.subscribe') }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
})
export class SeccionBoletin {
  private readonly boletin = inject(GestionaElBoletin);

  protected readonly t = inject(TraduccionService).t;
  protected readonly correo = signal('');
  protected readonly hecho = signal(false);
  protected readonly yaEstaba = signal(false);
  protected readonly enviando = signal(false);

  protected readonly iconos = {
    sobre: faEnvelopeOpenText,
    hecho: faCircleCheck,
    enviar: faPaperPlane,
  };

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    const correo = this.correo().trim();
    if (!correo || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    const resultado = await this.boletin.suscribe(correo);
    this.yaEstaba.set(resultado.ok && resultado.valor.yaEstaba);
    this.hecho.set(true);
    this.correo.set('');
    this.enviando.set(false);
  }
}
