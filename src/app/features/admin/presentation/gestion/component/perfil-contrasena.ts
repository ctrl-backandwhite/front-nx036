import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faKey } from '@fortawesome/free-solid-svg-icons';
import { FormField, form, minLength, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { LARGO_MINIMO_DE_CONTRASENA } from '../../../domain/gestion/model/perfil';
import { CambiaLaContrasena } from '../../../application/gestion/use-case/perfil.use-case';

/** Identificadores únicos por montaje: dos campos con el mismo `id` rompen su etiqueta. */
let contador = 0;

/**
 * El cambio de contraseña de la propia cuenta.
 *
 * <p>Cada casilla lleva su `<label for>` con su `id`. No es cosmético: son TRES contraseñas seguidas y,
 * sin etiqueta asociada, un lector de pantalla anuncia «campo de contraseña» sin decir cuál y pulsar el
 * texto no enfoca nada. Equivocarse de casilla aquí es un problema de seguridad, no de estética.
 *
 * <p>Que las dos nuevas coincidan lo comprueba el caso de uso —es una regla, no una ayuda al teclear—,
 * pero el aviso se da aquí antes de salir a la red: el backend solo recibe una y no podría distinguirlo.
 *
 * <p>Lo obligatorio y el largo mínimo se declaran en el ESQUEMA del formulario, no como atributos del
 * campo: la directiva `formField` los proyecta ella misma al elemento y prohíbe escribirlos a mano, que
 * es lo que evita que la pantalla y la regla acaben diciendo cosas distintas.
 */
@Component({
  selector: 'nx-perfil-contrasena',
  imports: [FaIconComponent, FormField],
  template: `
    <div class="card p-6">
      <h2 class="font-medium mb-3"><fa-icon [icon]="iconos.llave" /> {{ t('admin.profile.pw.title') }}</h2>

      @if (error(); as mensaje) {
        <div role="alert"
             class="mb-3 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {{ mensaje }}
        </div>
      }
      @if (hecho()) {
        <div role="alert"
             class="mb-3 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm border border-emerald-200">
          <fa-icon [icon]="iconos.hecho" /> {{ t('admin.profile.pw.updated') }}
        </div>
      }

      <form class="space-y-3 text-sm" (submit)="envia($event)">
        <div>
          <label [attr.for]="idActual"
                 class="text-xs text-ink-500 mb-1 block">{{ t('admin.profile.pw.current') }}</label>
          <input [id]="idActual" type="password" autocomplete="current-password" class="input"
                 [formField]="formulario.actual" />
        </div>
        <div>
          <label [attr.for]="idNueva"
                 class="text-xs text-ink-500 mb-1 block">{{ t('admin.profile.pw.new') }}</label>
          <input [id]="idNueva" type="password" autocomplete="new-password" class="input"
                 [formField]="formulario.nueva" />
        </div>
        <div>
          <label [attr.for]="idRepetida"
                 class="text-xs text-ink-500 mb-1 block">{{ t('admin.profile.pw.repeat') }}</label>
          <input [id]="idRepetida" type="password" autocomplete="new-password" class="input"
                 [formField]="formulario.repetida" />
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="enviando()">
          {{ enviando() ? t('admin.profile.pw.updating') : t('admin.profile.pw.submit') }}
        </button>
      </form>
    </div>
  `,
})
export class PerfilContrasena {
  private readonly cambia = inject(CambiaLaContrasena);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { llave: faKey, hecho: faCircleCheck };

  protected readonly idActual = `nx-perfil-clave-actual-${++contador}`;
  protected readonly idNueva = `nx-perfil-clave-nueva-${contador}`;
  protected readonly idRepetida = `nx-perfil-clave-repetida-${contador}`;

  protected readonly modelo = signal({ actual: '', nueva: '', repetida: '' });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.actual);
    required(ruta.nueva);
    minLength(ruta.nueva, LARGO_MINIMO_DE_CONTRASENA);
    required(ruta.repetida);
    minLength(ruta.repetida, LARGO_MINIMO_DE_CONTRASENA);
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hecho = signal(false);

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    this.error.set(null);
    this.hecho.set(false);

    const datos = this.modelo();
    if (datos.nueva !== datos.repetida) {
      this.error.set(this.t('admin.profile.pw.mismatch'));
      return;
    }
    if (this.formulario().invalid()) {
      return;
    }

    this.enviando.set(true);
    try {
      const resultado = await this.cambia.ejecuta(datos.actual, datos.nueva, datos.repetida);
      if (!resultado.ok) {
        // El motivo lo escribe el backend, ya traducido; sin él, el texto propio de esta pantalla.
        this.error.set(resultado.error.mensaje || this.t('admin.profile.pw.failed'));
        return;
      }
      this.hecho.set(true);
      // Las contraseñas no se quedan escritas tras el envío: la pantalla puede seguir abierta mucho rato.
      this.modelo.set({ actual: '', nueva: '', repetida: '' });
    } finally {
      this.enviando.set(false);
    }
  }
}
