import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, email as validaCorreo, form, required } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El alta en el boletín: campo, botón, aviso y confirmación.
 *
 * <p>DECISIÓN: vive en el sistema de diseño, no en `catalog/presentation`. El motivo no es que sea
 * bonito reutilizar, es que este trozo ya existía en el pie del sitio y la portada pedía EXACTAMENTE el
 * mismo comportamiento: recortar el correo, validarlo con Signal Forms, callar el aviso hasta que se ha
 * tocado el campo, y sustituir el formulario por la confirmación —distinta si ya estaba apuntado—. Eso
 * son cuarenta líneas de reglas que, copiadas, se corrigen una vez y se quedan mal en la otra. Aquí no
 * hay negocio ninguno: no sabe a qué backend va el correo ni qué pasa después; lo emite y ya está.
 *
 * <p>Lo que NO entra aquí es el marco: el pie lo envuelve en una columna con su titulillo y la portada
 * en una tarjeta con icono y titular. Meter las dos decoraciones dentro con un interruptor habría
 * convertido una pieza en dos disfrazadas de una.
 */
@Component({
  selector: 'nx-alta-boletin',
  imports: [FaIconComponent, FormField],
  template: `
    @if (enviado()) {
      <p
        [class]="compacto() ? 'text-[13px] flex items-center gap-1' : 'mt-4 flex items-center justify-center gap-2'"
        [class.opacity-70]="yaSuscrito()"
        [class.text-success]="!yaSuscrito()"
      >
        <fa-icon [icon]="iconoHecho" />
        {{ yaSuscrito() ? t('newsletter.footer.already') : t('newsletter.footer.done') }}
      </p>
    } @else {
      <!-- «novalidate»: la validación la lleva Signal Forms, que es la norma del proyecto. Sin él, el
           navegador se adelanta con su propio globo —en su idioma, no en el de quien mira— y el
           formulario ni siquiera llega a enviarse, así que el mensaje traducido no aparecería nunca. -->
      <form novalidate (submit)="envia($event)">
        <!-- El grupo envuelve solo al par campo-botón: el aviso va fuera, o al aparecer partiría el
             grupo y el campo dejaría de encajar con el botón. -->
        <div [class]="compacto() ? 'join' : 'flex flex-col sm:flex-row gap-2 justify-center'">
          <input
            type="email"
            [formField]="formulario.correo"
            [placeholder]="t('newsletter.footer.placeholder')"
            [attr.aria-label]="t('newsletter.footer.subscribe')"
            [class]="
              compacto()
                ? 'input input-bordered input-sm join-item text-[13px]'
                : 'input input-bordered flex-1'
            "
          />
          <button
            type="submit"
            [class]="compacto() ? 'btn btn-primary btn-sm join-item' : 'btn btn-primary'"
            [attr.aria-label]="t('newsletter.footer.subscribe')"
          >
            <fa-icon [icon]="iconoEnviar" />
            @if (!compacto()) {
              {{ t('newsletter.footer.subscribe') }}
            }
          </button>
        </div>
        @if (falloDelCorreo(); as fallo) {
          <span role="alert" class="text-[12px] text-error mt-1 block">{{ fallo }}</span>
        }
      </form>
    }
  `,
})
export class AltaBoletin {
  /** Cierto cuando el alta ya se ha mandado: entonces se enseña la confirmación en vez del formulario. */
  readonly enviado = input(false);
  /** Cierto si el correo ya estaba dado de alta. Cambia el texto, no el resultado. */
  readonly yaSuscrito = input(false);
  /**
   * La variante estrecha del pie: campo pequeño pegado a un botón de solo icono.
   *
   * <p>Se pide por densidad y no por «dónde estoy» a propósito: el día que otro sitio necesite el
   * formulario apretado no habrá que añadirle un valor nuevo a un enumerado de ubicaciones.
   */
  readonly compacto = input(false);

  /** El correo, ya recortado y validado. Mandarlo al backend es de quien monta la pieza, no de la pieza. */
  readonly suscribe = output<string>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoEnviar = faPaperPlane;
  protected readonly iconoHecho = faCircleCheck;

  protected readonly modelo = signal({ correo: '' });

  /**
   * El alta, con Signal Forms.
   *
   * <p>Antes el campo estaba cableado a mano —`[value]` más `(input)`— y la única exigencia era el
   * `required` del navegador: quien escribía «pepe» veía cómo se mandaba y el rechazo llegaba después,
   * desde el servidor. Ahora las dos reglas se declaran en un sitio y cada una dice lo suyo debajo del
   * campo.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.correo, { message: () => this.t('dialog.field.required') });
    validaCorreo(ruta.correo, { message: () => this.t('dialog.field.email') });
  });

  /**
   * El aviso bajo el campo, o nulo. Se calla hasta que se ha TOCADO: un formulario recién pintado no
   * tiene por qué salir en rojo pidiendo un correo que nadie ha empezado a escribir.
   */
  protected readonly falloDelCorreo = computed(() => {
    const estado = this.formulario.correo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  });

  protected envia(evento: Event): void {
    evento.preventDefault();
    // Se recorta ANTES de validar: pegar un correo con espacios alrededor es lo más normal del mundo y
    // no es un error que haya que explicar.
    const limpio = this.modelo().correo.trim();
    if (limpio !== this.modelo().correo) {
      this.modelo.set({ correo: limpio });
    }
    if (this.formulario().invalid()) {
      // El botón NO se apaga: apagarlo sin decir por qué es justo lo que se quiere evitar. Se marca el
      // campo como tocado para que el aviso salga, y ahí se ve qué falta.
      this.formulario.correo().markAsTouched();
      return;
    }
    this.suscribe.emit(limpio);
    this.modelo.set({ correo: '' });
    // Y se olvida el «tocado»: si no, el campo recién vaciado se queda en rojo pidiendo un correo
    // obligatorio JUSTO DESPUÉS de haberlo mandado bien.
    this.formulario().reset();
  }
}
