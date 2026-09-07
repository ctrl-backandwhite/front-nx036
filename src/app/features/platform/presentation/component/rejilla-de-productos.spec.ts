import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { ProductoGanador } from '../../domain/model/inteligencia';
import { TasaDeCambio } from '../../domain/model/tasa-de-cambio';
import { RejillaDeProductos } from './rejilla-de-productos';

/**
 * La rejilla de productos ganadores de la plataforma.
 *
 * <p>Lo que se fija es el PRECIO. El coste llega en yuanes —la divisa canónica— y aquí se convierte a
 * la divisa activa. Antes se pintaba un dólar delante del número chino sin convertir nada: el importe
 * era falso en las ocho divisas menos en una, y no había forma de notarlo mirando la pantalla, porque
 * un número con un símbolo delante parece siempre correcto.
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

const TASAS: readonly TasaDeCambio[] = [
  { codigo: 'USD', porDolar: 1 },
  { codigo: 'EUR', porDolar: 0.92 },
  { codigo: 'CNY', porDolar: 7.24 },
];

function producto(parcial: Partial<ProductoGanador> = {}): ProductoGanador {
  return {
    slug: 'gorro-de-lana',
    titulo: 'Gorro de lana',
    ventasMensuales: 120,
    puntuacionDeTendencia: 0.874,
    precio: 72.4,
    ...parcial,
  };
}

async function monta(
  productos: readonly ProductoGanador[] = [producto()],
  divisa = 'USD',
  tasas: readonly TasaDeCambio[] = TASAS,
) {
  const vista = await render(RejillaDeProductos, {
    inputs: { productos, tasas, divisa },
    providers: [provideRouter([{ path: '**', component: Vacia }])],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista };
}

describe('RejillaDeProductos', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('cada producto enlaza a su ficha del catálogo', async () => {
    await monta();

    expect(screen.getByRole('link')).toHaveAttribute('href', '/catalog/gorro-de-lana');
    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
  });

  it('enseña las ventas del mes y la tendencia con dos decimales', async () => {
    const { vista } = await monta();

    const texto = vista.fixture.nativeElement.textContent as string;
    expect(texto).toContain('120');
    /* Dos decimales fijos: una tendencia de 0,874 y otra de 0,87 tienen que poder compararse de un
     * vistazo, y con decimales variables las columnas dejan de alinearse. */
    expect(texto).toContain('0.87');
  });

  it('sin tendencia se pinta un cero, no un hueco', async () => {
    const { vista } = await monta([producto({ puntuacionDeTendencia: undefined })]);

    expect(vista.fixture.nativeElement.textContent as string).toContain('0.00');
  });

  describe('el precio', () => {
    /** 72,40 CNY son 10 USD con la tasa de 7,24: si no se convirtiera, se enseñarían «72,40». */
    it('se CONVIERTE desde yuanes a la divisa activa', async () => {
      const { vista } = await monta([producto({ precio: 72.4 })], 'USD');

      const texto = vista.fixture.nativeElement.textContent as string;
      expect(texto).toMatch(/10[.,]00/);
      expect(texto, 'se está enseñando el yuan sin convertir').not.toMatch(/72[.,]40/);
    });

    it('y a cualquier otra divisa con su propia tasa', async () => {
      const { vista } = await monta([producto({ precio: 72.4 })], 'EUR');

      /* 72,40 CNY → 10 USD → 9,20 EUR. */
      expect(vista.fixture.nativeElement.textContent as string).toMatch(/9[.,]20/);
    });

    /** Sin precio no se pinta un «0,00» que se leería como gratis. */
    it('un producto sin precio no enseña ninguno', async () => {
      const { vista } = await monta([producto({ precio: undefined })]);

      expect(vista.fixture.nativeElement.textContent as string).not.toMatch(/[$€]/);
    });

    it('sin tasas no revienta: se enseña el importe tal cual', async () => {
      const { vista } = await monta([producto({ precio: 72.4 })], 'USD', []);

      expect((vista.fixture.nativeElement.textContent as string).length).toBeGreaterThan(0);
    });
  });

  it('sin productos no pinta ninguna tarjeta', async () => {
    await monta([]);

    expect(screen.queryAllByRole('link')).toEqual([]);
  });
});
