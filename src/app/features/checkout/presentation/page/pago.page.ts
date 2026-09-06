import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { LineaDeCarrito } from '@features/cart/domain/model/linea-de-carrito';
import {
  puedeBajarUnaUnidad,
  puedeSacarLaLinea,
} from '@features/cart/domain/model/pedido-minimo';
import { CARRITO_COMPARTIDO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { MetodoDePago, elSaldoAlcanza, direccionUtilizable } from '../../domain/model/pedido';
import { CompraStore, DIRECCION_NUEVA } from '../../application/state/compra.store';
import { PreparaLaCompra } from '../../application/use-case/prepara-la-compra.use-case';
import { CotizaElEnvio } from '../../application/use-case/cotiza-el-envio.use-case';
import { ValoraLaCompra } from '../../application/use-case/valora-la-compra.use-case';
import { RealizaElPedido } from '../../application/use-case/realiza-el-pedido.use-case';
import { AplicaElReferido } from '../../application/use-case/aplica-el-referido.use-case';
import { ConfirmaElDeposito } from '../../application/use-case/confirma-el-deposito.use-case';
import { ConsultaLaCobertura } from '../../application/use-case/consulta-la-cobertura.use-case';
import { PreparaLaPasarela } from '../../application/use-case/prepara-la-pasarela.use-case';
import { SeccionDeEnvio } from '../component/seccion-de-envio';
import { OpcionesDeEnvio } from '../component/opciones-de-envio';
import { LineasDeLaCompra } from '../component/lineas-de-la-compra';
import { ResumenDeLaCompra } from '../component/resumen-de-la-compra';

/**
 * La pantalla del pago.
 *
 * <p>En el front anterior eran novecientas líneas que hacían de todo: componían el pedido, hablaban con
 * seis servicios, cargaban la biblioteca de la pasarela y pintaban. Aquí la pantalla solo ATA: lee el
 * estado, llama a un caso de uso y navega según lo que le responda. Ni una dirección de backend, ni una
 * cuenta con dinero, ni el nombre de ninguna pasarela.
 *
 * <p>MÓVIL PRIMERO: una columna, y a partir de `lg` el resumen se va a la derecha. `items-start` para que
 * las dos columnas empiecen a la misma altura; sin él, la más baja se centra verticalmente.
 */
@Component({
  selector: 'nx-pago-page',
  imports: [RouterLink, SeccionDeEnvio, OpcionesDeEnvio, LineasDeLaCompra, ResumenDeLaCompra],
  template: `
    @if (lineas().length === 0 && !estado.depositoEnCripto()) {
      <div class="max-w-2xl mx-auto card p-10 text-center">
        <h1>{{ t('checkout.empty.title') }}</h1>
        <p class="text-sm text-ink-500 mt-2">{{ t('checkout.empty.desc') }}</p>
        <a routerLink="/catalog" class="btn btn-primary inline-flex mt-5">{{
          t('cart.see_catalog')
        }}</a>
      </div>
    } @else {
      <form class="max-w-5xl mx-auto space-y-4" (submit)="paga($event)">
        <h1>{{ t('checkout.title') }}</h1>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          <div class="lg:col-span-2 space-y-4">
            <nx-seccion-de-envio
              [direcciones]="estado.direcciones()"
              [resueltas]="estado.direccionesResueltas()"
              [elegida]="estado.direccionElegida()"
              [direccionNueva]="estado.direccionNueva()"
              [provincias]="provincias()"
              [guardar]="estado.guardaLaDireccion()"
              (elige)="estado.eligeDireccion($event)"
              (escribe)="estado.escribeDireccion($event)"
              (cambiaGuardado)="estado.fijaGuardarDireccion($event)"
            />

            <!-- Las formas de envío aparecen bajo la dirección porque dependen de ella, y solo cuando el
                 transportista cotiza más de una: con la tarifa de la tabla de zonas no hay entre qué
                 elegir y una lista de un elemento solo estorba. -->
            @if (envio.opciones().length > 1) {
              <section class="card p-5">
                <nx-opciones-de-envio
                  [opciones]="envio.opciones()"
                  [seleccionada]="envio.opcionCotizada()"
                  (elige)="estado.eligeOpcionDeEnvio($event)"
                />
              </section>
            }

            <nx-lineas-de-la-compra
              [lineas]="lineas()"
              [valoracion]="valoracion"
              [notas]="estado.notas()"
              [aviso]="avisoDeMinimo()"
              [sePuedeBajar]="sePuedeBajar"
              (baja)="baja($event)"
              (sube)="sube($event)"
              (quita)="quita($event)"
              (notasChange)="estado.escribeNotas($event)"
              (descartaAviso)="avisoDeMinimo.set(null)"
            />
          </div>

          <aside class="lg:col-span-1">
            <nx-resumen-de-la-compra
              [cotizacion]="envio.cotizacion()"
              [opcionCotizada]="opcionCotizada()"
              [subtotal]="valoracion.subtotal()"
              [hayPais]="!!estado.paisDeEnvio()"
              [cuponAplicado]="estado.cupon()"
              [referidoPendiente]="referidoPendiente"
              [referidoAplicado]="referidoAplicado()"
              [referidoInvalido]="referidoInvalido()"
              [referidoOcupado]="referidoOcupado()"
              [deposito]="estado.depositoEnCripto()"
              [saldo]="estado.saldo()"
              [alcanzaElSaldo]="alcanzaElSaldo()"
              [metodosGuardados]="estado.metodosGuardados()"
              [claveDelMetodo]="estado.claveDelMetodo()"
              [metodo]="estado.metodoDePago()"
              [idDeTarjeta]="estado.tarjetaGuardada()"
              [error]="estado.error()"
              [cobrando]="estado.cobrando()"
              [sePuedePagar]="sePuedePagar()"
              [faltas]="faltas()"
              (aplicaCupon)="estado.aplicaCupon($event)"
              (aplicaReferido)="aplicaReferido($event)"
              (eligeMetodo)="eligeMetodo($event)"
              (confirmaDeposito)="confirmaDeposito()"
            />
          </aside>
        </div>
      </form>
    }
  `,
})
export class PagoPage {
  protected readonly estado = inject(CompraStore);
  private readonly carrito = inject(CARRITO_COMPARTIDO_PORT);
  private readonly realizaElPedido = inject(RealizaElPedido);
  private readonly aplicaElReferido = inject(AplicaElReferido);
  private readonly confirmaElDeposito = inject(ConfirmaElDeposito);
  private readonly preparaLaPasarela = inject(PreparaLaPasarela);
  private readonly router = inject(Router);
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  private readonly tCon = this.traduccion.tCon;

  protected readonly lineas = this.carrito.lineas;
  private readonly items = computed(() =>
    this.lineas().map((linea) => ({
      productId: linea.productId,
      variantId: linea.variantId,
      cantidad: linea.cantidad,
    })),
  );

  protected readonly envio = inject(CotizaElEnvio).para(this.items);
  protected readonly valoracion = inject(ValoraLaCompra).para(this.items);
  private readonly cobertura = inject(ConsultaLaCobertura).regiones(this.estado.paisDeEnvio);

  /**
   * Las provincias, traducidas a la forma que espera el sistema de diseño. El dominio las nombra en
   * español y la pieza compartida en inglés; la traducción es cosa de la pantalla, no del dominio.
   */
  protected readonly provincias = computed(() =>
    this.cobertura.value().map((region) => ({ code: region.codigo, name: region.nombre })),
  );

  protected readonly avisoDeMinimo = signal<string | null>(null);
  protected readonly referidoPendiente = this.aplicaElReferido.pendiente() ?? '';
  protected readonly referidoAplicado = signal(this.referidoPendiente !== '');
  protected readonly referidoInvalido = signal(false);
  protected readonly referidoOcupado = signal(false);

  constructor() {
    void inject(PreparaLaCompra).ejecuta();
  }

  protected readonly opcionCotizada = computed(() =>
    this.envio.opciones().find((opcion) => opcion.codigo === this.envio.opcionCotizada()),
  );

  protected readonly alcanzaElSaldo = computed(() =>
    elSaldoAlcanza(
      this.estado.saldo()?.disponibleCentimosUsd,
      this.envio.cotizacion()?.cubierto ? this.envio.cotizacion()?.totalCentimosUsd : undefined,
    ),
  );

  /**
   * Lo que impide pagar ahora mismo, escrito para poder enseñarlo. Un botón gris sin explicación es un
   * callejón sin salida.
   */
  protected readonly faltas = computed<readonly string[]>(() => {
    const pendientes: string[] = [];
    const elegida = this.estado.direccionElegida();
    if (elegida === null) {
      pendientes.push(this.t('checkout.shipping'));
    } else if (elegida === DIRECCION_NUEVA && !direccionUtilizable(this.estado.direccionNueva())) {
      pendientes.push(
        `${this.t('checkout.full_name')} / ${this.t('checkout.line1')} / ${this.t('checkout.city')} / ${this.t('checkout.country_iso')}`,
      );
    }
    if (this.estado.metodoDePago() === 'WALLET' && !this.alcanzaElSaldo()) {
      pendientes.push(this.t('checkout.insufficient'));
    }
    return pendientes;
  });

  protected readonly sePuedePagar = computed(() => {
    const cotizacion = this.envio.cotizacion();
    return (
      this.faltas().length === 0 &&
      // Un país que el transportista no cubre, o un destino que no admite el importe, no son un pedido:
      // dejar pagar aquí crea un cobro que después hay que devolver a mano.
      !(cotizacion && !cotizacion.cubierto) &&
      !cotizacion?.aduanaBloqueada &&
      !this.estado.cobrando()
    );
  });

  /** El pedido mínimo lo decide el DOMINIO de la cesta; aquí solo se pinta apagado el botón. */
  protected readonly sePuedeBajar = (linea: LineaDeCarrito): boolean =>
    puedeBajarUnaUnidad(this.lineas(), linea).permitido;

  protected baja(linea: LineaDeCarrito): void {
    const veredicto = puedeBajarUnaUnidad(this.lineas(), linea);
    if (!veredicto.permitido) {
      this.avisoDeMinimo.set(this.avisoMinimo('cart.moq.cannot_reduce', veredicto.minimo));
      return;
    }
    this.avisoDeMinimo.set(null);
    this.carrito.cambiaCantidad(linea, linea.cantidad - 1);
  }

  protected sube(linea: LineaDeCarrito): void {
    this.avisoDeMinimo.set(null);
    this.carrito.cambiaCantidad(linea, linea.cantidad + 1);
  }

  protected quita(linea: LineaDeCarrito): void {
    const veredicto = puedeSacarLaLinea(this.lineas(), linea);
    if (!veredicto.permitido) {
      this.avisoDeMinimo.set(this.avisoMinimo('cart.moq.remove_rest', veredicto.minimo));
      return;
    }
    this.avisoDeMinimo.set(null);
    this.carrito.quita(linea);
  }

  private avisoMinimo(clave: string, minimo: number): string {
    return this.tCon(clave, { moq: minimo });
  }

  /**
   * Elige método de pago y, SOLO si es de tarjeta, empieza a preparar la pasarela.
   *
   * <p>Es el gesto que autoriza a descargar el guion externo. Quien paga con saldo o con PayPal no lo
   * baja nunca, que es de lo que se trata.
   */
  protected eligeMetodo(elegido: { clave: string; metodo: MetodoDePago; idDeTarjeta: string | null }): void {
    this.estado.eligeMetodo(elegido.clave, elegido.metodo, elegido.idDeTarjeta);
    if (elegido.metodo === 'CARD') {
      void this.preparaLaPasarela.ejecuta();
    }
  }

  protected async aplicaReferido(codigo: string): Promise<void> {
    this.referidoOcupado.set(true);
    this.referidoInvalido.set(false);
    try {
      const resultado = await this.aplicaElReferido.ejecuta(codigo);
      this.referidoAplicado.set(resultado === 'aplicado');
      this.referidoInvalido.set(resultado !== 'aplicado');
    } finally {
      this.referidoOcupado.set(false);
    }
  }

  protected async confirmaDeposito(): Promise<void> {
    const idDePedido = await this.confirmaElDeposito.ejecuta();
    if (idDePedido) {
      await this.vaAlPedido(idDePedido, true);
    }
  }

  /**
   * Paga.
   *
   * <p>La pantalla no sabe cómo se cobra: pide que se compre y navega según lo que le contesten. Es lo que
   * permite que añadir una pasarela no toque este fichero.
   */
  protected async paga(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.sePuedePagar()) {
      return;
    }
    const resultado = await this.realizaElPedido.ejecuta(this.items());
    switch (resultado.tipo) {
      case 'pagado':
        this.carrito.vacia();
        await this.vaAlPedido(resultado.idDePedido, true);
        return;
      case 'creado':
        this.carrito.vacia();
        await this.vaAlPedido(resultado.idDePedido, false);
        return;
      case 'retorno-interno':
        await this.router.navigateByUrl(resultado.ruta);
        return;
      // «en-pasarela»: el navegador ya está saliendo del sitio.
      // «esperando-deposito»: se queda en pantalla con la dirección del depósito.
      // «error»: el motivo ya está en el estado y la pantalla lo pinta.
      default:
        return;
    }
  }

  private vaAlPedido(idDePedido: string, pagado: boolean): Promise<boolean> {
    return this.router.navigate(['/orders', idDePedido], {
      queryParams: pagado ? { placed: 1, paid: 1 } : { placed: 1 },
    });
  }
}
