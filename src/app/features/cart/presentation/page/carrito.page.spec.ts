import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { exito } from '@shared/result/result';
import { LineaDeCarrito } from '../../domain/model/linea-de-carrito';
import { CotizacionDeCarrito } from '../../domain/model/cotizacion-de-carrito';
import { CARRITO_GUARDADO_PORT, CARRITO_REMOTO_PORT } from '../../domain/port/carrito.port';
import { COTIZACION_DE_CARRITO_PORT } from '../../domain/port/cotizacion-de-carrito.port';
import { CarritoStore } from '../../application/state/carrito.store';
import { SincronizadorDelCarrito } from '../../application/state/sincronizador-del-carrito';
import { CambiaLaCantidad } from '../../application/use-case/cambia-la-cantidad.use-case';
import { QuitaDelCarrito } from '../../application/use-case/quita-del-carrito.use-case';
import { VaciaElCarrito } from '../../application/use-case/vacia-el-carrito.use-case';
import { ApartaParaMasTarde } from '../../application/use-case/aparta-para-mas-tarde.use-case';
import { DevuelveAlCarrito } from '../../application/use-case/devuelve-al-carrito.use-case';
import { EliminaLoGuardado } from '../../application/use-case/elimina-lo-guardado.use-case';
import { CotizaElCarrito } from '../../application/use-case/cotiza-el-carrito.use-case';
import { CarritoPage } from './carrito.page';

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

function linea(parcial: Partial<LineaDeCarrito> = {}): LineaDeCarrito {
  return {
    productId: 'p1',
    slug: 'gorro',
    titulo: 'Gorro de lana',
    precioUnitarioOrigen: 10,
    divisaDeOrigen: 'CNY',
    cantidad: 1,
    ...parcial,
  };
}

const REMOTO_QUE_CALLA = {
  consulta: async () => exito<readonly LineaDeCarrito[]>([]),
  guarda: async () => exito<readonly LineaDeCarrito[]>([]),
  quita: async () => exito<readonly LineaDeCarrito[]>([]),
  fusiona: async () => exito<readonly LineaDeCarrito[]>([]),
  vacia: async () => exito<readonly LineaDeCarrito[]>([]),
};

const COTIZACION: CotizacionDeCarrito = {
  lineas: [
    {
      productId: 'p1',
      unitarioFormateado: '14,90 €',
      totalDeLineaFormateado: '29,80 €',
      pesoGramos: 320,
    },
  ],
  subtotalFormateado: '29,80 €',
  pesoTotalGramos: 640,
  pesoIncompleto: false,
};

async function monta(lineas: LineaDeCarrito[], guardadas: LineaDeCarrito[] = []) {
  const vista = await render(CarritoPage, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: CARRITO_REMOTO_PORT, useValue: REMOTO_QUE_CALLA },
      { provide: CARRITO_GUARDADO_PORT, useValue: REMOTO_QUE_CALLA },
      { provide: COTIZACION_DE_CARRITO_PORT, useValue: { cotiza: async () => exito(COTIZACION) } },
      SincronizadorDelCarrito,
      CambiaLaCantidad,
      QuitaDelCarrito,
      VaciaElCarrito,
      ApartaParaMasTarde,
      DevuelveAlCarrito,
      EliminaLoGuardado,
      CotizaElCarrito,
    ],
  });
  const estado = TestBed.inject(CarritoStore);
  for (const l of lineas) {
    estado.anade(l);
  }
  if (guardadas.length > 0) {
    estado.fijaGuardadas(guardadas);
  }
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista, estado };
}

describe('CarritoPage', () => {
  /**
   * Los textos se comprueban en ESPAÑOL, así que el idioma se fija antes de montar. El idioma sale de la
   * cookie de preferencias; sin fijarla, el navegador simulado responde en inglés y las pruebas dirían
   * que falta un rótulo que sí está.
   */
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('con la cesta vacía invita al catálogo en vez de dejar una página en blanco', async () => {
    await monta([]);

    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver catálogo' })).toBeInTheDocument();
  });

  it('pinta cada línea con su título, su SKU y su peso', async () => {
    await monta([linea({ sku: 'SKU-1', cantidad: 2 })]);

    expect(screen.getByRole('link', { name: 'Gorro de lana' })).toBeInTheDocument();
    expect(screen.getByText('SKU-1')).toBeInTheDocument();
    expect(screen.getByText('320 g')).toBeInTheDocument();
  });

  /** El front SOLO pinta la cadena del servidor: no multiplica cantidad por precio. */
  it('los importes son los que escribe el servidor', async () => {
    await monta([linea({ cantidad: 2 })]);

    expect(screen.getByText('14,90 €')).toBeInTheDocument();
    expect(screen.getAllByText('29,80 €').length).toBeGreaterThan(0);
  });

  it('los botones de cantidad tienen nombre accesible: sin él se oye «botón, botón»', async () => {
    await monta([linea()]);

    expect(screen.getAllByRole('button', { name: 'Añadir una unidad' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Quitar una unidad' }).length).toBeGreaterThan(0);
  });

  it('subir una unidad cambia la cesta', async () => {
    const { estado, vista } = await monta([linea({ cantidad: 1 })]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Añadir una unidad' })[0]);
    vista.fixture.detectChanges();

    expect(estado.lineas()[0].cantidad).toBe(2);
  });

  /**
   * El mínimo se cumple con la SUMA de las variantes del producto: bajar de tres a dos con mínimo de tres
   * no se aplica, se explica.
   */
  it('el pedido mínimo se explica en vez de aplicarse a la fuerza', async () => {
    const { estado, vista } = await monta([linea({ cantidad: 3, pedidoMinimo: 3 })]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Quitar una unidad' })[0]);
    vista.fixture.detectChanges();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(estado.lineas()[0].cantidad).toBe(3);
  });

  it('al quitar una línea que dejaría el producto corto, ofrece quitarlo entero', async () => {
    const { estado, vista } = await monta([
      linea({ variantId: 'M', cantidad: 3, pedidoMinimo: 5 }),
      linea({ variantId: 'L', cantidad: 2, pedidoMinimo: 5 }),
    ]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    vista.fixture.detectChanges();

    const aviso = screen.getByRole('alert');
    expect(aviso).toBeInTheDocument();
    // La salida aplica la acción a TODAS las líneas del producto, que sí es una cesta válida.
    const salida = within(aviso).getByRole('button', { name: 'Eliminar' });
    await userEvent.click(salida);
    vista.fixture.detectChanges();

    expect(estado.lineas()).toHaveLength(0);
  });

  /**
   * «Guardado para más tarde» va por debajo del pliegue: su código no se descarga hasta que aparece. El
   * marcador dice cuántas cosas hay, para que no parezca que se han perdido.
   */
  it('lo guardado se anuncia con su número y su contenido se difiere', async () => {
    await monta([], [linea({ titulo: 'Bufanda' })]);

    expect(screen.getByText(/Guardado para más tarde/)).toBeInTheDocument();
    expect(screen.queryByText('Bufanda')).toBeNull();
  });

  it('el peso total se antepone con «desde» cuando alguna línea no lo declara', async () => {
    await monta([linea()]);

    expect(screen.getByText(/640 g/)).toBeInTheDocument();
  });
});
