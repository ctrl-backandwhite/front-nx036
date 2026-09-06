import { Component, computed, inject, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  email as validaCorreo,
  form,
  maxLength,
  readonly as soloLectura,
  required,
  validate,
} from '@angular/forms/signals';
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
 * <p>Es el formulario que más se nota de los dos contextos, porque lo rellena gente de fuera y sin
 * sesión. Antes, quien se dejaba el correo o el mensaje veía el botón apagado y ninguna explicación; y
 * un correo mal escrito se descubría al recibir el rechazo del servidor. Ahora la exigencia está
 * declarada en un solo sitio —el esquema— y cada campo dice lo suyo debajo, en cuanto se ha tocado.
 *
 * <p>Cada campo lleva su `id` y su etiqueta asociada. Sin esa atadura, un lector de pantalla anuncia los
 * cuatro campos como «texto» sin decir cuál es cuál, y pulsar el rótulo no enfoca el campo. No quitar
 * los identificadores: hay una prueba que los comprueba.
 *
 * <p>MOBILE FIRST: una columna; nombre y correo se emparejan a partir de `sm`.
 */
@Component({
  selector: 'nx-contacto',
  imports: [FaIconComponent, FormField],
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
              quien escribe ya está identificado y dejar cambiarlo invita a firmar como otro. El
              «solo lectura» lo declara el esquema, que es quien devuelve el atributo al campo.
            -->
            <input id="contacto-nombre" autocomplete="name" class="input input-bordered w-full"
                   [class.bg-base-200]="nombreFijado()"
                   [class.cursor-not-allowed]="nombreFijado()"
                   [title]="nombreFijado() ? t('reviews.name_locked') : ''"
                   [formField]="formulario.nombre" />
          </div>
          <div>
            <label for="contacto-email" class="text-sm opacity-70 mb-1 block">{{ t('contact.email') }}</label>
            <input id="contacto-email" type="email" autocomplete="email"
                   class="input input-bordered w-full"
                   [formField]="formulario.email" />
            @if (falloDe(formulario.email); as fallo) {
              <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
            }
          </div>
        </div>

        <div>
          <label for="contacto-asunto" class="text-sm opacity-70 mb-1 block">{{ t('contact.subject') }}</label>
          <input id="contacto-asunto" class="input input-bordered w-full"
                 [formField]="formulario.asunto" />
        </div>

        <div>
          <label for="contacto-mensaje" class="text-sm opacity-70 mb-1 block">{{ t('contact.message') }}</label>
          <!-- Área amplia: cómoda para unos mil caracteres sin desplazamiento interno. -->
          <textarea id="contacto-mensaje" rows="12"
                    class="textarea textarea-bordered w-full min-h-64 resize-y leading-relaxed"
                    [formField]="formulario.mensaje"></textarea>
          @if (falloDe(formulario.mensaje); as fallo) {
            <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
          }
          <div class="mt-1 text-right text-xs opacity-50">{{ mensaje().length }} / {{ tope }}</div>
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <button type="submit" class="btn btn-primary" [disabled]="!sePuedeEnviar()">
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

  protected readonly modelo = signal({ nombre: '', email: '', asunto: '', mensaje: '' });
  protected readonly estado = signal<'inicial' | 'enviando' | 'hecho' | 'error'>('inicial');

  /** Si el nombre lo puso la cuenta, no se toca. */
  private readonly nombreDeLaCuenta = signal('');
  protected readonly nombreFijado = computed(() => this.nombreDeLaCuenta().length > 0);

  /**
   * Lo que hay que rellenar para que el mensaje salga. El asunto sigue siendo opcional: quien escribe
   * describiendo un problema no siempre sabe titularlo, y exigirlo solo consigue asuntos vacíos de
   * contenido como «duda».
   *
   * <p>El formato del correo se comprueba pero NO se explica: no existe en los ocho idiomas ninguna
   * cadena que diga «el correo no tiene buena pinta», y escribir una a medias sería peor que callarse.
   * El campo es `type="email"`, así que el navegador ya lo señala por su cuenta. Queda anotado.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    soloLectura(ruta.nombre, () => this.nombreFijado());
    required(ruta.email, { message: () => this.t('dialog.field.required') });
    validaCorreo(ruta.email);
    required(ruta.mensaje, { message: () => this.t('dialog.field.required') });
    // Un mensaje de solo espacios está tan vacío como uno sin nada, y `required` no lo ve.
    validate(ruta.mensaje, ({ value }) =>
      value().trim() === '' ? { kind: 'en-blanco', message: this.t('dialog.field.required') } : null,
    );
    // El tope lo pone el backend. La regla además devuelve el `maxlength` al campo, así que el
    // navegador sigue impidiendo teclear por encima igual que antes.
    maxLength(ruta.mensaje, TOPE_DEL_MENSAJE);
  });

  /** Lo escrito hasta ahora, para el contador de caracteres. */
  protected readonly mensaje = computed(() => this.modelo().mensaje);

  /** Un único sitio al que preguntar si el mensaje se puede mandar. */
  protected readonly sePuedeEnviar = computed(
    () => this.estado() !== 'enviando' && !this.formulario().invalid(),
  );

  protected readonly iconos = {
    enviar: faPaperPlane,
    hecho: faCircleCheck,
    aviso: faTriangleExclamation,
    sobre: faEnvelope,
  };

  constructor() {
    void this.rellenaConLaCuenta();
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    this.estado.set('enviando');
    const escrito = this.modelo();
    const resultado = await this.escribe.ejecuta({
      nombre: this.nombreDeLaCuenta() || escrito.nombre,
      email: escrito.email,
      asunto: escrito.asunto,
      mensaje: escrito.mensaje,
    });
    if (!resultado.ok) {
      this.estado.set('error');
      return;
    }
    this.estado.set('hecho');
    // Se limpia lo escrito, no quién escribe: mandar un segundo mensaje no debería obligar a volver a
    // teclear el correo.
    this.modelo.update((actual) => ({ ...actual, asunto: '', mensaje: '' }));
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo. Se calla hasta que el campo se ha TOCADO:
   * pintar de rojo un formulario recién abierto acusa a quien todavía no ha escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  private async rellenaConLaCuenta(): Promise<void> {
    const resultado = await this.quienEscribe.consulta();
    if (!resultado.ok || !resultado.valor) {
      // Sin sesión el formulario funciona igual: es público. Solo llega vacío.
      return;
    }
    const { nombre, email } = resultado.valor;
    this.nombreDeLaCuenta.set(nombre);
    this.modelo.update((actual) => ({ ...actual, nombre, email }));
  }
}
