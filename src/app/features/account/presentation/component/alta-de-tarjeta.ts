import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { titularDeTarjetaValido } from '../../domain/model/cobro';
import { CampoDeTarjeta, PASARELA_DE_TARJETA_PORT } from '../../domain/port/cobros.port';
import { AnadeTarjeta, FALTA_EL_TITULAR } from '../../application/use-case/cobros.use-case';

/** Contador para que dos formularios en la misma página no compartan identificador de campo. */
let siguienteId = 0;

/**
 * Alta de una tarjeta.
 *
 * <p>Esta pantalla NO sabe qué pasarela hay detrás: pide un hueco, recibe un manejador y con él confirma.
 * El número de la tarjeta nunca pasa por aquí —vive dentro del campo que monta el adaptador— y por eso
 * el navegador puede mandarlo directo a la pasarela sin que nuestro servidor lo vea.
 *
 * <p>En el original, la restricción «este formulario solo funciona dentro del envoltorio de la pasarela»
 * vivía en un comentario. Aquí la sostiene el tipo: sin manejador no hay forma de confirmar nada.
 */
@Component({
  selector: 'nx-alta-de-tarjeta',
  imports: [FaIconComponent],
  template: `
    <div [class]="conCabecera() ? 'mt-4 pt-4 border-t border-ink-100' : ''">
      @if (conCabecera()) {
        <div class="text-sm font-semibold text-ink-700 mb-1">{{ t('profile.billing.add_card') }}</div>
      }

      <label [attr.for]="idTitular" class="text-[12px] text-ink-500 block mt-1">
        {{ t('profile.billing.card_name') }} <span class="text-error">*</span>
      </label>
      <input
        [id]="idTitular"
        type="text"
        autocomplete="cc-name"
        [value]="titular()"
        (input)="escribeTitular($event)"
        (blur)="tocado.set(true)"
        [placeholder]="t('profile.billing.card_name')"
        [attr.aria-required]="true"
        [attr.aria-invalid]="faltaElTitular()"
        [attr.aria-describedby]="faltaElTitular() ? idError : null"
        [class]="'input input-bordered input-sm w-full mt-1 mb-1' + (faltaElTitular() ? ' input-error' : '')"
      />
      @if (faltaElTitular()) {
        <p [id]="idError" role="alert" class="text-error text-[12px] mb-2">
          {{ t('profile.billing.card_name_required') }}
        </p>
      }

      <!-- El hueco donde la pasarela pinta su campo seguro. Aquí no se escribe nada de su marca. -->
      <div #hueco class="border border-ink-200 rounded p-3 bg-white mt-1"></div>

      @if (error(); as mensaje) {
        <p role="alert" class="text-error text-[12px] mt-1">{{ mensaje }}</p>
      }

      <div class="flex justify-end mt-2">
        <button
          type="button"
          class="btn btn-primary btn-sm text-[12px]"
          [disabled]="!listo() || guardando() || !hayTitular()"
          (click)="guarda()"
        >
          <fa-icon [icon]="iconoAnadir" />
          {{ guardando() ? t('profile.billing.saving') : t('profile.billing.save_card') }}
        </button>
      </div>
    </div>
  `,
})
export class AltaDeTarjeta implements OnDestroy {
  readonly clavePublicable = input.required<string>();
  /** La ventana emergente pone su propio título: entonces la cabecera aquí sobra. */
  readonly conCabecera = input(true);
  readonly anadida = output<void>();

  private readonly traduccion = inject(TraduccionService);
  private readonly pasarela = inject(PASARELA_DE_TARJETA_PORT);
  private readonly anade = inject(AnadeTarjeta);

  protected readonly t = this.traduccion.t;
  protected readonly iconoAnadir = faPlus;

  /**
   * Identificadores propios de esta instancia: el perfil monta el formulario dos veces —la sección de
   * métodos de pago y la ventana de contratación— y dos etiquetas apuntando al mismo campo dejan a
   * quien usa un lector de pantalla sin saber cuál está rellenando.
   */
  protected readonly idTitular = `alta-tarjeta-${siguienteId++}`;
  protected readonly idError = `${this.idTitular}-error`;

  private readonly hueco = viewChild.required<ElementRef<HTMLElement>>('hueco');
  private campo: CampoDeTarjeta | null = null;

  protected readonly titular = signal('');
  protected readonly tocado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** El campo ya está montado y se puede escribir en él. */
  protected readonly listo = signal(false);

  protected readonly hayTitular = computed(() => titularDeTarjetaValido(this.titular()));
  protected readonly faltaElTitular = computed(() => this.tocado() && !this.hayTitular());

  constructor() {
    // Se monta después del primer pintado porque hasta entonces el hueco no está en el documento.
    afterNextRender(() => void this.monta());
  }

  ngOnDestroy(): void {
    this.campo?.destruye();
  }

  private async monta(): Promise<void> {
    const montado = await this.pasarela.monta(this.hueco().nativeElement, this.clavePublicable());
    if (montado.ok) {
      this.campo = montado.valor;
      this.listo.set(true);
      return;
    }
    // Sin campo no se puede añadir la tarjeta, pero el resto del perfil sigue siendo utilizable: se
    // avisa y no se rompe la pantalla.
    this.error.set(montado.error.mensaje || this.t('profile.billing.error'));
  }

  protected escribeTitular(evento: Event): void {
    this.titular.set((evento.target as HTMLInputElement).value);
  }

  protected async guarda(): Promise<void> {
    const campo = this.campo;
    if (!campo || this.guardando()) {
      return;
    }
    if (!this.hayTitular()) {
      this.tocado.set(true);
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.anade.ejecuta(campo, this.titular());
      if (resultado.ok) {
        this.titular.set('');
        this.tocado.set(false);
        this.anadida.emit();
        return;
      }
      this.error.set(this.textoDelFallo(resultado.error.codigo, resultado.error.mensaje));
    } finally {
      this.guardando.set(false);
    }
  }

  /**
   * Qué se enseña al fallar.
   *
   * <p>Lo que rechaza el negocio antes de salir del navegador llega por CÓDIGO y su texto sale del
   * diccionario; lo que rechaza la pasarela llega ya redactado y traducido, y ese mensaje es el que hay
   * que enseñar: dice si la tarjeta fue rechazada, si caducó o si falta un dato.
   */
  private textoDelFallo(codigo: string | undefined, mensaje: string): string {
    if (codigo === FALTA_EL_TITULAR) {
      return this.t('profile.billing.card_name_required');
    }
    return mensaje || this.t('profile.billing.error');
  }
}
