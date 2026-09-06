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
import { FieldTree, FormField, form, validate } from '@angular/forms/signals';
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
 *
 * <p>El titular lo lleva Signal Forms. Antes hacían falta dos señales sueltas —el valor y un «tocado»
 * que se ponía a mano en cada `blur`— para decidir cuándo regañar; ahora eso lo sabe el propio campo y
 * la regla del negocio (`titularDeTarjetaValido`) se declara UNA vez en el esquema.
 */
@Component({
  selector: 'nx-alta-de-tarjeta',
  imports: [FaIconComponent, FormField],
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
        [formField]="formulario.titular"
        [placeholder]="t('profile.billing.card_name')"
        [attr.aria-required]="true"
        [attr.aria-invalid]="faltaElTitular()"
        [attr.aria-describedby]="faltaElTitular() ? idError : null"
        [class]="'input input-bordered input-sm w-full mt-1 mb-1' + (faltaElTitular() ? ' input-error' : '')"
      />
      @if (falloDe(formulario.titular); as fallo) {
        <p [id]="idError" role="alert" class="text-error text-[12px] mb-2">{{ fallo }}</p>
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
          [disabled]="!listo() || guardando() || formulario().invalid()"
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

  protected readonly modelo = signal({ titular: '' });

  /**
   * El titular es obligatorio y se declara con `validate()` en vez de con `required()`: quien manda es
   * la regla del dominio, que descarta también el nombre hecho solo de espacios. `required()` lo daría
   * por bueno y la pasarela acabaría guardando una tarjeta sin titular, que se rechaza en el primer
   * cobro, cuando ya no hay nadie delante.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    validate(ruta.titular, ({ value }) =>
      titularDeTarjetaValido(value())
        ? undefined
        : { kind: 'required', message: this.t('profile.billing.card_name_required') },
    );
  });

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** El campo ya está montado y se puede escribir en él. */
  protected readonly listo = signal(false);

  /** Solo se regaña por el titular que falta cuando ya se ha pasado por el campo. */
  protected readonly faltaElTitular = computed(() => {
    const estado = this.formulario.titular();
    return estado.touched() && estado.invalid();
  });

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

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo si no hay nada que decir todavía. Se calla hasta
   * que el campo se ha TOCADO: pintar de rojo un formulario recién abierto acusa a quien todavía no ha
   * escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  protected async guarda(): Promise<void> {
    const campo = this.campo;
    if (!campo || this.guardando()) {
      return;
    }
    if (this.formulario().invalid()) {
      // Se marca a mano para que el motivo se vea: quien pulsa sin haber pasado por el campo no lo ha
      // tocado, y sin esto el botón parecería no hacer nada.
      this.formulario().markAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.anade.ejecuta(campo, this.modelo().titular);
      if (resultado.ok) {
        this.modelo.set({ titular: '' });
        // Sin volver a dejarlo sin tocar, el campo recién vaciado se pintaría en rojo acusando de
        // vacío a quien acaba de guardar la tarjeta bien.
        this.formulario().reset();
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
