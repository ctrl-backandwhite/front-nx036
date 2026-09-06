import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { LineaDeCarrito } from '../../domain/model/linea-de-carrito';
import { VistaDeCotizacion } from '../../application/use-case/cotiza-el-carrito.use-case';
import { AccionesDeLinea } from '../acciones-de-linea';
import { ListaGuardada } from './lista-guardada';

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

function linea(parcial: Partial<LineaDeCarrito> = {}): LineaDeCarrito {
  return {
    productId: 'p1',
    slug: 'bufanda',
    titulo: 'Bufanda',
    precioUnitarioOrigen: 10,
    divisaDeOrigen: 'CNY',
    cantidad: 2,
    ...parcial,
  };
}

const COTIZACION = {
  cargando: () => false,
  subtotal: () => '29,80 €',
  pesoTotal: () => null,
  pesoIncompleto: () => false,
  unitario: () => '14,90 €',
  totalDeLinea: () => '29,80 €',
  pesoDeLinea: () => null,
} as unknown as VistaDeCotizacion;

const ACCIONES = {
  devuelveALaCesta: vi.fn(),
  eliminaGuardada: vi.fn(),
};

async function monta(enLaCuenta: boolean) {
  return render(ListaGuardada, {
    inputs: { lineas: [linea()], cotizacion: COTIZACION, enLaCuenta },
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: AccionesDeLinea, useValue: ACCIONES },
    ],
  });
}

describe('ListaGuardada', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
    ACCIONES.devuelveALaCesta.mockReset();
    ACCIONES.eliminaGuardada.mockReset();
  });

  it('enseña lo apartado con su precio y su cantidad', async () => {
    await monta(true);

    expect(screen.getByRole('link', { name: 'Bufanda' })).toBeInTheDocument();
    expect(screen.getByText(/14,90 €/)).toBeInTheDocument();
  });

  /**
   * Sin sesión la lista vive solo en este navegador. Quien no lo sepa la da por perdida al cambiar de
   * equipo — o peor, cuenta con ella y no está.
   */
  it('dice DÓNDE está guardado, según haya sesión o no', async () => {
    const vista = await monta(true);
    expect(vista.fixture.nativeElement.textContent).toMatch(/cuenta/i);

    // Un segundo `render` en la misma prueba revienta: el TestBed ya está instanciado y no admite otra
    // configuración. Se cambia la entrada sobre el mismo montaje, que además es lo que ocurre de verdad
    // cuando alguien inicia sesión con la lista delante.
    await vista.rerender({ inputs: { lineas: [linea()], cotizacion: COTIZACION, enLaCuenta: false } });
    expect(vista.fixture.nativeElement.textContent).toMatch(/navegador/i);
  });

  it('se puede devolver a la cesta y eliminar, con nombre accesible en el borrado', async () => {
    const vista = await monta(true);

    await userEvent.click(screen.getByRole('button', { name: /Mover al carrito/ }));
    expect(ACCIONES.devuelveALaCesta).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(ACCIONES.eliminaGuardada).toHaveBeenCalled();

    vista.fixture.destroy();
  });
});
