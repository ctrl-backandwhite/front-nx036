import { Component, inject, input, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CotizacionDeEnvio, OpcionDeEnvio } from '../../domain/model/cotizacion-de-envio';
import { CobroIniciado, MetodoGuardado } from '../../domain/model/pago';
import { MetodoDePago } from '../../domain/model/pedido';
import { SaldoDeCartera } from '../../domain/port/cartera.port';
import { CampoDeCupon } from './campo-de-cupon';
import { DesgloseDelPedido } from './desglose-del-pedido';
import { AvisosDeAduana } from './avisos-de-aduana';
import { CampoDeReferido } from './campo-de-referido';
import { SelectorDeMetodo, MetodoElegido } from './selector-de-metodo';
import { DepositoEnCripto } from './deposito-en-cripto';
import { BotonDePago } from './boton-de-pago';

/**
 * La columna del resumen: cupón, desglose, avisos, referido, método de pago y botón.
 *
 * <p>Es un ENSAMBLADO, no una pantalla: no decide nada, solo coloca en orden las piezas y reenvía hacia
 * arriba lo que se pulsa. Ese orden es el del front anterior y no se toca — es el que se probó con gente
 * comprando de verdad.
 */
@Component({
  selector: 'nx-resumen-de-la-compra',
  imports: [
    CampoDeCupon,
    DesgloseDelPedido,
    AvisosDeAduana,
    CampoDeReferido,
    SelectorDeMetodo,
    DepositoEnCripto,
    BotonDePago,
  ],
  template: `
    <div class="card p-5 space-y-4">
      <h3>{{ t('checkout.summary') }}</h3>

      <nx-campo-de-cupon
        [aplicado]="cuponAplicado()"
        [aceptado]="cotizacion()?.codigoDeCupon"
        [error]="cotizacion()?.errorDeCupon"
        (aplica)="aplicaCupon.emit($event)"
      />

      <nx-desglose-del-pedido
        [cotizacion]="cotizacion()"
        [subtotal]="subtotal()"
        [hayPais]="hayPais()"
        [opcionCotizada]="opcionCotizada()"
      />

      <nx-avisos-de-aduana [cotizacion]="cotizacion()" [hayPais]="hayPais()" />

      <nx-campo-de-referido
        [codigo]="referidoPendiente()"
        [aplicado]="referidoAplicado()"
        [deEnlace]="referidoPendiente() !== ''"
        [invalido]="referidoInvalido()"
        [ocupado]="referidoOcupado()"
        (aplica)="aplicaReferido.emit($event)"
      />

      <!--
        EL BLOQUE DEL MÉTODO DE PAGO SE DIFIERE HASTA QUE SE TOCA.

        No es una floritura: detrás de la tarjeta hay un guion externo pesado que además vigila la página
        entera. Cargarlo al abrir el pago se lo cobra a todo el mundo, incluido quien paga con saldo y no
        lo va a usar nunca. Difiriéndolo hasta el primer gesto, el código del selector —y con él la
        preparación de la pasarela— solo baja cuando alguien va a elegir de verdad.

        El marcador NO es un hueco: dice qué método está elegido, que es lo que hay que comprobar antes
        de pagar, y basta con tocarlo para poder cambiarlo.
      -->
      @defer (on interaction) {
        <nx-selector-de-metodo
          [guardados]="metodosGuardados()"
          [clave]="claveDelMetodo()"
          [metodo]="metodo()"
          [idDeTarjeta]="idDeTarjeta()"
          [saldo]="saldo()"
          [alcanza]="alcanzaElSaldo()"
          (elige)="eligeMetodo.emit($event)"
        />
      } @placeholder {
        <button
          type="button"
          class="w-full space-y-2 text-left min-h-11"
          [attr.aria-label]="t('checkout.payment_method')"
        >
          <span class="block text-xs font-medium opacity-70">{{ t('checkout.payment_method') }}</span>
          <span class="block border border-base-300 rounded-md p-2 text-xs">{{ metodoElegido() }}</span>
        </button>
      }

      @if (deposito(); as cobro) {
        <nx-deposito-en-cripto [cobro]="cobro" (confirma)="confirmaDeposito.emit()" />
      }

      <nx-boton-de-pago
        [sePuedePagar]="sePuedePagar()"
        [cobrando]="cobrando()"
        [error]="error()"
        [faltas]="faltas()"
      />
    </div>
  `,
})
export class ResumenDeLaCompra {
  readonly cotizacion = input<CotizacionDeEnvio | undefined>(undefined);
  readonly opcionCotizada = input<OpcionDeEnvio | undefined>(undefined);
  readonly subtotal = input.required<string>();
  readonly hayPais = input.required<boolean>();
  readonly cuponAplicado = input.required<string>();
  readonly referidoPendiente = input.required<string>();
  readonly referidoAplicado = input.required<boolean>();
  readonly referidoInvalido = input.required<boolean>();
  readonly referidoOcupado = input.required<boolean>();
  readonly deposito = input<CobroIniciado | null>(null);
  readonly saldo = input<SaldoDeCartera | null>(null);
  readonly alcanzaElSaldo = input.required<boolean>();
  readonly metodosGuardados = input.required<readonly MetodoGuardado[]>();
  readonly claveDelMetodo = input.required<string>();
  readonly metodo = input.required<MetodoDePago>();
  readonly idDeTarjeta = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly cobrando = input.required<boolean>();
  readonly sePuedePagar = input.required<boolean>();
  readonly faltas = input.required<readonly string[]>();

  readonly aplicaCupon = output<string>();
  readonly aplicaReferido = output<string>();
  readonly eligeMetodo = output<MetodoElegido>();
  readonly confirmaDeposito = output<void>();

  protected readonly t = inject(TraduccionService).t;

  /** Cómo se llama el método elegido, para que el marcador diga algo y no sea un hueco. */
  protected metodoElegido(): string {
    switch (this.metodo()) {
      case 'WALLET':
        return this.t('checkout.pay_wallet');
      case 'PAYPAL':
        return 'PayPal';
      default:
        return this.t('checkout.pay_card');
    }
  }
}
