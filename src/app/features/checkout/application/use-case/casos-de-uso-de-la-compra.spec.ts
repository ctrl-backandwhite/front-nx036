import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { LineaDeCarrito } from '@features/cart/domain/model/linea-de-carrito';
import { CARRITO_COMPARTIDO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { CARTERA_PORT, SaldoDeCartera } from '../../domain/port/cartera.port';
import { COTIZACION_DE_LA_COMPRA_PORT } from '../../domain/port/cotizacion-de-la-compra.port';
import { METODOS_DE_PAGO_PORT, PAGO_PORT } from '../../domain/port/pago.port';
import { PASARELA_DE_PAGO_PORT } from '../../domain/port/pasarela-de-pago.port';
import { DIRECCIONES_DE_ENVIO_PORT } from '../../domain/port/pedido.port';
import { REFERIDO_PORT } from '../../domain/port/referido.port';
import { MetodoGuardado } from '../../domain/model/pago';
import { DireccionGuardada } from '../../domain/model/pedido';
import { CompraStore, DIRECCION_NUEVA } from '../state/compra.store';
import { PreparaLaCompra } from './prepara-la-compra.use-case';
import { PreparaLaPasarela } from './prepara-la-pasarela.use-case';
import { ConfirmaElPago } from './confirma-el-pago.use-case';
import { ConfirmaElDeposito } from './confirma-el-deposito.use-case';
import { AplicaElReferido } from './aplica-el-referido.use-case';
import { RetiraLoQueYaNoEsta } from './retira-lo-que-ya-no-esta.use-case';

function direccion(id: string, porDefecto = false): DireccionGuardada {
  return {
    id,
    nombreCompleto: 'Ana',
    linea1: 'Mayor 1',
    ciudad: 'Madrid',
    pais: 'ES',
    porDefecto,
  };
}

class DireccionesFalsas {
  lista_: DireccionGuardada[] = [];
  falla = false;
  async lista(): Promise<Result<readonly DireccionGuardada[], AppError>> {
    return this.falla ? fallo(creaError('sin-conexion')) : exito(this.lista_);
  }
  async crea() {
    return exito(direccion('nueva'));
  }
}

class CarteraFalsa {
  saldo_: SaldoDeCartera = { disponibleCentimosUsd: 5000, disponibleFormateado: '50,00 $' };
  falla = false;
  async saldo(): Promise<Result<SaldoDeCartera, AppError>> {
    return this.falla ? fallo(creaError('sin-conexion')) : exito(this.saldo_);
  }
}

class MetodosFalsos {
  guardados_: MetodoGuardado[] = [];
  clave = 'pk_test_1';
  async guardados() {
    return exito<readonly MetodoGuardado[]>(this.guardados_);
  }
  async configuracion() {
    return exito({ clavePublica: this.clave, habilitada: true });
  }
}

class PasarelaFalsa {
  preparadaCon: string | null = null;
  async prepara(clave: string) {
    this.preparadaCon = clave;
    return exito(undefined);
  }
  async autentica() {
    return exito(undefined);
  }
  abre(): void {
    /* no hace falta */
  }
}

class PagosFalsos {
  readonly llamadas: string[] = [];
  error: AppError | null = null;
  async inicia() {
    return exito({ id: 'c1', idDePedido: 'o1' });
  }
  async confirma(o: string, c: string) {
    this.llamadas.push(`confirma:${o}:${c}`);
    return this.error ? fallo(this.error) : exito(undefined);
  }
  async confirmaSimulado(o: string, c: string) {
    this.llamadas.push(`simulado:${o}:${c}`);
    return this.error ? fallo(this.error) : exito(undefined);
  }
}

class CarritoFalso {
  readonly lineas = signal<readonly LineaDeCarrito[]>([]);
  readonly quitadas: string[] = [];
  vaciado = false;
  cambiaCantidad(): void {
    /* no hace falta */
  }
  quita(r: { productId: string }): void {
    this.quitadas.push(r.productId);
  }
  vacia(): void {
    this.vaciado = true;
  }
}

class ValoracionFalsa {
  lineas: { productId: string; variantId?: string }[] = [];
  falla = false;
  async valora() {
    return this.falla ? fallo(creaError('sin-conexion')) : exito({ lineas: this.lineas });
  }
}

class ReferidoFalso {
  guardado: string | null = null;
  atribuye = true;
  falla = false;
  pendiente() {
    return this.guardado;
  }
  async aplica(): Promise<Result<boolean, AppError>> {
    return this.falla ? fallo(creaError('sin-conexion')) : exito(this.atribuye);
  }
}

function monta() {
  const direcciones = new DireccionesFalsas();
  const cartera = new CarteraFalsa();
  const metodos = new MetodosFalsos();
  const pasarela = new PasarelaFalsa();
  const pagos = new PagosFalsos();
  const carrito = new CarritoFalso();
  const valoracion = new ValoracionFalsa();
  const referido = new ReferidoFalso();
  TestBed.configureTestingModule({
    providers: [
      { provide: DIRECCIONES_DE_ENVIO_PORT, useValue: direcciones },
      { provide: CARTERA_PORT, useValue: cartera },
      { provide: METODOS_DE_PAGO_PORT, useValue: metodos },
      { provide: PASARELA_DE_PAGO_PORT, useValue: pasarela },
      { provide: PAGO_PORT, useValue: pagos },
      { provide: CARRITO_COMPARTIDO_PORT, useValue: carrito },
      { provide: COTIZACION_DE_LA_COMPRA_PORT, useValue: valoracion },
      { provide: REFERIDO_PORT, useValue: referido },
      CompraStore,
      PreparaLaCompra,
      PreparaLaPasarela,
      ConfirmaElPago,
      ConfirmaElDeposito,
      AplicaElReferido,
      RetiraLoQueYaNoEsta,
    ],
  });
  return {
    direcciones,
    cartera,
    metodos,
    pasarela,
    pagos,
    carrito,
    valoracion,
    referido,
    estado: TestBed.inject(CompraStore),
  };
}

describe('PreparaLaCompra', () => {
  it('elige la dirección marcada por defecto', async () => {
    const { direcciones, estado } = monta();
    direcciones.lista_ = [direccion('d1'), direccion('d2', true)];

    await TestBed.inject(PreparaLaCompra).ejecuta();

    expect(estado.direccionElegida()).toBe('d2');
    expect(estado.paisDeEnvio()).toBe('ES');
  });

  it('sin ninguna marcada, la primera', async () => {
    const { direcciones, estado } = monta();
    direcciones.lista_ = [direccion('d1'), direccion('d2')];

    await TestBed.inject(PreparaLaCompra).ejecuta();

    expect(estado.direccionElegida()).toBe('d1');
  });

  /**
   * El fallo anterior era el contrario: al fallar la consulta la pantalla se quedaba sin dirección y el
   * botón de pagar permanecía apagado sin decir por qué.
   */
  it('sin direcciones —o con la consulta caída— abre el formulario', async () => {
    const { direcciones, estado } = monta();
    direcciones.falla = true;

    await TestBed.inject(PreparaLaCompra).ejecuta();

    expect(estado.direccionElegida()).toBe(DIRECCION_NUEVA);
    expect(estado.direccionesResueltas()).toBe(true);
  });

  it('preselecciona el método de pago marcado por defecto en la cuenta', async () => {
    const { metodos, estado } = monta();
    metodos.guardados_ = [
      { id: 'pm_1', clase: 'CARD', porDefecto: false },
      { id: 'pp_1', clase: 'PAYPAL', porDefecto: true },
    ];

    await TestBed.inject(PreparaLaCompra).ejecuta();

    expect(estado.claveDelMetodo()).toBe('guardado:pp_1');
    expect(estado.metodoDePago()).toBe('PAYPAL');
    expect(estado.tarjetaGuardada()).toBeNull();
  });

  it('una tarjeta guardada queda elegida con su identificador para el cobro', async () => {
    const { metodos, estado } = monta();
    metodos.guardados_ = [{ id: 'pm_1', clase: 'CARD', porDefecto: true }];

    await TestBed.inject(PreparaLaCompra).ejecuta();

    expect(estado.tarjetaGuardada()).toBe('pm_1');
  });

  it('sin métodos guardados deja la tarjeta nueva, que es la opción por defecto', async () => {
    const { estado } = monta();

    await TestBed.inject(PreparaLaCompra).ejecuta();

    expect(estado.claveDelMetodo()).toBe('new-card');
  });

  /**
   * El guion de la pasarela NO se descarga al abrir el pago: se lo cobraría también a quien paga con
   * saldo. Solo se guarda la clave, para cuando haga falta.
   */
  it('guarda la clave de la pasarela pero NO la descarga', async () => {
    const { pasarela, estado } = monta();

    await TestBed.inject(PreparaLaCompra).ejecuta();

    expect(estado.clavePublicaDePasarela()).toBe('pk_test_1');
    expect(pasarela.preparadaCon).toBeNull();
  });

  it('si el saldo no responde, no se puede pagar con monedero pero sí con tarjeta', async () => {
    const { cartera, estado } = monta();
    cartera.falla = true;

    await TestBed.inject(PreparaLaCompra).ejecuta();

    expect(estado.saldo()).toBeNull();
    expect(estado.metodoDePago()).toBe('CARD');
  });
});

describe('PreparaLaPasarela', () => {
  it('descarga la pasarela con la clave guardada, y solo cuando se le pide', async () => {
    const { pasarela, estado } = monta();
    estado.fijaClaveDePasarela('pk_test_1');

    await TestBed.inject(PreparaLaPasarela).ejecuta();

    expect(pasarela.preparadaCon).toBe('pk_test_1');
  });

  it('sin clave no descarga nada, y la compra con saldo sigue siendo posible', async () => {
    const { pasarela } = monta();

    await TestBed.inject(PreparaLaPasarela).ejecuta();

    expect(pasarela.preparadaCon).toBeNull();
  });
});

describe('ConfirmaElPago', () => {
  it('confirma en el servidor y AHORA sí vacía la cesta', async () => {
    const { pagos, carrito } = monta();

    const resultado = await TestBed.inject(ConfirmaElPago).ejecuta('o1', 'c1', false);

    expect(resultado.tipo).toBe('confirmado');
    expect(pagos.llamadas).toEqual(['confirma:o1:c1']);
    expect(carrito.vaciado).toBe(true);
  });

  it('si la pasarela dice que se canceló, no se confirma nada', async () => {
    const { pagos, carrito } = monta();

    const resultado = await TestBed.inject(ConfirmaElPago).ejecuta('o1', 'c1', true);

    expect(resultado.tipo).toBe('error');
    expect(pagos.llamadas).toHaveLength(0);
    expect(carrito.vaciado).toBe(false);
  });

  it.each([
    ['sin pedido', '', 'c1'],
    ['sin cobro', 'o1', ''],
  ])('%s no hay nada que confirmar', async (_caso, pedido, cobro) => {
    const { pagos } = monta();

    expect((await TestBed.inject(ConfirmaElPago).ejecuta(pedido, cobro, false)).tipo).toBe('error');
    expect(pagos.llamadas).toHaveLength(0);
  });

  it('si el servidor rechaza la confirmación, la cesta NO se vacía', async () => {
    const { pagos, carrito } = monta();
    pagos.error = creaError('conflicto', 'el cobro ya estaba capturado');

    const resultado = await TestBed.inject(ConfirmaElPago).ejecuta('o1', 'c1', false);

    expect(resultado).toEqual({ tipo: 'error', mensaje: 'el cobro ya estaba capturado' });
    expect(carrito.vaciado).toBe(false);
  });

  it('un fallo sin mensaje se cuenta igualmente', async () => {
    const { pagos } = monta();
    pagos.error = creaError('error-del-servidor', '');

    const resultado = await TestBed.inject(ConfirmaElPago).ejecuta('o1', 'c1', false);

    expect(resultado.tipo === 'error' && resultado.mensaje).toBeTruthy();
  });
});

describe('ConfirmaElDeposito', () => {
  it('cierra el cobro en cripto y vacía la cesta', async () => {
    const { pagos, carrito, estado } = monta();
    estado.fijaDepositoEnCripto({ id: 'c1', idDePedido: 'o1' });

    expect(await TestBed.inject(ConfirmaElDeposito).ejecuta()).toBe('o1');
    expect(pagos.llamadas).toEqual(['simulado:o1:c1']);
    expect(carrito.vaciado).toBe(true);
  });

  it('sin depósito iniciado no hace nada', async () => {
    const { pagos } = monta();

    expect(await TestBed.inject(ConfirmaElDeposito).ejecuta()).toBeNull();
    expect(pagos.llamadas).toHaveLength(0);
  });

  it('si falla, lo dice y no vacía la cesta', async () => {
    const { pagos, carrito, estado } = monta();
    estado.fijaDepositoEnCripto({ id: 'c1', idDePedido: 'o1' });
    pagos.error = creaError('conflicto', 'no ha llegado el depósito');

    expect(await TestBed.inject(ConfirmaElDeposito).ejecuta()).toBeNull();
    expect(estado.error()).toBe('no ha llegado el depósito');
    expect(carrito.vaciado).toBe(false);
  });
});

describe('AplicaElReferido', () => {
  it('un código atribuido queda aplicado', async () => {
    monta();

    expect(await TestBed.inject(AplicaElReferido).ejecuta('ANA10')).toBe('aplicado');
  });

  /** Un código que no existe no es un error de la aplicación: es una respuesta que hay que enseñar. */
  it('un código que el servidor no reconoce vuelve como no válido', async () => {
    const { referido } = monta();
    referido.atribuye = false;

    expect(await TestBed.inject(AplicaElReferido).ejecuta('LOQUESEA')).toBe('no-valido');
  });

  it('un fallo de red también se cuenta como no válido, sin romper la compra', async () => {
    const { referido } = monta();
    referido.falla = true;

    expect(await TestBed.inject(AplicaElReferido).ejecuta('ANA10')).toBe('no-valido');
  });

  it('un código en blanco ni se manda', async () => {
    monta();

    expect(await TestBed.inject(AplicaElReferido).ejecuta('   ')).toBe('no-valido');
  });

  it('recuerda el que venía del enlace', () => {
    const { referido } = monta();
    referido.guardado = 'ANA10';

    expect(TestBed.inject(AplicaElReferido).pendiente()).toBe('ANA10');
  });
});

describe('RetiraLoQueYaNoEsta', () => {
  it('quita de la cesta las líneas que el catálogo ya no reconoce', async () => {
    const { carrito, valoracion } = monta();
    carrito.lineas.set([
      { productId: 'p1', variantId: 'v1', slug: 's', titulo: 'T', precioUnitarioOrigen: 1, divisaDeOrigen: 'CNY', cantidad: 1 },
      { productId: 'p2', slug: 's', titulo: 'T', precioUnitarioOrigen: 1, divisaDeOrigen: 'CNY', cantidad: 1 },
    ]);
    valoracion.lineas = [{ productId: 'p1', variantId: 'v1' }];

    expect(await TestBed.inject(RetiraLoQueYaNoEsta).ejecuta()).toBe(1);
    expect(carrito.quitadas).toEqual(['p2']);
  });

  /** Quitar líneas a ciegas sería peor que el problema que se intenta arreglar. */
  it('si la valoración tampoco responde, no toca nada', async () => {
    const { carrito, valoracion } = monta();
    carrito.lineas.set([
      { productId: 'p1', slug: 's', titulo: 'T', precioUnitarioOrigen: 1, divisaDeOrigen: 'CNY', cantidad: 1 },
    ]);
    valoracion.falla = true;

    expect(await TestBed.inject(RetiraLoQueYaNoEsta).ejecuta()).toBe(0);
    expect(carrito.quitadas).toHaveLength(0);
  });

  it('con la cesta vacía no pregunta nada', async () => {
    monta();

    expect(await TestBed.inject(RetiraLoQueYaNoEsta).ejecuta()).toBe(0);
  });
});
