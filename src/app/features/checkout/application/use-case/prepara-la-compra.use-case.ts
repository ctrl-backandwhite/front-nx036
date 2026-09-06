import { Injectable, inject } from '@angular/core';
import { CARTERA_PORT } from '../../domain/port/cartera.port';
import { METODOS_DE_PAGO_PORT } from '../../domain/port/pago.port';
import { DIRECCIONES_DE_ENVIO_PORT } from '../../domain/port/pedido.port';
import { CompraStore, DIRECCION_NUEVA } from '../state/compra.store';

/**
 * Deja el pago listo para poder cobrar: direcciones, saldo, métodos guardados y pasarela.
 *
 * <p>Es UN caso de uso y no cuatro porque responde a una sola pregunta —¿qué hace falta saber antes de
 * poder cobrar?— y porque el orden importa: las direcciones deciden la preselección, y la preselección
 * decide el destino con el que se cotiza. Repartirlo obligaría a la pantalla a acordarse de llamar a
 * cuatro cosas y a saber cuál va antes.
 *
 * <p>Las cuatro consultas salen A LA VEZ. En serie, abrir el pago costaba cuatro viajes al servidor
 * encadenados justo en el paso donde menos se aguanta esperar.
 *
 * <p>Ninguna es imprescindible: si el saldo no responde, no se puede pagar con monedero pero sí con
 * tarjeta; si los métodos guardados no llegan, se paga con una nueva. Un fallo de red en cualquiera de
 * ellas no puede impedir la compra entera.
 */
@Injectable()
export class PreparaLaCompra {
  private readonly direcciones = inject(DIRECCIONES_DE_ENVIO_PORT);
  private readonly cartera = inject(CARTERA_PORT);
  private readonly metodos = inject(METODOS_DE_PAGO_PORT);
  private readonly estado = inject(CompraStore);

  async ejecuta(): Promise<void> {
    const [direcciones, saldo, guardados, configuracion] = await Promise.all([
      this.direcciones.lista(),
      this.cartera.saldo(),
      this.metodos.guardados(),
      this.metodos.configuracion(),
    ]);

    // Sin direcciones —o si la consulta falló— se abre directamente el formulario. El fallo anterior era
    // el contrario: al fallar la consulta, la pantalla se quedaba sin dirección elegida y el botón de
    // pagar permanecía apagado sin decir por qué.
    this.estado.fijaDirecciones(direcciones.ok ? direcciones.valor : []);
    this.eligeLaDireccionDeSalida();

    this.estado.fijaSaldo(saldo.ok ? saldo.valor : null);
    this.estado.fijaMetodosGuardados(guardados.ok ? guardados.valor : []);
    this.preseleccionaElMetodo();

    // Se GUARDA la clave, pero NO se descarga la pasarela: eso lo hace `PreparaLaPasarela` cuando se
    // elige pagar con tarjeta. El guion es un fichero externo pesado y quien paga con saldo no lo usa.
    if (configuracion.ok && configuracion.valor.clavePublica) {
      this.estado.fijaClaveDePasarela(configuracion.valor.clavePublica);
    }
  }

  private eligeLaDireccionDeSalida(): void {
    if (this.estado.direccionElegida() !== null) {
      return;
    }
    const lista = this.estado.direcciones();
    const porDefecto = lista.find((direccion) => direccion.porDefecto) ?? lista[0];
    this.estado.eligeDireccion(porDefecto ? porDefecto.id : DIRECCION_NUEVA);
  }

  /** El método marcado por defecto en la cuenta queda elegido al abrir el pago. */
  private preseleccionaElMetodo(): void {
    const guardados = this.estado.metodosGuardados();
    const preferido = guardados.find((metodo) => metodo.porDefecto) ?? guardados[0];
    if (!preferido) {
      return;
    }
    this.estado.eligeMetodo(
      `guardado:${preferido.id}`,
      preferido.clase === 'CARD' ? 'CARD' : 'PAYPAL',
      preferido.clase === 'CARD' ? preferido.id : null,
    );
  }
}
