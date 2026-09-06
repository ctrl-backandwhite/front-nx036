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

  /** El pedido ya creado para esta cesta, para que un reintento no cree otro. */
  private pedidoEnCurso: { firma: string; id: string } | null = null;
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
      return await this.compra(items);
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

  private async creaOReutilizaElPedido(
    items: readonly ItemDelPedido[],
    direccion: { id: string } | { suelta: DireccionDeEnvio },
  ): Promise<string | null> {
    const firma = items.map((i) => `${i.productId}:${i.variantId ?? ''}:${i.cantidad}`).sort().join('|');
    if (this.pedidoEnCurso?.firma === firma) {
      return this.pedidoEnCurso.id;
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
    const creado = await this.pedidos.crea(solicitud);
    if (!creado.ok) {
      this.estado.fijaError(this.mensaje(creado.error));
      return null;
    }
    this.pedidoEnCurso = { firma, id: creado.valor.id };
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
    const cobro = await this.tarjetaGuardada.cobra(idDePedido, idDeTarjeta);
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
    const iniciado = await this.pagos.inicia(idDePedido, metodo);
    if (!iniciado.ok) {
      this.estado.fijaError(this.mensaje(iniciado.error));
      return { tipo: 'error' };
    }
    const cobro = iniciado.valor;

    if (metodo === 'WALLET') {
      return { tipo: 'creado', idDePedido };
    }
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
