import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { exito } from '@shared/result/result';
import { LineaDeCarrito } from '../../domain/model/linea-de-carrito';
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
import { CajonDelCarrito } from './cajon-del-carrito';

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

const PUERTO_QUE_CALLA = {
  consulta: async () => exito<readonly LineaDeCarrito[]>([]),
  guarda: async () => exito<readonly LineaDeCarrito[]>([]),
  quita: async () => exito<readonly LineaDeCarrito[]>([]),
  fusiona: async () => exito<readonly LineaDeCarrito[]>([]),
  vacia: async () => exito<readonly LineaDeCarrito[]>([]),
};

async function monta(lineas: LineaDeCarrito[] = []) {
  const vista = await render(CajonDelCarrito, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: CARRITO_REMOTO_PORT, useValue: PUERTO_QUE_CALLA },
      { provide: CARRITO_GUARDADO_PORT, useValue: PUERTO_QUE_CALLA },
      {
        provide: COTIZACION_DE_CARRITO_PORT,
        useValue: {
          cotiza: async () =>
            exito({
              lineas: [{ productId: 'p1', totalDeLineaFormateado: '29,80 €' }],
              subtotalFormateado: '29,80 €',
            }),
        },
      },
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
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista, estado };
}

describe('CajonDelCarrito', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('cerrado no pinta nada: no puede tapar la página', async () => {
    await monta([linea()]);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('abierto es un diálogo con nombre, y enseña la cesta', async () => {
    const { estado, vista } = await monta([linea({ cantidad: 2 })]);

    estado.abreCajon();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    expect(screen.getByRole('dialog', { name: 'Tu carrito' })).toBeInTheDocument();
    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
    expect(screen.getAllByText('29,80 €').length).toBeGreaterThan(0);
  });

  it('con la cesta vacía invita a mirar el catálogo', async () => {
    const { estado, vista } = await monta();

    estado.abreCajon();
    vista.fixture.detectChanges();

    expect(screen.getByRole('link', { name: /catálogo|productos|Ver/i })).toBeInTheDocument();
  });

  /** Sin bloquear el desplazamiento, arrastrar dentro del panel mueve la página de detrás. */
  it('mientras está abierto bloquea el desplazamiento del documento, y lo devuelve al cerrar', async () => {
    const { estado, vista } = await monta([linea()]);

    estado.abreCajon();
    vista.fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    estado.cierraCajon();
    vista.fixture.detectChanges();
    expect(document.body.style.overflow).toBe('');
  });

  it('el botón de cerrar tiene nombre accesible y cierra', async () => {
    const { estado, vista } = await monta([linea()]);
    estado.abreCajon();
    vista.fixture.detectChanges();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar carrito' }));
    vista.fixture.detectChanges();

    expect(estado.cajonAbierto()).toBe(false);
  });

  it('apartar una línea la manda a guardados', async () => {
    const { estado, vista } = await monta([linea({ cantidad: 2 })]);
    estado.abreCajon();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    await userEvent.click(screen.getByRole('button', { name: /Guardar para más tarde/ }));
    vista.fixture.detectChanges();

    expect(estado.cuantasGuardadas()).toBe(1);
    expect(estado.lineas()).toHaveLength(0);
  });
});
