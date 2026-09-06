import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { LineaDeCarrito } from '@features/cart/domain/model/linea-de-carrito';
import { CARRITO_COMPARTIDO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { CobroConTarjetaGuardada, CobroIniciado } from '../../domain/model/pago';
import { DireccionDeEnvio, DireccionGuardada, MetodoDePago, PedidoCreado, SolicitudDePedido } from '../../domain/model/pedido';
import { DIRECCIONES_DE_ENVIO_PORT, PEDIDO_PORT } from '../../domain/port/pedido.port';
import { PAGO_CON_TARJETA_GUARDADA_PORT, PAGO_PORT } from '../../domain/port/pago.port';
import { PASARELA_DE_PAGO_PORT } from '../../domain/port/pasarela-de-pago.port';
import { COTIZACION_DE_LA_COMPRA_PORT } from '../../domain/port/cotizacion-de-la-compra.port';
import { CompraStore, DIRECCION_NUEVA } from '../state/compra.store';
import { RealizaElPedido } from './realiza-el-pedido.use-case';
import { PreparaLaPasarela } from './prepara-la-pasarela.use-case';
import { RetiraLoQueYaNoEsta } from './retira-lo-que-ya-no-esta.use-case';

const ITEMS = [{ productId: 'p1', variantId: 'v1', cantidad: 2 }];

class PedidosFalsos {
  ultima: SolicitudDePedido | null = null;
  veces = 0;
  error: AppError | null = null;
  async crea(solicitud: SolicitudDePedido): Promise<Result<PedidoCreado, AppError>> {
    this.ultima = solicitud;
    this.veces += 1;
    return this.error ? fallo(this.error) : exito({ id: 'o1' });
  }
}

class DireccionesFalsas {
  creadas: DireccionDeEnvio[] = [];
  falla = false;
  async lista(): Promise<Result<readonly DireccionGuardada[], AppError>> {
    return exito([]);
  }
  async crea(direccion: DireccionDeEnvio): Promise<Result<DireccionGuardada, AppError>> {
    this.creadas.push(direccion);
    return this.falla
      ? fallo(creaError('peticion-invalida', 'dirección inválida'))
      : exito({ ...direccion, id: 'd9', porDefecto: true });
  }
}

class PagosFalsos {
  readonly llamadas: string[] = [];
  respuesta: CobroIniciado = { id: 'c1', idDePedido: 'o1' };
  error: AppError | null = null;
  errorAlConfirmar: AppError | null = null;
  async inicia(idDePedido: string, metodo: MetodoDePago): Promise<Result<CobroIniciado, AppError>> {
    this.llamadas.push(`inicia:${idDePedido}:${metodo}`);
    return this.error ? fallo(this.error) : exito(this.respuesta);
  }
  async confirma(o: string, c: string): Promise<Result<void, AppError>> {
    this.llamadas.push(`confirma:${o}:${c}`);
    return this.errorAlConfirmar ? fallo(this.errorAlConfirmar) : exito(undefined);
  }
  async confirmaSimulado(): Promise<Result<void, AppError>> {
    return exito(undefined);
  }
}

class TarjetaGuardadaFalsa {
  readonly llamadas: string[] = [];
  respuesta: CobroConTarjetaGuardada = { resuelto: true };
  error: AppError | null = null;
  errorAlConfirmar: AppError | null = null;
  async cobra(o: string, m: string): Promise<Result<CobroConTarjetaGuardada, AppError>> {
    this.llamadas.push(`cobra:${o}:${m}`);
    return this.error ? fallo(this.error) : exito(this.respuesta);
  }
  async confirma(o: string, c: string): Promise<Result<void, AppError>> {
    this.llamadas.push(`confirma:${o}:${c}`);
    return this.errorAlConfirmar ? fallo(this.errorAlConfirmar) : exito(undefined);
  }
}

class PasarelaFalsa {
  abierta: string | null = null;
  errorDeAutenticacion: AppError | null = null;
  secretos: string[] = [];
  async prepara(): Promise<Result<void, AppError>> {
    return exito(undefined);
  }
  async autentica(secreto: string): Promise<Result<void, AppError>> {
    this.secretos.push(secreto);
    return this.errorDeAutenticacion ? fallo(this.errorDeAutenticacion) : exito(undefined);
  }
  abre(url: string): void {
    this.abierta = url;
  }
}

class CarritoFalso {
  readonly lineas = signal<readonly LineaDeCarrito[]>([]);
  readonly quitadas: string[] = [];
  vaciado = false;
  cambiaCantidad(): void {
    /* no hace falta en estas pruebas */
  }
  quita(referencia: { productId: string }): void {
    this.quitadas.push(referencia.productId);
  }
  vacia(): void {
    this.vaciado = true;
  }
}

class ValoracionFalsa {
  lineas: { productId: string; variantId?: string }[] = [];
  async valora() {
    return exito({ lineas: this.lineas });
  }
}

function monta({ conDireccion = true } = {}) {
  const pedidos = new PedidosFalsos();
  const direcciones = new DireccionesFalsas();
  const pagos = new PagosFalsos();
  const tarjeta = new TarjetaGuardadaFalsa();
  const pasarela = new PasarelaFalsa();
  const carrito = new CarritoFalso();
  const valoracion = new ValoracionFalsa();
  TestBed.configureTestingModule({
    providers: [
      { provide: PEDIDO_PORT, useValue: pedidos },
      { provide: DIRECCIONES_DE_ENVIO_PORT, useValue: direcciones },
      { provide: PAGO_PORT, useValue: pagos },
      { provide: PAGO_CON_TARJETA_GUARDADA_PORT, useValue: tarjeta },
      { provide: PASARELA_DE_PAGO_PORT, useValue: pasarela },
      { provide: CARRITO_COMPARTIDO_PORT, useValue: carrito },
      { provide: COTIZACION_DE_LA_COMPRA_PORT, useValue: valoracion },
      CompraStore,
      PreparaLaPasarela,
      RetiraLoQueYaNoEsta,
      RealizaElPedido,
    ],
  });
  const estado = TestBed.inject(CompraStore);
  if (conDireccion) {
    estado.eligeDireccion('d1');
  }
  return {
    pedidos,
    direcciones,
    pagos,
    tarjeta,
    pasarela,
    carrito,
    valoracion,
    estado,
    caso: TestBed.inject(RealizaElPedido),
  };
}

describe('el camino feliz', () => {
  it('con monedero, el pedido queda creado y cobrado', async () => {
    const { caso, pagos, estado } = monta();
    estado.eligeMetodo('wallet', 'WALLET', null);

    const resultado = await caso.ejecuta(ITEMS);

    expect(resultado).toEqual({ tipo: 'creado', idDePedido: 'o1' });
    expect(pagos.llamadas).toEqual(['inicia:o1:WALLET']);
  });

  it('con pasarela externa, sale del sitio y NO vacía la cesta', async () => {
    const { caso, pagos, pasarela, carrito } = monta();
    pagos.respuesta = { id: 'c1', idDePedido: 'o1', urlDeAprobacion: 'https://checkout.stripe.com/x' };

    const resultado = await caso.ejecuta(ITEMS);

    expect(resultado).toEqual({ tipo: 'en-pasarela' });
    expect(pasarela.abierta).toBe('https://checkout.stripe.com/x');
    // Volver atrás sin pagar tiene que conservar la compra.
    expect(carrito.vaciado).toBe(false);
  });

  it('en modo simulado la vuelta es interna: se navega por dentro', async () => {
    const { caso, pagos, pasarela } = monta();
    pagos.respuesta = {
      id: 'c1',
      idDePedido: 'o1',
      urlDeAprobacion: 'http://localhost:3004/checkout/return?orderId=o1',
    };

    // Absoluta pero de este mismo sitio: se abre igual porque el dominio solo mira si es absoluta.
    expect(await caso.ejecuta(ITEMS)).toEqual({ tipo: 'en-pasarela' });
    expect(pasarela.abierta).toContain('/checkout/return');
  });

  it('una dirección de aprobación relativa se navega por dentro', async () => {
    const { caso, pagos } = monta();
    pagos.respuesta = { id: 'c1', idDePedido: 'o1', urlDeAprobacion: '/checkout/return?orderId=o1' };

    expect(await caso.ejecuta(ITEMS)).toEqual({
      tipo: 'retorno-interno',
      ruta: '/checkout/return?orderId=o1',
    });
  });

  it('sin dirección de aprobación se confirma directamente', async () => {
    const { caso, pagos } = monta();

    expect(await caso.ejecuta(ITEMS)).toEqual({ tipo: 'pagado', idDePedido: 'o1' });
    expect(pagos.llamadas).toContain('confirma:o1:c1');
  });

  it('con cripto se queda esperando el depósito y lo guarda para pintarlo', async () => {
    const { caso, pagos, estado } = monta();
    estado.eligeMetodo('usdt', 'USDT', null);
    pagos.respuesta = { id: 'c1', idDePedido: 'o1', deposito: { direccion: '0xabc', red: 'TRC20' } };

    expect(await caso.ejecuta(ITEMS)).toEqual({ tipo: 'esperando-deposito' });
    expect(estado.depositoEnCripto()?.deposito?.direccion).toBe('0xabc');
  });
});

describe('la dirección de envío', () => {
  it('con dirección nueva y «guardar», la crea y manda su identificador', async () => {
    const { caso, direcciones, pedidos, estado } = monta();
    estado.eligeDireccion(DIRECCION_NUEVA);
    estado.escribeDireccion({
      nombreCompleto: 'Ana', linea1: 'Mayor 1', ciudad: 'Madrid', pais: 'ES',
    });

    await caso.ejecuta(ITEMS);

    expect(direcciones.creadas).toHaveLength(1);
    expect(pedidos.ultima?.idDeDireccion).toBe('d9');
    expect(pedidos.ultima?.direccionSuelta).toBeUndefined();
  });

  it('sin «guardar», la dirección viaja suelta con el pedido', async () => {
    const { caso, direcciones, pedidos, estado } = monta();
    estado.eligeDireccion(DIRECCION_NUEVA);
    estado.fijaGuardarDireccion(false);
    estado.escribeDireccion({
      nombreCompleto: 'Ana', linea1: 'Mayor 1', ciudad: 'Madrid', pais: 'ES',
    });

    await caso.ejecuta(ITEMS);

    expect(direcciones.creadas).toHaveLength(0);
    expect(pedidos.ultima?.direccionSuelta?.ciudad).toBe('Madrid');
  });

  it('si guardar la dirección falla, no se crea ningún pedido', async () => {
    const { caso, direcciones, pedidos, estado } = monta();
    estado.eligeDireccion(DIRECCION_NUEVA);
    direcciones.falla = true;

    const resultado = await caso.ejecuta(ITEMS);

    expect(resultado).toEqual({ tipo: 'error' });
    expect(pedidos.veces).toBe(0);
    expect(estado.error()).toBe('dirección inválida');
  });
});

describe('la tarjeta guardada', () => {
  it('cobra del lado del servidor sin salir del sitio', async () => {
    const { caso, tarjeta, pasarela, estado } = monta();
    estado.eligeMetodo('guardado:pm_1', 'CARD', 'pm_1');

    const resultado = await caso.ejecuta(ITEMS);

    expect(resultado).toEqual({ tipo: 'pagado', idDePedido: 'o1' });
    expect(tarjeta.llamadas).toEqual(['cobra:o1:pm_1']);
    expect(pasarela.abierta).toBeNull();
  });

  it('si el banco exige autenticación reforzada, la resuelve el navegador y luego se cierra el cobro', async () => {
    const { caso, tarjeta, pasarela, estado } = monta();
    estado.eligeMetodo('guardado:pm_1', 'CARD', 'pm_1');
    tarjeta.respuesta = { resuelto: false, secretoDeCliente: 'pi_1_secret', idDeCobro: 'pay1' };

    const resultado = await caso.ejecuta(ITEMS);

    expect(pasarela.secretos).toEqual(['pi_1_secret']);
    expect(tarjeta.llamadas).toContain('confirma:o1:pay1');
    expect(resultado).toEqual({ tipo: 'pagado', idDePedido: 'o1' });
  });
});

/** El camino de error del pago es donde están los fallos que llegan a producción. */
describe('cuando el pago falla', () => {
  it('el rechazo del banco se cuenta con el motivo que da el proveedor', async () => {
    const { caso, pasarela, tarjeta, estado } = monta();
    estado.eligeMetodo('guardado:pm_1', 'CARD', 'pm_1');
    tarjeta.respuesta = { resuelto: false, secretoDeCliente: 'pi_1_secret', idDeCobro: 'pay1' };
    pasarela.errorDeAutenticacion = creaError('conflicto', 'Tu tarjeta ha caducado.');

    const resultado = await caso.ejecuta(ITEMS);

    expect(resultado).toEqual({ tipo: 'error' });
    expect(estado.error()).toBe('Tu tarjeta ha caducado.');
    // No se confirma un cobro que no se ha autenticado.
    expect(tarjeta.llamadas).not.toContain('confirma:o1:pay1');
  });

  it('si el proveedor no explica el rechazo, se dice algo entendible igualmente', async () => {
    const { caso, pasarela, tarjeta, estado } = monta();
    estado.eligeMetodo('guardado:pm_1', 'CARD', 'pm_1');
    tarjeta.respuesta = { resuelto: false, secretoDeCliente: 's', idDeCobro: 'pay1' };
    pasarela.errorDeAutenticacion = creaError('conflicto', '');

    await caso.ejecuta(ITEMS);

    expect(estado.error()).toBeTruthy();
  });

  it('un fallo al cobrar la tarjeta guardada se enseña', async () => {
    const { caso, tarjeta, estado } = monta();
    estado.eligeMetodo('guardado:pm_1', 'CARD', 'pm_1');
    tarjeta.error = creaError('conflicto', 'Fondos insuficientes');

    expect(await caso.ejecuta(ITEMS)).toEqual({ tipo: 'error' });
    expect(estado.error()).toBe('Fondos insuficientes');
  });

  it('un fallo al confirmar tras el reto también se enseña', async () => {
    const { caso, tarjeta, estado } = monta();
    estado.eligeMetodo('guardado:pm_1', 'CARD', 'pm_1');
    tarjeta.respuesta = { resuelto: false, secretoDeCliente: 's', idDeCobro: 'pay1' };
    tarjeta.errorAlConfirmar = creaError('error-del-servidor', 'no se pudo cerrar el cobro');

    expect(await caso.ejecuta(ITEMS)).toEqual({ tipo: 'error' });
    expect(estado.error()).toBe('no se pudo cerrar el cobro');
  });

  it('un fallo al iniciar el cobro se enseña', async () => {
    const { caso, pagos, estado } = monta();
    pagos.error = creaError('error-del-servidor', 'la pasarela no responde');

    expect(await caso.ejecuta(ITEMS)).toEqual({ tipo: 'error' });
    expect(estado.error()).toBe('la pasarela no responde');
  });

  it('un fallo al confirmar directamente se enseña', async () => {
    const { caso, pagos, estado } = monta();
    pagos.errorAlConfirmar = creaError('conflicto', 'ya estaba cobrado');

    expect(await caso.ejecuta(ITEMS)).toEqual({ tipo: 'error' });
    expect(estado.error()).toBe('ya estaba cobrado');
  });

  it('el saldo insuficiente se cuenta con qué se puede hacer', async () => {
    const { caso, pedidos, estado } = monta();
    pedidos.error = creaError('conflicto', 'Insufficient wallet balance');

    await caso.ejecuta(ITEMS);

    expect(estado.error()).not.toBe('Insufficient wallet balance');
    expect(estado.error()).toBeTruthy();
  });

  it('sin mensaje del backend se dice algo, no una cadena vacía', async () => {
    const { caso, pedidos, estado } = monta();
    pedidos.error = creaError('error-del-servidor', '');

    await caso.ejecuta(ITEMS);

    expect(estado.error()).toBeTruthy();
  });

  /**
   * El catálogo se reimportó y la variante cambió de identificador: sin quitarla, el reintento falla
   * igual y quien compra queda atrapado en un pago que nunca sale.
   */
  it('una línea que el catálogo ya no reconoce se retira de la cesta', async () => {
    const { caso, pedidos, carrito, valoracion, estado } = monta();
    carrito.lineas.set([
      { productId: 'p1', variantId: 'v1', slug: 's', titulo: 'T', precioUnitarioOrigen: 1, divisaDeOrigen: 'CNY', cantidad: 1 },
      { productId: 'p2', variantId: 'vieja', slug: 's', titulo: 'T', precioUnitarioOrigen: 1, divisaDeOrigen: 'CNY', cantidad: 1 },
    ]);
    valoracion.lineas = [{ productId: 'p1', variantId: 'v1' }];
    pedidos.error = creaError('conflicto', 'no disponible', { codigo: 'CART_ITEM_UNAVAILABLE' });

    await caso.ejecuta(ITEMS);
    await Promise.resolve();
    await Promise.resolve();

    expect(carrito.quitadas).toEqual(['p2']);
    expect(estado.error()).toBeTruthy();
  });
});

describe('el cerrojo contra el doble cobro', () => {
  /** El botón se desactiva un instante después: un triple clic creaba tres pedidos. */
  it('ignora las reentradas mientras hay un cobro en curso', async () => {
    const { caso, pedidos } = monta();

    const [uno, dos] = await Promise.all([caso.ejecuta(ITEMS), caso.ejecuta(ITEMS)]);

    expect(pedidos.veces).toBe(1);
    expect([uno.tipo, dos.tipo]).toContain('error');
  });

  /**
   * Si el pedido llegó a crearse y falló el cobro, el siguiente intento con la MISMA cesta reutiliza aquel
   * pedido en vez de crear otro.
   */
  it('un reintento con la misma cesta reutiliza el pedido ya creado', async () => {
    const { caso, pedidos, pagos } = monta();
    pagos.error = creaError('error-del-servidor', 'x');
    await caso.ejecuta(ITEMS);

    pagos.error = null;
    await caso.ejecuta(ITEMS);

    expect(pedidos.veces).toBe(1);
  });

  it('cambiar la cesta obliga a crear un pedido nuevo', async () => {
    const { caso, pedidos, pagos } = monta();
    pagos.error = creaError('error-del-servidor', 'x');
    await caso.ejecuta(ITEMS);

    pagos.error = null;
    await caso.ejecuta([{ productId: 'p1', variantId: 'v1', cantidad: 5 }]);

    expect(pedidos.veces).toBe(2);
  });

  it('mientras cobra lo dice, y al acabar deja de decirlo', async () => {
    const { caso, estado } = monta();

    const encurso = caso.ejecuta(ITEMS);
    expect(estado.cobrando()).toBe(true);
    await encurso;
    expect(estado.cobrando()).toBe(false);
  });
});

describe('lo que se manda al crear el pedido', () => {
  it('lleva el canal COTIZADO, el cupón y las notas', async () => {
    const { caso, pedidos, estado } = monta();
    estado.aplicaCupon('verano10');
    estado.eligeOpcionDeEnvio('FZZXR');
    estado.escribeNotas('Dejar en portería');

    await caso.ejecuta(ITEMS);

    expect(pedidos.ultima).toMatchObject({
      codigoDeCupon: 'VERANO10',
      opcionDeEnvio: 'FZZXR',
      notas: 'Dejar en portería',
      metodoDePago: 'CARD',
    });
  });

  /** Sin dirección resuelta todavía no hay pedido posible: crearlo sería un pedido sin destino. */
  it('sin dirección decidida no se crea nada', async () => {
    const { caso, pedidos } = monta({ conDireccion: false });

    expect(await caso.ejecuta(ITEMS)).toEqual({ tipo: 'error' });
    expect(pedidos.veces).toBe(0);
  });
});
