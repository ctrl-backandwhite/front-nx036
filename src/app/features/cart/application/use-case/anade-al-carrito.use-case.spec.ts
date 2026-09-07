import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { LineaDeCarrito } from '../../domain/model/linea-de-carrito';
import { CARRITO_REMOTO_PORT, CarritoRemotoPort } from '../../domain/port/carrito.port';
import {
  FICHA_PARA_ANADIR_PORT,
  FichaParaAnadir,
  FichaParaAnadirPort,
} from '../../domain/port/ficha-para-anadir.port';
import { CarritoStore } from '../state/carrito.store';
import { SincronizadorDelCarrito } from '../state/sincronizador-del-carrito';
import { AnadeAlCarrito } from './anade-al-carrito.use-case';

class FichaFalsa implements FichaParaAnadirPort {
  respuesta: FichaParaAnadir | null = {
    pedidoMinimo: 1,
    precioMostrado: 14.9,
    divisaMostrada: 'EUR',
    variantes: [],
  };
  slugPedido = '';
  idiomaPedido = '';

  async consulta(slug: string, idioma: string): Promise<Result<FichaParaAnadir, AppError>> {
    this.slugPedido = slug;
    this.idiomaPedido = idioma;
    return this.respuesta ? exito(this.respuesta) : fallo(creaError('sin-conexion'));
  }
}

class RemotoQueCalla implements CarritoRemotoPort {
  async consulta() {
    return exito<readonly LineaDeCarrito[]>([]);
  }
  async guarda() {
    return exito<readonly LineaDeCarrito[]>([]);
  }
  async quita() {
    return exito<readonly LineaDeCarrito[]>([]);
  }
  async fusiona() {
    return exito<readonly LineaDeCarrito[]>([]);
  }
  async vacia() {
    return exito<readonly LineaDeCarrito[]>([]);
  }
}

function monta() {
  const ficha = new FichaFalsa();
  TestBed.configureTestingModule({
    providers: [
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: FICHA_PARA_ANADIR_PORT, useValue: ficha },
      { provide: CARRITO_REMOTO_PORT, useClass: RemotoQueCalla },
      SincronizadorDelCarrito,
      AnadeAlCarrito,
    ],
  });
  return { ficha, caso: TestBed.inject(AnadeAlCarrito), estado: TestBed.inject(CarritoStore) };
}

const producto = { id: 'p1', slug: 'gorro-de-lana', titulo: 'Gorro de lana' };

describe('AnadeAlCarrito', () => {
  /** Por las sugerencias del asistente no viaja ningún importe: el precio sale de la ficha al añadir. */
  it('sin precio propio toma el de VENTA de la ficha, con su divisa', async () => {
    const { caso, estado } = monta();

    const resultado = await caso.ejecuta(producto);

    expect(resultado.estado).toBe('anadido');
    expect(estado.lineas()[0].precioUnitarioMostrado).toBe(14.9);
    expect(estado.lineas()[0].divisaMostrada).toBe('EUR');
    expect(estado.lineas()[0].divisaDeOrigen).toBe('EUR');
  });

  it('con precio propio no lo pisa con el de la ficha', async () => {
    const { caso, estado } = monta();

    await caso.ejecuta({ ...producto, precioMostrado: 9.5, divisaMostrada: 'USD' });

    expect(estado.lineas()[0].precioUnitarioMostrado).toBe(9.5);
    expect(estado.lineas()[0].divisaMostrada).toBe('USD');
  });

  it('con variantes coge la primera ACTIVA y con existencias, y compone su etiqueta', async () => {
    const { ficha, caso, estado } = monta();
    ficha.respuesta = {
      pedidoMinimo: 2,
      precioMostrado: 10,
      divisaMostrada: 'EUR',
      variantes: [
        { id: 'v0', existencias: 0, activa: true, opciones: { Color: 'Rojo' } },
        { id: 'v1', existencias: 5, activa: false, opciones: { Color: 'Verde' } },
        { id: 'v2', sku: 'SKU-2', precio: 12, existencias: 3, activa: true, opciones: { Color: 'Negro', Talla: 'M' } },
      ],
    };

    await caso.ejecuta(producto);

    const linea = estado.lineas()[0];
    expect(linea.variantId).toBe('v2');
    expect(linea.sku).toBe('SKU-2');
    expect(linea.etiquetaDeVariante).toBe('Negro / M');
    expect(linea.precioUnitarioOrigen).toBe(12);
    expect(linea.pedidoMinimo).toBe(2);
  });

  /** Añadir a ciegas acaba en pedidos con la talla equivocada. */
  it('si el producto tiene variantes y ninguna queda, NO se añade', async () => {
    const { ficha, caso, estado } = monta();
    ficha.respuesta = {
      pedidoMinimo: 1,
      variantes: [{ id: 'v1', existencias: 0, activa: true, opciones: {} }],
    };

    const resultado = await caso.ejecuta(producto);

    expect(resultado.estado).toBe('sin-existencias');
    expect(estado.lineas()).toHaveLength(0);
  });

  it('si la ficha no responde se añade sin variante: es preferible a perder la venta', async () => {
    const { ficha, caso, estado } = monta();
    ficha.respuesta = null;

    const resultado = await caso.ejecuta({ ...producto, precioMostrado: 7, divisaMostrada: 'EUR' });

    expect(resultado.estado).toBe('anadido');
    expect(estado.lineas()[0].variantId).toBeUndefined();
  });

  /** Con pedido mínimo mayor que uno, la segunda unidad no es una decisión de quien compra. */
  it('sugiere el ahorro de envío SOLO con pedido mínimo de una unidad', async () => {
    const { ficha, caso } = monta();

    expect((await caso.ejecuta(producto)).sugiereAhorroDeEnvio).toBe(true);

    ficha.respuesta = { pedidoMinimo: 5, variantes: [] };
    expect((await caso.ejecuta(producto)).sugiereAhorroDeEnvio).toBe(false);
  });

  it('una variante sin ejes no inventa etiqueta', async () => {
    const { ficha, caso, estado } = monta();
    ficha.respuesta = {
      pedidoMinimo: 1,
      variantes: [{ id: 'v1', existencias: 2, activa: true, opciones: {} }],
    };

    await caso.ejecuta(producto);

    expect(estado.lineas()[0].etiquetaDeVariante).toBeUndefined();
  });

  it('sin divisa por ninguna parte se cae a dólares, nunca a una divisa vacía', async () => {
    const { ficha, caso, estado } = monta();
    ficha.respuesta = { pedidoMinimo: 1, variantes: [] };

    await caso.ejecuta(producto);

    expect(estado.lineas()[0].divisaDeOrigen).toBe('USD');
  });

  it('añadir dos veces lo mismo consolida en una línea', async () => {
    const { caso, estado } = monta();

    await caso.ejecuta(producto);
    await caso.ejecuta(producto);

    expect(estado.lineas()).toHaveLength(1);
    expect(estado.lineas()[0].cantidad).toBe(2);
  });

  it('pide la ficha en el idioma activo', async () => {
    const { ficha, caso } = monta();

    await caso.ejecuta(producto);

    expect(ficha.slugPedido).toBe('gorro-de-lana');
    expect(ficha.idiomaPedido).toBeTruthy();
  });

  /**
   * Quien añade DESDE LA FICHA ya ha elegido color, talla y unidades. Volver a resolverlo aquí sería
   * pedir la ficha para redescubrir lo que se acaba de decidir —una espera antes de que la cesta se
   * mueva— y, si esa variante se hubiera agotado entretanto, el resolutor elegiría OTRA: a la cesta
   * iría una talla que nadie pidió.
   */
  it('con la elección hecha respeta variante y unidades, y NO vuelve a pedir la ficha', async () => {
    const { ficha, caso, estado } = monta();

    const resultado = await caso.ejecuta({
      ...producto,
      precioMostrado: 9.9,
      divisaMostrada: 'EUR',
      eleccion: {
        varianteId: 'v7',
        sku: 'SKU-7',
        etiquetaDeVariante: 'Negro / L',
        precioUnitario: 12.5,
        cantidad: 4,
        pedidoMinimo: 2,
      },
    });

    expect(resultado.estado).toBe('anadido');
    expect(ficha.slugPedido).toBe('');
    const linea = estado.lineas()[0];
    expect(linea.variantId).toBe('v7');
    expect(linea.sku).toBe('SKU-7');
    expect(linea.etiquetaDeVariante).toBe('Negro / L');
    expect(linea.cantidad).toBe(4);
    expect(linea.pedidoMinimo).toBe(2);
    // El precio de la variante manda sobre el del encabezado, que puede venir de un tramo por cantidad.
    expect(linea.precioUnitarioOrigen).toBe(12.5);
    expect(linea.divisaDeOrigen).toBe('EUR');
  });

  /** Con pedido mínimo mayor que uno, la segunda unidad no es una decisión de quien compra. */
  it('con la elección hecha, el ahorro de envío sigue la regla del pedido mínimo', async () => {
    const { caso } = monta();
    const base = { ...producto, precioMostrado: 5, divisaMostrada: 'EUR' };

    expect(
      (await caso.ejecuta({ ...base, eleccion: { cantidad: 1, pedidoMinimo: 1 } })).sugiereAhorroDeEnvio,
    ).toBe(true);
    expect(
      (await caso.ejecuta({ ...base, eleccion: { cantidad: 1, pedidoMinimo: 5 } })).sugiereAhorroDeEnvio,
    ).toBe(false);
  });
});
