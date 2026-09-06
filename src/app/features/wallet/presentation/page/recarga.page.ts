import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBitcoin, faPaypal } from '@fortawesome/free-brands-svg-icons';
import {
  IconDefinition,
  faChevronRight,
  faCreditCard,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  CADENAS_USDT,
  METODOS_OFRECIDOS,
  MetodoDeRecarga,
  OpcionesDeRecarga,
  Recarga,
  importeTecleado,
  importeValido,
} from '../../domain/model/recarga';
import { IniciaRecarga } from '../../application/use-case/inicia-recarga.use-case';
import { ConfirmaRecarga } from '../../application/use-case/confirma-recarga.use-case';
import { ResultadoDeRecarga } from '../component/resultado-de-recarga';

const ICONOS: Readonly<Record<MetodoDeRecarga, IconDefinition>> = {
  CARD: faCreditCard,
  PAYPAL: faPaypal,
  USDT: faBitcoin,
};

/**
 * Meter dinero en la cartera, en tres pasos: con qué, cuánto y a pagar.
 *
 * <p>El importe se teclea en la divisa ACTIVA de la web y todos los cálculos —dólar canónico y moneda de
 * cobro— los hace el backend. Aquí no se convierte nada.
 *
 * <p>Con tarjeta y PayPal reales el servidor devuelve la dirección de su cobro hospedado y el navegador
 * se va allí; al volver, la pantalla de retorno confirma el cobro y acredita el saldo. El tercer paso
 * solo se ve cuando no hay adónde saltar.
 */
@Component({
  selector: 'nx-recarga',
  imports: [FaIconComponent, ResultadoDeRecarga],
  template: `
    <div class="max-w-xl mx-auto space-y-6">
      <header>
        <h1>{{ t('recharge.title') }}</h1>
        <p class="text-sm text-ink-500 mt-1">{{ t('recharge.subtitle') }}</p>
      </header>

      <ol class="flex items-center gap-2 text-xs">
        @for (rotulo of rotulos(); track rotulo; let i = $index) {
          <li class="flex items-center gap-2">
            <span
              class="w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-medium"
              [class.bg-emerald-500]="paso() > i + 1"
              [class.text-white]="paso() >= i + 1"
              [class.bg-brand-600]="paso() === i + 1"
              [class.bg-ink-100]="paso() < i + 1"
              [class.text-ink-500]="paso() < i + 1"
            >
              {{ paso() > i + 1 ? '✓' : i + 1 }}
            </span>
            <span [class.text-ink-900]="paso() >= i + 1" [class.font-medium]="paso() >= i + 1"
                  [class.text-ink-500]="paso() < i + 1">
              {{ rotulo }}
            </span>
            @if (i < 2) {
              <fa-icon [icon]="iconos.siguiente" class="text-ink-300" />
            }
          </li>
        }
      </ol>

      @if (paso() === 1) {
        <form (submit)="alPaso($event, 2)" class="space-y-3">
          @for (opcion of metodos; track opcion) {
            <label
              class="card p-4 flex items-start gap-3 cursor-pointer transition-colors"
              [class.border-brand-500]="metodo() === opcion"
              [class.ring-2]="metodo() === opcion"
              [class.ring-brand-100]="metodo() === opcion"
              [for]="'metodo-' + opcion"
            >
              <input
                [id]="'metodo-' + opcion"
                type="radio"
                name="metodo"
                [value]="opcion"
                [checked]="metodo() === opcion"
                (change)="metodo.set(opcion)"
                class="mt-1"
              />
              <fa-icon [icon]="icono(opcion)" class="text-xl text-brand-600 mt-0.5" />
              <div class="flex-1">
                <div class="font-medium">{{ t('recharge.method.' + clave(opcion)) }}</div>
                <div class="text-xs text-ink-500">
                  {{ t('recharge.method.' + clave(opcion) + '_desc') }}
                </div>
              </div>
            </label>
          }
          <button type="submit" class="btn btn-primary w-full">{{ t('common.next') }}</button>
        </form>
      }

      @if (paso() === 2) {
        <form (submit)="empieza($event)" class="space-y-4">
          <div class="card p-5">
            <!--
              El atributo «for» atado al campo: sin él la etiqueta era texto suelto y un lector de pantalla anunciaba
              «campo de texto» a secas justo donde se teclea una cifra de dinero.
            -->
            <label for="recarga-importe" class="text-xs text-ink-500">{{ rotuloImporte() }}</label>
            <div class="mt-1 flex items-center gap-2">
              <span class="text-2xl font-medium text-ink-500">{{ simbolo() }}</span>
              <input
                id="recarga-importe"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0"
                [value]="importe()"
                (input)="escribeImporte($event)"
                class="input text-2xl flex-1 font-medium"
              />
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              @for (sugerido of opciones()?.sugeridos ?? []; track sugerido.importe) {
                <button
                  type="button"
                  (click)="importe.set(sugerido.importe.toString())"
                  class="px-3 py-1 rounded-full text-xs border"
                  [class.border-brand-500]="cifra() === sugerido.importe"
                  [class.bg-brand-50]="cifra() === sugerido.importe"
                  [class.text-brand-700]="cifra() === sugerido.importe"
                  [class.border-ink-200]="cifra() !== sugerido.importe"
                >
                  {{ sugerido.formateado }}
                </button>
              }
            </div>
          </div>

          @if (metodo() === 'USDT') {
            <div class="card p-5">
              <span class="text-xs text-ink-500">{{ t('recharge.chain.label') }}</span>
              <div class="mt-1 flex gap-2 flex-wrap">
                @for (opcion of cadenas; track opcion) {
                  <button
                    type="button"
                    (click)="cadena.set(opcion)"
                    class="px-3 py-1.5 rounded-full text-xs border"
                    [class.border-brand-500]="cadena() === opcion"
                    [class.bg-brand-50]="cadena() === opcion"
                    [class.text-brand-700]="cadena() === opcion"
                    [class.border-ink-200]="cadena() !== opcion"
                  >
                    {{ opcion }}
                  </button>
                }
              </div>
              <p class="text-xs text-ink-500 mt-2">
                <fa-icon [icon]="iconos.aviso" class="text-amber-500 mr-1" />
                {{ t('recharge.chain.warning') }}
              </p>
            </div>
          }

          @if (error(); as mensaje) {
            <p
              role="alert"
              class="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2"
            >
              <fa-icon [icon]="iconos.aviso" /> {{ mensaje }}
            </p>
          }

          <div class="flex gap-2">
            <button type="button" (click)="paso.set(1)" class="btn btn-outline">
              {{ t('common.back') }}
            </button>
            <button
              type="submit"
              [disabled]="enviando() || !importeCorrecto()"
              class="btn btn-primary flex-1"
            >
              {{ enviando() ? t('common.processing') : t('recharge.continue_with') + ' ' + metodo() }}
            </button>
          </div>
        </form>
      }

      @if (paso() === 3 && recarga(); as resultado) {
        <nx-resultado-de-recarga
          [recarga]="resultado"
          [confirmando]="confirmando()"
          (confirma)="daPorPagada()"
        />
        @if (error(); as mensaje) {
          <p
            role="alert"
            class="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2"
          >
            <fa-icon [icon]="iconos.aviso" /> {{ mensaje }}
          </p>
        }
      }
    </div>
  `,
})
export class RecargaPage {
  private readonly inicia = inject(IniciaRecarga);
  private readonly confirmacion = inject(ConfirmaRecarga);
  private readonly router = inject(Router);

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly iconos = { siguiente: faChevronRight, aviso: faTriangleExclamation };
  protected readonly metodos = METODOS_OFRECIDOS;
  protected readonly cadenas = CADENAS_USDT;

  protected readonly paso = signal<1 | 2 | 3>(1);
  protected readonly metodo = signal<MetodoDeRecarga>('CARD');
  protected readonly cadena = signal<string>(CADENAS_USDT[0]);
  protected readonly importe = signal('');
  protected readonly opciones = signal<OpcionesDeRecarga | null>(null);
  protected readonly recarga = signal<Recarga | null>(null);
  protected readonly enviando = signal(false);
  protected readonly confirmando = signal(false);

  /**
   * Motivo del último rechazo del servidor. Sin esto, un importe fuera de rango o una pasarela caída
   * dejaban la pantalla igual que antes de pulsar, y el cliente lo intentaba una y otra vez: el camino
   * corto a dos cobros por la misma recarga.
   */
  protected readonly error = signal<string | null>(null);

  protected readonly cifra = computed(() => importeTecleado(this.importe()));
  protected readonly importeCorrecto = computed(() => importeValido(this.importe()));
  protected readonly simbolo = computed(() => this.opciones()?.simbolo ?? this.opciones()?.divisa ?? '');
  protected readonly rotulos = computed(() => [
    this.t('recharge.step.method'),
    this.t('recharge.step.amount'),
    this.t('recharge.step.confirm'),
  ]);

  constructor() {
    void this.cargaOpciones();
  }

  /** El rótulo del campo nombra la divisa activa, no un dólar escrito a fuego. */
  protected rotuloImporte(): string {
    return this.t('recharge.amount.label').replace('USD', this.opciones()?.divisa ?? '');
  }

  protected icono(metodo: MetodoDeRecarga): IconDefinition {
    return ICONOS[metodo];
  }

  protected clave(metodo: MetodoDeRecarga): string {
    return metodo.toLowerCase();
  }

  protected escribeImporte(evento: Event): void {
    this.importe.set((evento.target as HTMLInputElement).value);
    this.error.set(null);
  }

  protected alPaso(evento: Event, paso: 1 | 2 | 3): void {
    evento.preventDefault();
    this.paso.set(paso);
  }

  private async cargaOpciones(): Promise<void> {
    const resultado = await this.inicia.opciones();
    if (resultado.ok) {
      this.opciones.set(resultado.valor);
    }
    // Sin importes sugeridos la recarga sigue funcionando: se teclea la cifra a mano.
  }

  protected async empieza(evento: Event): Promise<void> {
    evento.preventDefault();
    this.error.set(null);
    this.enviando.set(true);
    try {
      const resultado = await this.inicia.ejecuta(this.metodo(), this.importe(), this.cadena());
      if (!resultado.ok) {
        this.error.set(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      // Con pasarela real el cobro es hospedado: se sale del sitio y se vuelve por /wallet/recharge/return.
      const destino = resultado.valor.urlDeAprobacion;
      if (destino) {
        location.href = destino;
        return;
      }
      this.recarga.set(resultado.valor);
      this.paso.set(3);
    } finally {
      this.enviando.set(false);
    }
  }

  /**
   * Da el cobro por bueno en los entornos sin pasarela real.
   *
   * <p>El fallo se enseña SIEMPRE: quien acaba de pulsar cree que ha pagado, así que callarlo es dejarle
   * creer que tiene saldo.
   */
  protected async daPorPagada(): Promise<void> {
    const abierta = this.recarga();
    if (!abierta) {
      return;
    }
    this.confirmando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.confirmacion.simulada(abierta.idDePago);
      if (!resultado.ok) {
        this.error.set(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      await this.router.navigate(['/wallet'], { queryParams: { recharged: 1 } });
    } finally {
      this.confirmando.set(false);
    }
  }
}
