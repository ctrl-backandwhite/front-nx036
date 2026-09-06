import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCheck,
  faChevronLeft,
  faLocationDot,
  faPlus,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  DIRECCION_VACIA,
  DatosDeDireccion,
  Direccion,
  aDatosDeDireccion,
  direccionCompleta,
} from '../../domain/model/direccion';
import { DireccionesStore } from '../../application/state/direcciones.store';
import {
  CargaDirecciones,
  EliminaDireccion,
  GuardaDireccion,
} from '../../application/use-case/direcciones.use-case';
import { CamposDeDireccion } from '../component/campos-de-direccion';
import { TarjetaDeDireccion } from '../component/tarjeta-de-direccion';

/**
 * La página dedicada a las direcciones de envío.
 *
 * <p>Se llega desde el perfil y también desde el pago, cuando alguien quiere comprar y todavía no tiene
 * ninguna guardada. Aquí el formulario va EN LÍNEA y no en ventana emergente: es la pantalla entera para
 * eso, y una ventana encima de una página vacía sobra.
 *
 * <p>La etiqueta y la casilla de «por defecto» las lleva Signal Forms sobre la MISMA señal que los
 * campos de la dirección, así que no hay copia que sincronizar. Los campos de la dirección los valida
 * `nx-campos-de-direccion`; que la dirección esté completa lo sigue decidiendo el DOMINIO
 * —`direccionCompleta()`—, que es quien manda y quien usan por igual esta página y la ventana del perfil.
 *
 * <p>Mobile first: una columna de tarjetas, dos desde `sm`; la cabecera se apila y pasa a fila desde `sm`.
 */
@Component({
  selector: 'nx-direcciones',
  imports: [RouterLink, FaIconComponent, CamposDeDireccion, TarjetaDeDireccion, FormField],
  template: `
    <div class="max-w-4xl mx-auto space-y-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <a routerLink="/profile" class="text-xs text-ink-500 hover:underline inline-flex items-center gap-1">
            <fa-icon [icon]="iconos.atras" /> {{ t('addresses.back_to_profile') }}
          </a>
          <h1 class="mt-1 flex items-center gap-2">
            <fa-icon [icon]="iconos.direccion" class="text-brand-600" /> {{ t('addresses.title') }}
          </h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('addresses.subtitle') }}</p>
        </div>
        @if (!formularioAbierto()) {
          <button type="button" class="btn btn-primary shrink-0" (click)="abreAlta()">
            <fa-icon [icon]="iconos.anadir" /> {{ t('addresses.add_new') }}
          </button>
        }
      </header>

      @if (guardado()) {
        <div role="status" class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 flex items-center gap-2">
          <fa-icon [icon]="iconos.bien" /> {{ t('profile.saved') }}
        </div>
      }

      @if (error(); as mensaje) {
        <p role="alert" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
          <fa-icon [icon]="iconos.aviso" /> {{ mensaje }}
        </p>
      }

      @if (almacen.cargando()) {
        <p class="text-sm text-ink-500">{{ t('common.loading') }}…</p>
      }

      @if (almacen.vacio() && !formularioAbierto()) {
        <div class="card p-8 text-center">
          <fa-icon [icon]="iconos.direccion" class="text-3xl text-ink-300" />
          <h3 class="mt-3">{{ t('addresses.empty_title') }}</h3>
          <p class="text-sm text-ink-500 mt-1">{{ t('addresses.empty_desc') }}</p>
          <button type="button" class="btn btn-primary mt-4 inline-flex" (click)="abreAlta()">
            <fa-icon [icon]="iconos.anadir" /> {{ t('addresses.add_first') }}
          </button>
        </div>
      }

      @if (almacen.direcciones().length > 0 && !formularioAbierto()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (direccion of almacen.direcciones(); track direccion.id) {
            <nx-tarjeta-de-direccion
              [direccion]="direccion"
              (edita)="abreEdicion($event)"
              (borra)="borra($event)"
            />
          }
        </div>
      }

      @if (formularioAbierto()) {
        <form class="card p-5 space-y-4" (submit)="envia($event)">
          <h3>{{ enEdicion() ? t('addresses.edit_title') : t('addresses.new_title') }}</h3>

          <!--
            El campo solo llevaba texto de ejemplo, que desaparece al escribir: para quien navega con
            lector de pantalla era un «campo de texto» indistinguible del resto.
          -->
          <input class="input w-full"
                 [attr.aria-label]="t('profile.label_placeholder')"
                 [placeholder]="t('profile.label_placeholder')"
                 [formField]="formulario.etiqueta" />

          <nx-campos-de-direccion [(datos)]="datos" />

          <label class="text-xs text-ink-600 flex items-center gap-2">
            <input type="checkbox" [formField]="formulario.porDefecto" />
            {{ t('profile.set_default') }}
          </label>

          <div class="flex gap-2">
            <button type="submit" class="btn btn-primary" [disabled]="!valido() || guardando()">
              {{ guardando() ? t('common.saving') : (enEdicion() ? t('profile.update') : t('profile.save_address')) }}
            </button>
            <button type="button" class="btn btn-ghost" (click)="cierra()">{{ t('common.cancel') }}</button>
          </div>
        </form>
      }
    </div>
  `,
})
export class DireccionesPage {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly carga = inject(CargaDirecciones);
  private readonly guarda = inject(GuardaDireccion);
  private readonly elimina = inject(EliminaDireccion);

  protected readonly almacen = inject(DireccionesStore);
  protected readonly t = this.traduccion.t;
  protected readonly iconos = {
    direccion: faLocationDot,
    anadir: faPlus,
    atras: faChevronLeft,
    bien: faCheck,
    aviso: faTriangleExclamation,
  };

  protected readonly datos = signal<DatosDeDireccion>(DIRECCION_VACIA);

  /**
   * La etiqueta y la casilla de «por defecto», atadas al formulario.
   *
   * <p>No llevan reglas y es deliberado: la etiqueta es OPCIONAL —«Casa», «Oficina» o nada— y acusarla
   * de obligatoria sería mentir; la casilla siempre tiene un valor. Lo que se gana es que el valor lo
   * lleve la directiva y no un manejador de eventos por campo.
   */
  protected readonly formulario = form(this.datos);

  protected readonly enEdicion = signal<Direccion | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly guardado = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly valido = computed(() => direccionCompleta(this.datos()));

  constructor() {
    void this.carga.ejecuta();
  }

  protected abreAlta(): void {
    this.enEdicion.set(null);
    this.datos.set({ ...DIRECCION_VACIA, porDefecto: this.almacen.seraLaPrimera() });
    // Con los datos se reinicia el «tocado»: un formulario recién abierto no puede heredar los avisos
    // en rojo de la dirección que se estuviera editando antes.
    this.formulario().reset();
    this.error.set(null);
    this.formularioAbierto.set(true);
  }

  protected abreEdicion(direccion: Direccion): void {
    this.enEdicion.set(direccion);
    this.datos.set(aDatosDeDireccion(direccion));
    this.formulario().reset();
    this.error.set(null);
    this.formularioAbierto.set(true);
  }

  protected cierra(): void {
    this.formularioAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.valido() || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.guarda.ejecuta(this.datos(), this.enEdicion()?.id);
      if (resultado.ok) {
        this.cierra();
        this.avisaDeGuardado();
        return;
      }
      // El formulario se deja ABIERTO con lo tecleado: cerrarlo obligaría a escribir la dirección
      // entera otra vez solo por un código postal que no cuadraba. Una dirección alimenta el cálculo de
      // envío y de aduanas, así que el servidor la rechaza en cuanto algo no le cuadra.
      this.error.set(resultado.error.mensaje || this.t('common.error'));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async borra(id: string): Promise<void> {
    const resultado = await this.elimina.ejecuta(id);
    if (resultado.ok) {
      this.error.set(null);
      return;
    }
    // Sin este aviso la tarjeta seguía ahí y parecía que el toque no se había registrado.
    await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
  }

  /** El «guardado» se retira solo a los 2,5 s: es una confirmación, no un rótulo permanente. */
  private avisaDeGuardado(): void {
    this.guardado.set(true);
    setTimeout(() => this.guardado.set(false), 2500);
  }
}
