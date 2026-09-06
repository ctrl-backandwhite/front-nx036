import { Component, computed, inject, signal } from '@angular/core';
import {
  FormField,
  email as validaCorreo,
  form,
  required,
} from '@angular/forms/signals';
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
  imports: [FaIconComponent, FormField],
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
          <!-- «novalidate»: la validación la lleva Signal Forms, que es la norma del proyecto. Sin él,
               el navegador se adelanta con su propio globo —en su idioma, no en el de quien mira— y el
               formulario ni siquiera llega a enviarse, así que el mensaje traducido no aparecería nunca. -->
          <form novalidate (submit)="envia($event)" class="mt-5 max-w-md mx-auto">
            <div class="flex flex-col sm:flex-row gap-2 justify-center">
              <label class="sr-only" for="boletin-email">
                {{ t('newsletter.footer.placeholder') }}
              </label>
              <input id="boletin-email" type="email" autocomplete="email"
                     class="input input-bordered flex-1"
                     [placeholder]="t('newsletter.footer.placeholder')"
                     [formField]="formulario.correo" />
              <button type="submit" class="btn btn-primary" [disabled]="enviando()">
                <fa-icon [icon]="iconos.enviar" /> {{ t('newsletter.footer.subscribe') }}
              </button>
            </div>
            @if (falloDelCorreo(); as fallo) {
              <span role="alert" class="text-[12px] text-error mt-1 block text-left">{{ fallo }}</span>
            }
          </form>
        }
      </div>
    </section>
  `,
})
export class SeccionBoletin {
  private readonly boletin = inject(GestionaElBoletin);

  protected readonly t = inject(TraduccionService).t;

  protected readonly modelo = signal({ correo: '' });

  /**
   * El alta al boletín, con Signal Forms.
   *
   * <p>Antes el campo estaba cableado a mano —`[value]` más `(input)`— y la única exigencia era el
   * `required` del navegador: quien escribía «pepe» veía cómo se mandaba y no se enteraba de nada.
   * Ahora las dos reglas se declaran en un sitio y cada una dice lo suyo debajo del campo.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.correo, { message: () => this.t('dialog.field.required') });
    validaCorreo(ruta.correo, { message: () => this.t('dialog.field.email') });
  });

  /**
   * El aviso bajo el campo, o nulo. Se calla hasta que se ha TOCADO: una portada recién abierta no
   * tiene por qué salir en rojo pidiendo un correo que nadie ha empezado a escribir.
   */
  protected readonly falloDelCorreo = computed(() => {
    const estado = this.formulario.correo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  });

  protected readonly hecho = signal(false);
  protected readonly yaEstaba = signal(false);
  protected readonly enviando = signal(false);

  protected readonly iconos = {
    sobre: faEnvelopeOpenText,
    hecho: faCircleCheck,
    enviar: faPaperPlane,
  };

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.enviando()) {
      return;
    }
    // Se recorta ANTES de validar: pegar un correo con espacios alrededor es lo más normal del mundo y
    // no es un error que haya que explicar.
    const correo = this.modelo().correo.trim();
    if (correo !== this.modelo().correo) {
      this.modelo.set({ correo });
    }
    if (this.formulario().invalid()) {
      // El botón NO se apaga por esto: apagarlo sin decir por qué es justo lo que se quiere evitar. Se
      // marca el campo como tocado para que el aviso salga, y ahí se ve qué falta.
      this.formulario.correo().markAsTouched();
      return;
    }
    this.enviando.set(true);
    const resultado = await this.boletin.suscribe(correo);
    this.yaEstaba.set(resultado.ok && resultado.valor.yaEstaba);
    this.hecho.set(true);
    this.modelo.set({ correo: '' });
    this.enviando.set(false);
  }
}
