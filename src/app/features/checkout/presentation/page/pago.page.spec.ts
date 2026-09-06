import { Component, signal } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { exito } from '@shared/result/result';
import { LineaDeCarrito } from '@features/cart/domain/model/linea-de-carrito';
import { CARRITO_COMPARTIDO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { CotizacionDeEnvio } from '../../domain/model/cotizacion-de-envio';
import { CARTERA_PORT } from '../../domain/port/cartera.port';
import { COTIZACION_DE_LA_COMPRA_PORT } from '../../domain/port/cotizacion-de-la-compra.port';
import { COBERTURA_DE_ENVIO_PORT, ENVIO_PORT } from '../../domain/port/envio.port';
import {
  METODOS_DE_PAGO_PORT,
  PAGO_CON_TARJETA_GUARDADA_PORT,
  PAGO_PORT,
} from '../../domain/port/pago.port';
import { PASARELA_DE_PAGO_PORT } from '../../domain/port/pasarela-de-pago.port';
import { DIRECCIONES_DE_ENVIO_PORT, PEDIDO_PORT } from '../../domain/port/pedido.port';
import { REFERIDO_PORT } from '../../domain/port/referido.port';
import { CompraStore } from '../../application/state/compra.store';
import { PreparaLaCompra } from '../../application/use-case/prepara-la-compra.use-case';
import { CotizaElEnvio } from '../../application/use-case/cotiza-el-envio.use-case';
import { ValoraLaCompra } from '../../application/use-case/valora-la-compra.use-case';
import { RealizaElPedido } from '../../application/use-case/realiza-el-pedido.use-case';
import { RetiraLoQueYaNoEsta } from '../../application/use-case/retira-lo-que-ya-no-esta.use-case';
import { AplicaElReferido } from '../../application/use-case/aplica-el-referido.use-case';
import { ConfirmaElDeposito } from '../../application/use-case/confirma-el-deposito.use-case';
import { ConsultaLaCobertura } from '../../application/use-case/consulta-la-cobertura.use-case';
import { PreparaLaPasarela } from '../../application/use-case/prepara-la-pasarela.use-case';
import { PagoPage } from './pago.page';

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

function linea(parcial: Partial<LineaDeCarrito> = {}): LineaDeCarrito {
  return {
    productId: 'p1',
    slug: 'gorro',
    titulo: 'Gorro de lana',
    precioUnitarioOrigen: 10,
    divisaDeOrigen: 'CNY',
    cantidad: 2,
    ...parcial,
  };
}

const DIRECCION = {
  id: 'd1',
  nombreCompleto: 'Ana Ruiz',
  linea1: 'Mayor 1',
  ciudad: 'Madrid',
  pais: 'ES',
  porDefecto: true,
};

interface Opciones {
  lineas?: LineaDeCarrito[];
  cotizacion?: CotizacionDeEnvio;
  saldoCentimos?: number;
}

async function monta(opciones: Opciones = {}) {
  const carrito = {
    lineas: signal<readonly LineaDeCarrito[]>(opciones.lineas ?? [linea()]),
    cambiaCantidad: vi.fn(),
    quita: vi.fn(),
    vacia: vi.fn(),
  };
  const pedidos = { crea: vi.fn().mockResolvedValue(exito({ id: 'o1' })) };
  const pagos = {
    inicia: vi.fn().mockResolvedValue(exito({ id: 'c1', idDePedido: 'o1' })),
    confirma: vi.fn().mockResolvedValue(exito(undefined)),
    confirmaSimulado: vi.fn().mockResolvedValue(exito(undefined)),
  };
  const cotizacion: CotizacionDeEnvio = opciones.cotizacion ?? {
    cubierto: true,
    totalFormateado: '129,72 €',
    totalCentimosUsd: 14000,
    envioBaseFormateado: '13,30 €',
    opciones: [],
    opcionCotizada: 'FZZXR',
  };

  const vista = await render(PagoPage, {
    // El bloque del método de pago es `@defer (on interaction)`. `@testing-library/angular` monta los
    // diferidos en modo «manual» por su cuenta —no hereda el «adelante» que trae el banco de pruebas de
    // Angular—, y así el gesto no dispara nada y el selector no llega nunca. Con `Playthrough` el
    // disparo ocurre de verdad, que es justo lo que esta pantalla tiene que demostrar: antes de tocarlo
    // no se descarga, al tocarlo sí.
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: CARRITO_COMPARTIDO_PORT, useValue: carrito },
      { provide: ENVIO_PORT, useValue: { cotiza: async () => exito(cotizacion) } },
      { provide: COBERTURA_DE_ENVIO_PORT, useValue: { paises: async () => exito([]), regiones: async () => exito([]) } },
      { provide: PEDIDO_PORT, useValue: pedidos },
      { provide: DIRECCIONES_DE_ENVIO_PORT, useValue: { lista: async () => exito([DIRECCION]), crea: async () => exito(DIRECCION) } },
      { provide: CARTERA_PORT, useValue: { saldo: async () => exito({ disponibleCentimosUsd: opciones.saldoCentimos ?? 100, disponibleFormateado: '1,00 $' }) } },
      { provide: METODOS_DE_PAGO_PORT, useValue: { guardados: async () => exito([]), configuracion: async () => exito({ habilitada: false }) } },
      { provide: PAGO_PORT, useValue: pagos },
      { provide: PAGO_CON_TARJETA_GUARDADA_PORT, useValue: { cobra: vi.fn(), confirma: vi.fn() } },
      { provide: PASARELA_DE_PAGO_PORT, useValue: { prepara: async () => exito(undefined), autentica: async () => exito(undefined), abre: vi.fn() } },
      { provide: COTIZACION_DE_LA_COMPRA_PORT, useValue: { valora: async () => exito({ lineas: [{ productId: 'p1', unitarioFormateado: '0,14 €', totalDeLineaFormateado: '13,80 €' }], subtotalFormateado: '13,80 €' }) } },
      { provide: REFERIDO_PORT, useValue: { pendiente: () => null, aplica: async () => exito(true) } },
      CompraStore,
      PreparaLaCompra,
      PreparaLaPasarela,
      CotizaElEnvio,
      ValoraLaCompra,
      RealizaElPedido,
      RetiraLoQueYaNoEsta,
      AplicaElReferido,
      ConfirmaElDeposito,
      ConsultaLaCobertura,
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista, carrito, pedidos, pagos, estado: TestBed.inject(CompraStore) };
}

describe('PagoPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('sin nada que comprar invita al catálogo en vez de enseñar un pago vacío', async () => {
    await monta({ lineas: [] });

    expect(screen.getByRole('link', { name: 'Ver catálogo' })).toBeInTheDocument();
  });

  it('elige sola la dirección predeterminada y con ella cotiza el envío', async () => {
    const { estado } = await monta();

    expect(estado.direccionElegida()).toBe('d1');
    expect(estado.paisDeEnvio()).toBe('ES');
    expect(screen.getByText('129,72 €')).toBeInTheDocument();
  });

  it('los importes de las líneas son los que escribe el servidor', async () => {
    await monta();

    // Con una sola línea, el subtotal del resumen repite el mismo importe: buscar «13,80 €» en toda la
    // página encuentra dos. Se mira DENTRO del apartado de productos, que es donde vive la línea y lo
    // que esta prueba quiere comprobar.
    const productos = screen.getByRole('heading', { name: /Productos/ }).closest('section')!;

    expect(within(productos).getByText(/0,14 €/)).toBeInTheDocument();
    expect(within(productos).getByText('13,80 €')).toBeInTheDocument();
  });

  /**
   * Cuando el destino no admite el importe, el aviso pide reducir el pedido: pedir una acción donde no se
   * puede ejecutar es la peor forma de bloquear una compra.
   */
  it('se puede ajustar la cantidad SIN salir del pago', async () => {
    const { carrito } = await monta();

    await userEvent.click(screen.getByRole('button', { name: 'Añadir una unidad' }));

    expect(carrito.cambiaCantidad).toHaveBeenCalled();
  });

  /**
   * En el pago, a diferencia de la cesta, el botón de bajar nace APAGADO cuando el mínimo lo impide
   * (`[disabled]="!puedeBajar(linea)"` en `lineas-de-la-compra`). Lo que hay que garantizar aquí es que
   * el mínimo NO se aplica a la fuerza: pulsar no baja la cantidad ni toca la cesta.
   */
  it('el pedido mínimo no se aplica a la fuerza: el control queda apagado', async () => {
    const { carrito, vista } = await monta({ lineas: [linea({ cantidad: 3, pedidoMinimo: 3 })] });

    const bajar = screen.getByRole('button', { name: 'Quitar una unidad' });
    expect(bajar).toBeDisabled();

    await userEvent.click(bajar);
    vista.fixture.detectChanges();

    expect(carrito.cambiaCantidad).not.toHaveBeenCalled();
  });

  /**
   * El camino que la pantalla SÍ deja intentar es sacar la línea entera. Con dos variantes del mismo
   * producto, quitar una dejaría al producto por debajo de su mínimo: entonces no se hace en silencio,
   * se explica.
   */
  it('sacar una línea que dejaría el producto corto se explica', async () => {
    const { carrito, vista } = await monta({
      lineas: [
        linea({ variantId: 'M', cantidad: 3, pedidoMinimo: 5 }),
        linea({ variantId: 'L', cantidad: 2, pedidoMinimo: 5 }),
      ],
    });

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    vista.fixture.detectChanges();

    expect(carrito.quita).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  /** El rótulo tiene que decir que SE PAGA: si no, quien compra no queda obligado por el pedido. */
  it('el botón dice inequívocamente que se paga, y el aviso legal va pegado a él', async () => {
    const vista = (await monta()).vista;

    const boton = screen.getByRole('button', { name: 'Pedido con obligación de pago' });
    expect(boton).toBeInTheDocument();
    expect(vista.fixture.nativeElement.textContent).toMatch(/desistimiento|condiciones/i);
    expect(screen.getByRole('link', { name: 'Términos' })).toBeInTheDocument();
  });

  it('pagar crea el pedido, lo cobra y lleva al pedido con la cesta ya vacía', async () => {
    const { pedidos, pagos, carrito, vista } = await monta();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');

    await userEvent.click(screen.getByRole('button', { name: 'Pedido con obligación de pago' }));
    await vista.fixture.whenStable();

    expect(pedidos.crea).toHaveBeenCalledTimes(1);
    expect(pagos.inicia).toHaveBeenCalled();
    expect(carrito.vacia).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/orders', 'o1'], { queryParams: { placed: 1, paid: 1 } });
  });

  /** Dejar pagar aquí crea un cobro que después hay que devolver a mano. */
  it('un destino bloqueado por aduana impide pagar y lo explica', async () => {
    await monta({
      cotizacion: { cubierto: true, aduanaBloqueada: true, limiteDeAduana: '150 EUR', totalFormateado: '1,00 €' },
    });

    expect(screen.getByRole('button', { name: 'Pedido con obligación de pago' })).toBeDisabled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('un país sin cobertura tampoco deja pagar', async () => {
    await monta({ cotizacion: { cubierto: false } });

    expect(screen.getByRole('button', { name: 'Pedido con obligación de pago' })).toBeDisabled();
  });

  /** El saldo y el total se comparan en la MISMA unidad: céntimos de dólar del servidor. */
  it('con el monedero elegido y saldo corto, no deja pagar y dice por qué', async () => {
    const { estado, vista } = await monta({ saldoCentimos: 100 });

    estado.eligeMetodo('wallet', 'WALLET', null);
    vista.fixture.detectChanges();

    expect(screen.getByRole('button', { name: 'Pedido con obligación de pago' })).toBeDisabled();
    expect(vista.fixture.nativeElement.textContent).toContain('Saldo insuficiente');
  });

  it('con saldo de sobra, el monedero sí deja pagar', async () => {
    const { estado, vista } = await monta({ saldoCentimos: 999999 });

    estado.eligeMetodo('wallet', 'WALLET', null);
    vista.fixture.detectChanges();

    expect(screen.getByRole('button', { name: 'Pedido con obligación de pago' })).not.toBeDisabled();
  });

  /**
   * El guion de la pasarela es un fichero externo pesado. Quien paga con saldo no tiene por qué
   * descargarlo: el bloque del método de pago espera a un gesto.
   */
  it('el método de pago no se carga hasta que se toca, y el marcador dice cuál está elegido', async () => {
    await monta();

    expect(screen.queryByRole('button', { name: 'PayPal' })).toBeNull();
    const marcador = screen.getByRole('button', { name: 'Método de pago' });
    expect(marcador).toHaveTextContent('Tarjeta de crédito / débito');

    await userEvent.click(marcador);

    // El bloque diferido baja su código al tocarlo, así que el selector llega un instante DESPUÉS del
    // gesto: `findByRole` espera a que aparezca en vez de mirar el DOM justo en ese momento.
    expect(await screen.findByRole('button', { name: 'PayPal' })).toBeInTheDocument();
  });

  it('el cupón solo viaja al pulsar aplicar', async () => {
    const { estado, vista } = await monta();

    const campo = screen.getByPlaceholderText('Código de descuento');
    await userEvent.type(campo, 'verano10');
    vista.fixture.detectChanges();
    expect(estado.cupon()).toBe('');

    // «Aplicar» lo llevan dos botones: el del cupón y el del referido. Se busca dentro del bloque del
    // cupón para no pulsar el que no es.
    const bloqueDelCupon = campo.closest('div')!;
    await userEvent.click(within(bloqueDelCupon).getByRole('button', { name: 'Aplicar' }));
    vista.fixture.detectChanges();

    expect(estado.cupon()).toBe('VERANO10');
  });
});
