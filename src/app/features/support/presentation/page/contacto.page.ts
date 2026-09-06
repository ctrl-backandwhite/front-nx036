import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faEnvelope,
  faPaperPlane,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EscribeALaCasa } from '../../application/use-case/escribe-a-la-casa.use-case';
import { QUIEN_ESCRIBE_PORT } from '../../domain/port/quien-escribe.port';

/** Tope del mensaje. Coincide con el del backend: recortarlo aquí evita un rechazo tras escribir mil. */
const TOPE_DEL_MENSAJE = 2000;

/**
 * «Contáctanos»: el formulario público.
 *
 * <p>Al enviarlo, el backend crea un aviso en la bandeja del personal de la casa. No exige sesión y no
 * revela nada: contesta siempre lo mismo.
 *
 * <p>Cada campo lleva su `id` y su etiqueta asociada. Sin esa atadura, un lector de pantalla anuncia los
 * cuatro campos como «texto» sin decir cuál es cuál, y pulsar el rótulo no enfoca el campo. No quitar
 * los identificadores: hay una prueba que los comprueba.
 *
 * <p>MOBILE FIRST: una columna; nombre y correo se emparejan a partir de `sm`.
 */
@Component({
  selector: 'nx-contacto',
  imports: [FaIconComponent],
  template: `
    <div class="max-w-2xl mx-auto py-4 px-4">
      <header class="mb-6">
        <h1 class="text-3xl font-semibold">{{ t('contact.title') }}</h1>
        <p class="opacity-70 mt-2 leading-relaxed">{{ t('contact.subtitle') }}</p>
      </header>

      @if (estado() === 'hecho') {
        <div role="alert" class="alert alert-success mb-5 py-3 text-sm">
          <fa-icon [icon]="iconos.hecho" /> <span>{{ t('contact.ok') }}</span>
        </div>
      }
      @if (estado() === 'error') {
        <div role="alert" class="alert alert-error mb-5 py-3 text-sm">
          <fa-icon [icon]="iconos.aviso" /> <span>{{ t('contact.err') }}</span>
        </div>
      }

      <form (submit)="envia($event)" class="card p-6 space-y-4 border border-base-200">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="contacto-nombre" class="text-sm opacity-70 mb-1 block">{{ t('contact.name') }}</label>
            <!--
              Con la sesión iniciada el nombre viene puesto y NO se edita, igual que en las reseñas:
              quien escribe ya está identificado y dejar cambiarlo invita a firmar como otro.
            -->
            <input id="contacto-nombre" autocomplete="name" class="input input-bordered w-full"
                   [class.bg-base-200]="nombreFijado()"
                   [class.cursor-not-allowed]="nombreFijado()"
                   [readOnly]="nombreFijado()"
                   [title]="nombreFijado() ? t('reviews.name_locked') : ''"
                   [value]="nombre()" (input)="nombre.set(valorDe($event))" />
          </div>
          <div>
            <label for="contacto-email" class="text-sm opacity-70 mb-1 block">{{ t('contact.email') }}</label>
            <input id="contacto-email" type="email" required autocomplete="email"
                   class="input input-bordered w-full"
                   [value]="email()" (input)="email.set(valorDe($event))" />
          </div>
        </div>

        <div>
          <label for="contacto-asunto" class="text-sm opacity-70 mb-1 block">{{ t('contact.subject') }}</label>
          <input id="contacto-asunto" class="input input-bordered w-full"
                 [value]="asunto()" (input)="asunto.set(valorDe($event))" />
        </div>

        <div>
          <label for="contacto-mensaje" class="text-sm opacity-70 mb-1 block">{{ t('contact.message') }}</label>
          <!-- Área amplia: cómoda para unos mil caracteres sin desplazamiento interno. -->
          <textarea id="contacto-mensaje" required rows="12" [attr.maxlength]="tope"
                    class="textarea textarea-bordered w-full min-h-64 resize-y leading-relaxed"
                    [value]="mensaje()" (input)="mensaje.set(valorDe($event))"></textarea>
          <div class="mt-1 text-right text-xs opacity-50">{{ mensaje().length }} / {{ tope }}</div>
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <button type="submit" class="btn btn-primary"
                  [disabled]="estado() === 'enviando' || !email().trim() || !mensaje().trim()">
            <fa-icon [icon]="iconos.enviar" class="mr-1" />
            {{ t(estado() === 'enviando' ? 'contact.sending' : 'contact.send') }}
          </button>
          <span class="text-[12px] opacity-50 flex items-center gap-1">
            <fa-icon [icon]="iconos.sobre" /> {{ t('contact.info') }}
          </span>
        </div>
      </form>
    </div>
  `,
})
export class ContactoPage {
  private readonly escribe = inject(EscribeALaCasa);
  private readonly quienEscribe = inject(QUIEN_ESCRIBE_PORT);

  protected readonly t = inject(TraduccionService).t;
  protected readonly tope = TOPE_DEL_MENSAJE;

  protected readonly nombre = signal('');
  protected readonly email = signal('');
  protected readonly asunto = signal('');
  protected readonly mensaje = signal('');
  protected readonly estado = signal<'inicial' | 'enviando' | 'hecho' | 'error'>('inicial');

  /** Si el nombre lo puso la cuenta, no se toca. */
  private readonly nombreDeLaCuenta = signal('');
  protected readonly nombreFijado = computed(() => this.nombreDeLaCuenta().length > 0);

  protected readonly iconos = {
    enviar: faPaperPlane,
    hecho: faCircleCheck,
    aviso: faTriangleExclamation,
    sobre: faEnvelope,
  };

  constructor() {
    void this.rellenaConLaCuenta();
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.email().trim() || !this.mensaje().trim()) {
      return;
    }
    this.estado.set('enviando');
    const resultado = await this.escribe.ejecuta({
      nombre: this.nombreDeLaCuenta() || this.nombre(),
      email: this.email(),
      asunto: this.asunto(),
      mensaje: this.mensaje(),
    });
    if (!resultado.ok) {
      this.estado.set('error');
      return;
    }
    this.estado.set('hecho');
    // Se limpia lo escrito, no quién escribe: mandar un segundo mensaje no debería obligar a volver a
    // teclear el correo.
    this.asunto.set('');
    this.mensaje.set('');
  }

  private async rellenaConLaCuenta(): Promise<void> {
    const resultado = await this.quienEscribe.consulta();
    if (!resultado.ok || !resultado.valor) {
      // Sin sesión el formulario funciona igual: es público. Solo llega vacío.
      return;
    }
    this.nombreDeLaCuenta.set(resultado.valor.nombre);
    this.nombre.set(resultado.valor.nombre);
    this.email.set(resultado.valor.email);
  }
}
