import { Injectable, inject } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AppError } from '@shared/error/app-error';
import { CobroIniciado, esDireccionExterna } from '../../domain/model/pago';
import {
  DireccionDeEnvio,
  ItemDelPedido,
  MetodoDePago,
  SolicitudDePedido,
} from '../../domain/model/pedido';
import { PASARELA_DE_PAGO_PORT } from '../../domain/port/pasarela-de-pago.port';
import {
  PAGO_CON_TARJETA_GUARDADA_PORT,
  PAGO_PORT,
} from '../../domain/port/pago.port';
import { DIRECCIONES_DE_ENVIO_PORT, PEDIDO_PORT } from '../../domain/port/pedido.port';
import { CompraStore, DIRECCION_NUEVA } from '../state/compra.store';
import { PreparaLaPasarela } from './prepara-la-pasarela.use-case';
import { RetiraLoQueYaNoEsta } from './retira-lo-que-ya-no-esta.use-case';

/**
 * Cómo ha acabado el intento de comprar. La pantalla decide adónde llevar a quien compra; el caso de uso
 * decide QUÉ ha pasado.
 */
export type ResultadoDeLaCompra =
  /** Cobrado. Se puede ir al pedido diciendo que está pagado. */
  | { readonly tipo: 'pagado'; readonly idDePedido: string }
  /** Pedido creado y cobrado del monedero. */
  | { readonly tipo: 'creado'; readonly idDePedido: string }
  /** El navegador ya está saliendo hacia la pasarela: no hay nada más que hacer aquí. */
  | { readonly tipo: 'en-pasarela' }
  /** La pasarela simulada devuelve una dirección de este mismo sitio: se navega por dentro. */
  | { readonly tipo: 'retorno-interno'; readonly ruta: string }
  /** Cripto: se queda en pantalla enseñando la dirección del depósito. */
  | { readonly tipo: 'esperando-deposito' }
  /** No se pudo. El motivo ya está escrito en el estado, listo para pintarlo. */
  | { readonly tipo: 'error' };

/**
 * Comprar: crear el pedido y cobrarlo.
 *
 * <p>Es el caso de uso más delicado del proyecto —un fallo aquí se paga en dinero— y por eso está entero
 * aquí y no repartido por la pantalla. Lo que orquesta:
 *
 * <ol>
 *   <li>La dirección: guardarla en la cuenta o mandarla suelta con el pedido.</li>
 *   <li>Crear el pedido con las líneas, el cupón y el canal de envío COTIZADO.</li>
 *   <li>Cobrar por el camino que corresponda: tarjeta guardada, monedero, pasarela externa o cripto.</li>
 * </ol>
 *
 * <p>LA CESTA NO SE VACÍA AL SALIR A LA PASARELA. Solo cuando el cobro está confirmado. Vaciarla al
 * redirigir dejaba a quien volvía atrás sin pagar con un «no hay nada que comprar» y la compra perdida.
 *
 * <p>REINTENTO SIN DUPLICAR. Si el pedido llegó a crearse y falló el cobro, el siguiente intento con la
 * MISMA cesta reutiliza aquel pedido en vez de crear otro. En el front anterior esto lo garantizaba una
 * cabecera de idempotencia; el cliente HTTP de este proyecto todavía no admite cabeceras por petición, así
 * que se recuerda aquí. Está anotado como petición al equipo del núcleo: la protección buena es la del
 * servidor, porque esta se pierde al recargar la página.
 */
@Injectable()
export class RealizaElPedido {
  private readonly pedidos = inject(PEDIDO_PORT);
  private readonly direcciones = inject(DIRECCIONES_DE_ENVIO_PORT);
  private readonly pagos = inject(PAGO_PORT);
  private readonly tarjetaGuardada = inject(PAGO_CON_TARJETA_GUARDADA_PORT);
  private readonly pasarela = inject(PASARELA_DE_PAGO_PORT);
  private readonly estado = inject(CompraStore);
  private readonly preparaLaPasarela = inject(PreparaLaPasarela);
  private readonly retiraLoCaducado = inject(RetiraLoQueYaNoEsta);
  private readonly traduccion = inject(TraduccionService);

  /**
   * El intento de compra en curso: la cesta que se está comprando, su clave de idempotencia y el pedido
   * que ya se creó para ella.
   *
   * Los tres van JUNTOS a propósito. Estaban en dos campos distintos con la misma firma por llave, y
   * mantenerlos de acuerdo quedaba a mano: la rama que reutiliza el pedido no pasaba por donde se fijaba
   * la clave, así que había un camino por el que la clave del cobro se inventaba de cero en cada llamada
   * —y entonces no deduplica nada—. Con un solo registro eso no se puede dar.
   *
   * La clave es la misma mientras el comprador no cambie lo que compra: así un doble clic o el reintento
   * del navegador reutilizan el pedido en vez de crear otro, con su segundo cobro. Cambia con la firma
   * de la cesta, porque comprar otra cosa —o lo mismo otra vez, más tarde— sí es un intento nuevo.
   */
  private intento: { firma: string; clave: string; idDePedido: string | null } | null = null;
  /** Cerrojo SÍNCRONO: el botón se desactiva un instante después, y un triple clic creaba tres pedidos. */
  private enCurso = false;

  async ejecuta(items: readonly ItemDelPedido[]): Promise<ResultadoDeLaCompra> {
    if (this.enCurso) {
      return { tipo: 'error' };
    }
    this.enCurso = true;
    this.estado.marcaCobrando(true);
    this.estado.fijaError(null);
    try {
      const resultado = await this.compra(items);
      if (resultado.tipo === 'pagado' || resultado.tipo === 'creado') {
        // La compra terminó: se cierra el intento. El servicio vive lo que vive la aplicación y la firma
        // son solo los artículos, así que sin esto volver a comprar la misma cesta devolvía el pedido YA
        // PAGADO: la pantalla vaciaba la cesta, decía «¡Pedido realizado!» y llevaba al pedido viejo, sin
        // cobro y sin mercancía. Comprar lo mismo otra vez es una compra nueva, no un reintento.
        this.intento = null;
      }
      return resultado;
    } finally {
      this.enCurso = false;
      this.estado.marcaCobrando(false);
    }
  }

  private async compra(items: readonly ItemDelPedido[]): Promise<ResultadoDeLaCompra> {
    const direccion = await this.resuelveLaDireccion();
    if (direccion === 'fallo') {
      return { tipo: 'error' };
    }

    const idDePedido = await this.creaOReutilizaElPedido(items, direccion);
    if (!idDePedido) {
      return { tipo: 'error' };
    }

    const metodo = this.estado.metodoDePago();
    const tarjeta = this.estado.tarjetaGuardada();
    if (metodo === 'CARD' && tarjeta) {
      return this.cobraConTarjetaGuardada(idDePedido, tarjeta);
    }
    return this.cobraPorLaPasarela(idDePedido, metodo);
  }

  /** Devuelve el identificador de la dirección guardada, la dirección suelta, o «fallo». */
  private async resuelveLaDireccion(): Promise<
    { id: string } | { suelta: DireccionDeEnvio } | 'fallo'
  > {
    const elegida = this.estado.direccionElegida();
    if (elegida !== DIRECCION_NUEVA) {
      return elegida ? { id: elegida } : 'fallo';
    }
    const nueva = this.estado.direccionNueva();
    if (!this.estado.guardaLaDireccion()) {
      return { suelta: nueva };
    }
    // La primera dirección de una cuenta se marca por defecto: si no, la siguiente compra vuelve a
    // empezar sin ninguna elegida.
    const creada = await this.direcciones.crea(nueva, this.estado.direcciones().length === 0);
    if (!creada.ok) {
      this.estado.fijaError(this.mensaje(creada.error));
      return 'fallo';
    }
    return { id: creada.valor.id };
  }


  /**
   * Clave del cobro dentro del intento en curso. Cuelga de la del pedido para que todo lo que hace una
   * misma compra comparta raíz, con un sufijo por operación: iniciar el cobro y cargar una tarjeta
   * guardada son cosas distintas y no deben deduplicarse entre sí.
   */
  private claveDelCobro(sufijo: string): string {
    // Sin repuesto a propósito: compra() siempre pasa antes por creaOReutilizaElPedido, que deja el
    // intento fijado. Un `?? crypto.randomUUID()` aquí daría una clave nueva en cada llamada —dejando de
    // deduplicar— y lo haría en silencio, que en el camino del dinero es la peor forma de degradar.
    const intento = this.intento;
    if (!intento) {
      throw new Error('No hay intento de compra en curso: el pedido se crea antes de cobrar');
    }
    return `${intento.clave}:${sufijo}`;
  }

  /** El intento para esta cesta: el mismo si no ha cambiado lo que se compra, nuevo si sí. */
  private intentoPara(firma: string): { firma: string; clave: string; idDePedido: string | null } {
    if (this.intento?.firma !== firma) {
      this.intento = { firma, clave: crypto.randomUUID(), idDePedido: null };
    }
    return this.intento;
  }

  private async creaOReutilizaElPedido(
    items: readonly ItemDelPedido[],
    direccion: { id: string } | { suelta: DireccionDeEnvio },
  ): Promise<string | null> {
    const firma = items.map((i) => `${i.productId}:${i.variantId ?? ''}:${i.cantidad}`).sort().join('|');
    const intento = this.intentoPara(firma);
    if (intento.idDePedido) {
      return intento.idDePedido;
    }

    const solicitud: SolicitudDePedido = {
      items,
      notas: this.estado.notas() || undefined,
      metodoDePago: this.estado.metodoDePago(),
      codigoDeCupon: this.estado.cupon() || undefined,
      opcionDeEnvio: this.estado.opcionDeEnvio(),
      idDeDireccion: 'id' in direccion ? direccion.id : undefined,
      direccionSuelta: 'suelta' in direccion ? direccion.suelta : undefined,
    };
    const creado = await this.pedidos.crea(solicitud, intento.clave);
    if (!creado.ok) {
      this.estado.fijaError(this.mensaje(creado.error));
      return null;
    }
    intento.idDePedido = creado.valor.id;
    return creado.valor.id;
  }

  /**
   * Tarjeta ya guardada: el cobro lo hace el servidor sin salir del sitio. Si el banco exige
   * autenticación reforzada, el navegador la resuelve —es donde está la persona— y luego se cierra el
   * cobro del lado del servidor.
   */
  private async cobraConTarjetaGuardada(
    idDePedido: string,
    idDeTarjeta: string,
  ): Promise<ResultadoDeLaCompra> {
    const cobro = await this.tarjetaGuardada.cobra(
      idDePedido,
      idDeTarjeta,
      this.claveDelCobro(`tarjeta:${idDeTarjeta}`),
    );
    if (!cobro.ok) {
      this.estado.fijaError(this.mensaje(cobro.error));
      return { tipo: 'error' };
    }
    const { secretoDeCliente, idDeCobro } = cobro.valor;
    if (secretoDeCliente) {
      // Red de seguridad: si se llegó aquí sin haber pasado por el selector —un reintento, una vuelta de
      // la pasarela—, la biblioteca todavía no estaría cargada y el reto del banco no se podría enseñar.
      await this.preparaLaPasarela.ejecuta();
      const autenticado = await this.pasarela.autentica(secretoDeCliente);
      if (!autenticado.ok) {
        // El motivo lo da el proveedor, que es quien lo conoce; si no lo diera, un texto propio.
        this.estado.fijaError(
          autenticado.error.mensaje || this.traduccion.t('checkout.card_auth_failed'),
        );
        return { tipo: 'error' };
      }
      if (idDeCobro) {
        const confirmado = await this.tarjetaGuardada.confirma(idDePedido, idDeCobro);
        if (!confirmado.ok) {
          this.estado.fijaError(this.mensaje(confirmado.error));
          return { tipo: 'error' };
        }
      }
    }
    return { tipo: 'pagado', idDePedido };
  }

  private async cobraPorLaPasarela(
    idDePedido: string,
    metodo: MetodoDePago,
  ): Promise<ResultadoDeLaCompra> {
    if (metodo === 'WALLET') {
      // Con saldo NO se pide un segundo cobro: el pedido ya se cobró al crearlo. `POST /me/orders/checkout`
      // con paymentMethod WALLET debita el monedero, deja el pedido PAGADO y planifica la compra al
      // proveedor; pedir después un payment-intent para ese mismo pedido es pedir que se cobre otra vez, y
      // el servidor lo rechaza con «Order is already PAID». Se hacía, y el comprador veía su saldo
      // debitado, su pedido pagado y su factura enviada, y en pantalla un error en inglés con la cesta sin
      // vaciar y ningún pedido al que ir.
      return { tipo: 'creado', idDePedido };
    }

    const iniciado = await this.pagos.inicia(idDePedido, metodo, this.claveDelCobro(`pago:${metodo}`));
    if (!iniciado.ok) {
      this.estado.fijaError(this.mensaje(iniciado.error));
      return { tipo: 'error' };
    }
    const cobro = iniciado.valor;
    if (metodo === 'USDT') {
      // Se queda en pantalla enseñando la dirección del depósito; lo confirma el aviso del proveedor.
      this.estado.fijaDepositoEnCripto(cobro);
      return { tipo: 'esperando-deposito' };
    }
    return this.sigueLaAprobacion(idDePedido, cobro);
  }

  private async sigueLaAprobacion(
    idDePedido: string,
    cobro: CobroIniciado,
  ): Promise<ResultadoDeLaCompra> {
    const url = cobro.urlDeAprobacion;
    if (url && esDireccionExterna(url)) {
      this.pasarela.abre(url);
      return { tipo: 'en-pasarela' };
    }
    if (url) {
      // Modo simulado: la dirección es de este mismo sitio, así que se navega por dentro. Tratarla como
      // externa recargaba la aplicación entera en medio de un cobro.
      return { tipo: 'retorno-interno', ruta: url.replace(/^.*\/checkout\/return/, '/checkout/return') };
    }
    // Sin dirección de aprobación se confirma directamente contra el proveedor.
    const confirmado = await this.pagos.confirma(idDePedido, cobro.id);
    if (!confirmado.ok) {
      this.estado.fijaError(this.mensaje(confirmado.error));
      return { tipo: 'error' };
    }
    return { tipo: 'pagado', idDePedido };
  }

  /**
   * El texto que se enseña. Lo escribe el BACKEND salvo en dos casos con salida propia: cuando una línea
   * de la cesta ya no existe —el catálogo se reimportó y la variante cambió de identificador— y cuando el
   * saldo no llega, porque ahí hace falta decir además qué se puede hacer.
   */
  private mensaje(error: AppError): string {
    if (error.codigo === 'CART_ITEM_UNAVAILABLE') {
      // Se limpia la cesta para que el siguiente intento no vuelva a chocar con la misma línea. El texto
      // dice que se ha quitado, así que quitarlo de verdad es parte del mensaje.
      void this.retiraLoCaducado.ejecuta();
      return this.traduccion.t('checkout.stale_item');
    }
    if (/insufficient wallet balance/i.test(error.mensaje)) {
      return this.traduccion.t('checkout.insufficient_long');
    }
    return error.mensaje || this.traduccion.t('checkout.error_default');
  }
}
