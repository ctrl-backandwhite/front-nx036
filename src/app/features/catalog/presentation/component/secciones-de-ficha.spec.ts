import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FichaDeProducto } from '../../domain/model/producto';
import { AdvertenciasSeguridad, IdentidadCumplimiento } from './cumplimiento-producto';
import { BasculaVariantes } from './bascula-variantes';
import { BloquePrecio } from './bloque-precio';
import { PestanasFicha } from './pestanas-ficha';

function ficha(cambios: Partial<FichaDeProducto> = {}): FichaDeProducto {
  return {
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro',
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: {},
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    origen: '1688',
    idExterno: '1',
    moq: 1,
    numeroDeResenas: 0,
    imagenes: [],
    variantes: [],
    ejesDeVariante: [],
    tramosDePrecio: [],
    especificaciones: [],
    atributos: {},
    ...cambios,
  };
}

describe('AdvertenciasSeguridad', () => {
  /** El art. 19.d pide que la advertencia se muestre en la OFERTA, no en una página legal. */
  it('pinta las advertencias del producto', async () => {
    await render(AdvertenciasSeguridad, {
      inputs: { cumplimiento: { advertencias: ['No apto para menores de 3 años'] } },
    });
    expect(screen.getByText('No apto para menores de 3 años')).toBeInTheDocument();
  });

  it('sin advertencias no ocupa sitio', async () => {
    const { container } = await render(AdvertenciasSeguridad, {
      inputs: { cumplimiento: { advertencias: [] } },
    });
    expect(container.textContent?.trim()).toBe('');
  });
});

describe('IdentidadCumplimiento', () => {
  it('publica el fabricante y el operador de la Unión', async () => {
    await render(IdentidadCumplimiento, {
      inputs: {
        cumplimiento: {
          advertencias: [],
          fabricante: 'Fábrica S.L.',
          operadorEuropeo: {
            nombre: 'Representante UE',
            direccion: 'Calle 1',
            ciudad: 'Madrid',
            pais: 'ES',
            email: 'ue@ejemplo.com',
            papel: 'Importador',
          },
        },
      },
    });
    expect(screen.getByText('Fábrica S.L.')).toBeInTheDocument();
    expect(screen.getByText('ue@ejemplo.com')).toBeInTheDocument();
  });

  /** Un dato de cumplimiento fingido es peor que uno ausente: el ausente se ve y se corrige. */
  it('cuando falta el fabricante lo dice, no lo disimula', async () => {
    const { container } = await render(IdentidadCumplimiento, {
      inputs: {
        cumplimiento: {
          advertencias: [],
          operadorEuropeo: {
            nombre: 'Representante UE',
            direccion: 'Calle 1',
            ciudad: 'Madrid',
            pais: 'ES',
            email: 'ue@ejemplo.com',
            papel: '',
          },
        },
      },
    });
    // El texto sale del diccionario: lo que se comprueba es que NO se pinta una dirección inventada.
    expect(container.querySelectorAll('address')).toHaveLength(1);
    expect(container.textContent).toContain('Representante UE');
  });

  it('sin ningún dato no se pinta la sección', async () => {
    const { container } = await render(IdentidadCumplimiento, {
      inputs: { cumplimiento: { advertencias: [] } },
    });
    expect(container.textContent?.trim()).toBe('');
  });
});

describe('BasculaVariantes', () => {
  it('sin datos lo dice en vez de enseñar una tabla vacía', async () => {
    const { container } = await render(BasculaVariantes, { inputs: { ficha: ficha() } });
    expect(container.querySelector('table')).toBeNull();
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  /** Sin el cruce con las opciones, la tabla enseñaba los colores en chino. */
  it('traduce el valor de la variante con las opciones del producto', async () => {
    const conBascula = ficha({
      variantes: [
        {
          id: 'v',
          existencias: 1,
          opciones: { Color: '黑色' },
          activa: true,
          pesoGramos: 250,
          largoMm: 100,
          anchoMm: 100,
          altoMm: 100,
        },
      ],
      ejesDeVariante: [
        {
          id: 'color',
          nombreZh: '颜色',
          nombre: 'Color',
          posicion: 0,
          valores: [{ id: '1', valorZh: '黑色', valorLocalizado: 'Negro', posicion: 0 }],
        },
      ],
    });
    await render(BasculaVariantes, { inputs: { ficha: conBascula } });
    expect(screen.getByText('Negro')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
  });
});

describe('BloquePrecio', () => {
  it('pinta el precio destacado y el pedido mínimo', async () => {
    await render(BloquePrecio, {
      inputs: { destacado: { importe: 9, divisa: 'EUR', formateado: '9,00 €' }, moq: 6 },
    });
    expect(screen.getByText('9,00 €')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  /** Componer el importe aquí enseñaría un número que el pedido no va a cobrar. */
  it('sin cadena del backend pinta un guión', async () => {
    await render(BloquePrecio, { inputs: { destacado: { importe: null, divisa: 'EUR' } } });
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('PestanasFicha', () => {
  it('ofrece las cinco secciones de la ficha', async () => {
    await render(PestanasFicha);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
  });

  /**
   * No ocultan contenido: todas las secciones están siempre en la página. Es lo que permite buscar
   * dentro con el navegador y que un enlace a una sección concreta funcione.
   */
  it('pulsar una pestaña la marca y lleva a su sección', async () => {
    const seccion = document.createElement('section');
    seccion.id = 'tab-packing';
    seccion.scrollIntoView = vi.fn();
    document.body.appendChild(seccion);

    const vista = await render(PestanasFicha);
    await userEvent.click(screen.getAllByRole('tab')[2]);
    vista.fixture.detectChanges();

    expect(screen.getAllByRole('tab')[2]).toHaveAttribute('aria-selected', 'true');
    expect(seccion.scrollIntoView).toHaveBeenCalled();
    seccion.remove();
  });
});
