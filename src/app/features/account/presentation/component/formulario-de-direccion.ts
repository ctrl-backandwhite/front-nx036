import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  DIRECCION_VACIA,
  DatosDeDireccion,
  Direccion,
  aDatosDeDireccion,
  direccionCompleta,
} from '../../domain/model/direccion';
import { GuardaDireccion } from '../../application/use-case/direcciones.use-case';
import { CamposDeDireccion } from './campos-de-direccion';
import { VentanaModal } from './ventana-modal';

/**
 * La ventana para añadir o editar una dirección desde el perfil.
 *
 * <p>Con `direccion` entra en modo edición: mismo formulario, pero parte de lo guardado y termina en una
 * actualización en vez de un alta.
 */
@Component({
  selector: 'nx-formulario-de-direccion',
  imports: [FaIconComponent, CamposDeDireccion, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" (cierra)="cierra.emit()">
      <fa-icon icono [icon]="iconoTitulo" class="text-brand-600" />

      <form class="space-y-4" (submit)="envia($event)">
        <input
          class="input w-full"
          [attr.aria-label]="t('profile.label_placeholder')"
          [placeholder]="t('profile.label_placeholder')"
          [value]="datos().etiqueta"
          (input)="cambiaEtiqueta($event)"
        />

        <nx-campos-de-direccion [(datos)]="datos" />

        <label class="text-xs text-ink-600 flex items-center gap-2">
          <input type="checkbox" [checked]="datos().porDefecto" (change)="cambiaPorDefecto($event)" />
          {{ t('profile.set_default') }}
        </label>

        @if (error(); as mensaje) {
          <p role="alert" class="text-[12px] text-error">{{ mensaje }}</p>
        }

        <div class="flex gap-2">
          <button type="submit" class="btn btn-primary" [disabled]="!valido() || guardando()">
            {{ guardando() ? t('common.saving') : textoDeGuardar() }}
          </button>
          <button type="button" class="btn btn-ghost" (click)="cierra.emit()">
            {{ t('common.cancel') }}
          </button>
        </div>
      </form>
    </nx-ventana-modal>
  `,
})
export class FormularioDeDireccion {
  /** La dirección a editar. Sin ella, la ventana crea una nueva. */
  readonly direccion = input<Direccion | null>(null);
  /** La primera dirección de la cuenta se marca por defecto sola: no hay nada con qué competir. */
  readonly seraLaPrimera = input(false);
  readonly cierra = output<void>();
  readonly guardada = output<void>();

  private readonly traduccion = inject(TraduccionService);
  private readonly guarda = inject(GuardaDireccion);

  protected readonly t = this.traduccion.t;
  protected readonly iconoTitulo = faLocationDot;

  protected readonly datos = signal<DatosDeDireccion>(DIRECCION_VACIA);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // El perfil reutiliza UNA sola ventana para todas las tarjetas: al abrirla sobre otra dirección hay
    // que recargar el formulario o la segunda edición enseñaría los datos de la primera y se guardarían
    // sobre quien no toca.
    effect(() => {
      const direccion = this.direccion();
      this.datos.set(
        direccion
          ? aDatosDeDireccion(direccion)
          : { ...DIRECCION_VACIA, porDefecto: this.seraLaPrimera() },
      );
      this.error.set(null);
    });
  }

  protected titulo(): string {
    return this.direccion() ? this.t('addresses.edit_title') : this.t('profile.addresses.add');
  }

  protected textoDeGuardar(): string {
    return this.direccion() ? this.t('profile.update') : this.t('profile.save_address');
  }

  protected valido(): boolean {
    return direccionCompleta(this.datos());
  }

  protected cambiaEtiqueta(evento: Event): void {
    const etiqueta = (evento.target as HTMLInputElement).value;
    this.datos.update((actual) => ({ ...actual, etiqueta }));
  }

  protected cambiaPorDefecto(evento: Event): void {
    const porDefecto = (evento.target as HTMLInputElement).checked;
    this.datos.update((actual) => ({ ...actual, porDefecto }));
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.valido() || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.guarda.ejecuta(this.datos(), this.direccion()?.id);
      if (resultado.ok) {
        this.guardada.emit();
        this.cierra.emit();
        return;
      }
      // La ventana se deja ABIERTA con lo tecleado: cerrarla obligaría a escribir la dirección entera
      // otra vez solo por un código postal que no cuadraba.
      this.error.set(resultado.error.mensaje || this.t('common.error'));
    } finally {
      this.guardando.set(false);
    }
  }
}
