import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';
import { CatalogoAdminStore } from '../../../../application/catalogo/state/catalogo-admin.store';
import { FichaDeProducto, TramoDePrecio } from '../../../../domain/catalogo/model/ficha-de-producto';
import { PreciosDeFicha } from './precios-de-ficha';

/** El mismo texto que ve quien administra, con la cadena de respaldo del servicio de traducción. */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;

function tramo(cantidadMinima: number, recargoCny?: number | null): TramoDePrecio {
  return { cantidadMinima, cantidadMaxima: null, precioUnitario: 12.5, divisa: 'CNY', recargoCny };
}

function ficha(tramos: readonly TramoDePrecio[]): FichaDeProducto {
  return {
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro',
    tituloZh: '帽子',
    origen: '1688',
    idExterno: '1688-1',
    estado: 'ACTIVE',
    moq: 1,
    divisa: 'CNY',
    ventasMensuales: 0,
    yuanes: {},
    yuanesFormateados: {},
    imagenes: [],
    variantes: [],
    ejes: [],
    tramos,
    titulosPorIdioma: {},
  };
}

/** El formateo del equivalente lo hace el almacén; aquí solo estorba, así que se responde fijo. */
const ALMACEN = { provide: CatalogoAdminStore, useValue: { formatea: () => '1,50 €' } };

async function monta(tramos: readonly TramoDePrecio[]) {
  document.cookie = 'nx036-locale=es; Path=/';
  const cambiaRecargoDeTramo = vi.fn();
  const vista = await render(PreciosDeFicha, {
    inputs: { ficha: ficha(tramos) },
    on: { cambiaRecargoDeTramo },
    providers: [ALMACEN],
  });
  return { vista, cambiaRecargoDeTramo };
}

/** La casilla de recargo de un tramo, por su rótulo accesible. */
function casillaDe(cantidadMinima: number): HTMLInputElement {
  const casillas = screen.getAllByLabelText(t('admin.catalog.detail.tiers.surcharge'));
  const casilla = casillas.find((c) => c.id === `recargo-${cantidadMinima}`);
  expect(casilla, `no hay casilla de recargo para el tramo ${cantidadMinima}`).toBeTruthy();
  return casilla as HTMLInputElement;
}

/**
 * El recargo por tramo (23-sep-2026).
 *
 * <p>Antes había UN recargo para todo el producto y se cobraba igual a quien se lleva una unidad que a
 * quien se lleva diez mil. Lo que cubre —la gestión de la compra, el manipulado, la parte fija del
 * despacho— no crece con la cantidad, así que repetirlo encarecía el pedido grande justo donde la
 * tabla de cantidades promete lo contrario. El envío y el arancel siguen siendo uno por producto.
 */
describe('PreciosDeFicha · recargo por tramo', () => {
  it('pinta una casilla de recargo por cada tramo, con el suyo dentro', async () => {
    await monta([tramo(1, 3), tramo(200, 1.5)]);

    expect(casillaDe(1).value).toBe('3');
    expect(casillaDe(200).value).toBe('1.5');
  });

  /**
   * Vacío NO es cero: la casilla en blanco significa que el tramo hereda el recargo del producto, y un
   * 0 escrito es un recargo de cero. Enseñar un 0 donde nadie lo ha puesto haría creer que el tramo ya
   * tiene recargo propio.
   */
  it('un tramo sin recargo propio deja la casilla vacía, no a cero', async () => {
    await monta([tramo(1, null)]);

    expect(casillaDe(1).value).toBe('');
    expect(casillaDe(1).placeholder).toBe(t('admin.catalog.detail.tiers.surcharge_inherits'));
  });

  it('al salir de la casilla manda el recargo del tramo que se tocó', async () => {
    const { cambiaRecargoDeTramo } = await monta([tramo(1, 3), tramo(200, 1.5)]);

    const casilla = casillaDe(200);
    await userEvent.clear(casilla);
    await userEvent.type(casilla, '0.8');
    await userEvent.tab();

    expect(cambiaRecargoDeTramo).toHaveBeenCalledWith({ cantidadMinima: 200, recargoCny: 0.8 });
  });

  /** Vaciar la casilla es una decisión: devuelve el tramo a heredar el recargo del producto. */
  it('vaciar la casilla manda nulo, no cero', async () => {
    const { cambiaRecargoDeTramo } = await monta([tramo(1, 3)]);

    const casilla = casillaDe(1);
    await userEvent.clear(casilla);
    await userEvent.tab();

    expect(cambiaRecargoDeTramo).toHaveBeenCalledWith({ cantidadMinima: 1, recargoCny: null });
  });

  /**
   * Pasar por la casilla sin tocarla no debe guardar nada: cada guardado recalcula el precio del tramo
   * y recarga la ficha entera, así que un viaje de más se nota.
   */
  it('no manda nada si el recargo no ha cambiado', async () => {
    const { cambiaRecargoDeTramo } = await monta([tramo(1, 3)]);

    await userEvent.click(casillaDe(1));
    await userEvent.tab();

    expect(cambiaRecargoDeTramo).not.toHaveBeenCalled();
  });

  /** Un recargo negativo restaría del precio de venta, que es justo lo contrario de lo que es. */
  it('un recargo negativo no se manda', async () => {
    const { cambiaRecargoDeTramo } = await monta([tramo(1, 3)]);

    const casilla = casillaDe(1);
    await userEvent.clear(casilla);
    await userEvent.type(casilla, '-2');
    await userEvent.tab();

    expect(cambiaRecargoDeTramo).not.toHaveBeenCalled();
  });
});
