import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faSpinner,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  ClaseDeRetorno,
  ConfirmaRecarga,
} from '../../application/use-case/confirma-recarga.use-case';

/** Las tres claves de texto que cambian según de qué pasarela se vuelva. */
export interface TextosDeRetorno {
  readonly confirmando: string;
  readonly noCerrar: string;
  readonly correcto: string;
  readonly redirigiendo: string;
  readonly fallo: string;
  readonly cancelado: string;
  readonly sinIdentificador: string;
  readonly verCartera: string;
}

/**
 * La vuelta de la pasarela: se confirma el cobro y se lleva a la cartera.
 *
 * <p>Esta pantalla ACREDITA el saldo. No se espera al aviso que la pasarela manda por su cuenta, porque
 * en local y en pruebas ese aviso no llega y el cliente se quedaba mirando una recarga que nunca subía.
 *
 * <p>Dos cerrojos, los dos por incidencias reales:
 * <ul>
 *   <li>La confirmación MUEVE dinero y se lanza UNA sola vez por visita, pase lo que pase con los
 *       repintados o con un cambio de idioma.
 *   <li>El salto a la cartera es diferido para dar tiempo a leer «recarga completada», y se cancela al
 *       salir: si no, a quien se iba antes se le arrastraba a la cartera desde otra página, un segundo
 *       después, sin nada que se lo explicase.
 * </ul>
 */
@Component({
  selector: 'nx-retorno-de-pago',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="max-w-md mx-auto card p-8 text-center">
      @switch (estado()) {
        @case ('confirmando') {
          <fa-icon [icon]="iconos.girando" animation="spin" class="text-3xl text-primary mb-3" />
          <h1>{{ t(textos().confirmando) }}</h1>
          <p class="text-sm text-ink-500 mt-2">{{ t(textos().noCerrar) }}</p>
        }
        @case ('hecho') {
          <fa-icon [icon]="iconos.ok" class="text-3xl text-emerald-500 mb-3" />
          <h1>{{ t(textos().correcto) }}</h1>
          <p class="text-sm text-ink-500 mt-2">{{ t(textos().redirigiendo) }}</p>
        }
        @default {
          <fa-icon [icon]="iconos.aviso" class="text-3xl text-amber-500 mb-3" />
          <h1>{{ t(textos().fallo) }}</h1>
          <p role="alert" class="text-sm text-ink-500 mt-2">{{ error() }}</p>
          <div class="mt-5 flex gap-2 justify-center">
            <a routerLink="/wallet/recharge" class="btn btn-primary text-sm">
              {{ t('common.retry') }}
            </a>
            <a routerLink="/wallet" class="btn btn-ghost text-sm">{{ t(textos().verCartera) }}</a>
          </div>
        }
      }
    </div>
  `,
})
export class RetornoDePago {
  /** El pago que hay que cerrar. Llega en la dirección con la que la pasarela devuelve al cliente. */
  readonly idDePago = input('');
  /** La pasarela avisa así de que el cliente se echó atrás sin pagar. */
  readonly cancelado = input(false);
  readonly clase = input.required<ClaseDeRetorno>();
  readonly textos = input.required<TextosDeRetorno>();
  /** Cuánto se espera antes de llevar a la cartera, lo justo para leer el mensaje. */
  readonly esperaMs = input(1200);

  private readonly confirmacion = inject(ConfirmaRecarga);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = {
    girando: faSpinner,
    ok: faCircleCheck,
    aviso: faTriangleExclamation,
  };

  protected readonly estado = signal<'confirmando' | 'hecho' | 'fallo'>('confirmando');
  protected readonly error = signal<string | null>(null);

  private temporizador: ReturnType<typeof setTimeout> | undefined;
  /** El pestillo: la confirmación mueve dinero y solo puede salir UNA vez por visita. */
  private lanzada = false;

  constructor() {
    this.destruccion.onDestroy(() => clearTimeout(this.temporizador));
    /*
     * Va en un efecto y no en el constructor porque aquí se leen ENTRADAS, y en el constructor todavía
     * no están puestas: leer una obligatoria antes de tiempo lanza, y las opcionales valdrían su valor
     * inicial. El efecto se ejecuta cuando ya han llegado, y el pestillo impide que un repintado o un
     * cambio de idioma disparen una segunda confirmación sobre el mismo pago.
     */
    effect(() => {
      const identificador = this.idDePago();
      const cancelado = this.cancelado();
      if (this.lanzada) {
        return;
      }
      this.lanzada = true;
      void this.confirma(identificador, cancelado);
    });
  }

  private async confirma(identificador: string, cancelado: boolean): Promise<void> {
    if (cancelado) {
      this.falla(this.t(this.textos().cancelado));
      return;
    }
    if (!identificador) {
      this.falla(this.t(this.textos().sinIdentificador));
      return;
    }

    const resultado = await this.confirmacion.ejecuta(identificador, this.clase());
    if (!resultado.ok) {
      this.falla(resultado.error.mensaje || this.t(this.textos().fallo));
      return;
    }
    this.estado.set('hecho');
    this.temporizador = setTimeout(() => {
      void this.router.navigate(['/wallet'], { queryParams: { recharged: 1 } });
    }, this.esperaMs());
  }

  private falla(mensaje: string): void {
    this.estado.set('fallo');
    this.error.set(mensaje);
  }
}
