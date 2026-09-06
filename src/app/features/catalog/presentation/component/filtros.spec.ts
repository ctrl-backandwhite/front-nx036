import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CRITERIO_VACIO } from '../../domain/model/criterio-de-busqueda';
import { FiltroDesplegable } from './filtro-desplegable';
import { FiltroInterruptor } from './filtro-interruptor';
import { DistintivoFiltro } from './distintivo-filtro';
import { BarraDeFiltros } from './barra-de-filtros';
import { FilaListado } from './fila-listado';
import { CuadriculaProductos } from './cuadricula-productos';
import { HileraDeslizable } from './hilera-deslizable';
import { provideRouter } from '@angular/router';
import { vi as espia } from 'vitest';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { ResumenDeProducto } from '../../domain/model/producto';

/** La cuadrícula monta tarjetas, y una tarjeta habla con tres puertos: aquí van sus dobles. */
const PUERTOS_DE_LA_TARJETA = [
  provideRouter([]),
  { provide: CATALOGO_PORT, useValue: { ficha: espia.fn() } },
  { provide: CESTA_PORT, useValue: { anade: espia.fn(), productosQueLleva: espia.fn() } },
  { provide: FAVORITOS_PORT, useValue: {} },
];

function producto(cambios: Partial<ResumenDeProducto> = {}): ResumenDeProducto {
  return {
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro de lana',
    ventasMensuales: 120,
    estado: 'ACTIVE',
    precio: { formateado: '9,90 €' },
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    ...cambios,
  };
}

describe('FiltroDesplegable', () => {
  it('devuelve nulo al elegir el marcador de «todos»', async () => {
    const vista = await render(FiltroDesplegable, {
      inputs: {
        etiqueta: 'Categoría',
        marcador: 'Todas',
        opciones: [{ valor: 'a', etiqueta: 'Gorros' }],
        valor: 'a',
      },
    });
    await userEvent.selectOptions(screen.getByRole('combobox'), '');
    vista.fixture.detectChanges();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
  });
});

describe('FiltroInterruptor', () => {
  it('se enciende y se apaga', async () => {
    const vista = await render(FiltroInterruptor, { inputs: { etiqueta: 'Envío gratis' } });
    const interruptor = screen.getByRole('switch');
    expect(interruptor).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(interruptor);
    vista.fixture.detectChanges();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});

describe('DistintivoFiltro', () => {
  it('avisa al quitar el filtro', async () => {
    const quita = vi.fn();
    await render(DistintivoFiltro, { inputs: { etiqueta: 'Rebajas' }, on: { quita } });
    await userEvent.click(screen.getByRole('button'));
    expect(quita).toHaveBeenCalled();
  });
});

describe('BarraDeFiltros', () => {
  async function monta(esAdministrador = false) {
    const vista = await render(BarraDeFiltros, {
      inputs: {
        criterio: CRITERIO_VACIO,
        categorias: [
          { id: 'c1', slug: 'gorros', nombre: 'Gorros', posicion: 0, cuantosProductos: 3, hijas: [] },
        ],
        proveedores: [{ id: 's1', slug: 'p', nombre: 'Proveedor' }],
        esAdministrador,
      },
    });
    return { vista };
  }

  it('ofrece las categorías y los proveedores que recibe', async () => {
    await monta();
    expect(screen.getByText('Gorros')).toBeInTheDocument();
    expect(screen.getByText('Proveedor')).toBeInTheDocument();
  });

  /** El backend lo ignora si no es administrador: ofrecerlo sería un control que no hace nada. */
  it('el filtro de revisión manual solo lo ve el administrador', async () => {
    const { vista } = await monta(false);
    const sinAdmin = vista.container.querySelectorAll('select').length;
    await vista.rerender({
      inputs: {
        criterio: CRITERIO_VACIO,
        categorias: [
          { id: 'c1', slug: 'gorros', nombre: 'Gorros', posicion: 0, cuantosProductos: 3, hijas: [] },
        ],
        proveedores: [{ id: 's1', slug: 'p', nombre: 'Proveedor' }],
        esAdministrador: true,
      },
    });
    expect(vista.container.querySelectorAll('select').length).toBe(sinAdmin + 1);
  });

  /** La barra no guarda estado propio: recibe el criterio y devuelve el criterio ENTERO. */
  it('cambiar un filtro devuelve el criterio entero', async () => {
    const { vista } = await monta();
    await userEvent.click(screen.getAllByRole('switch')[0]);
    vista.fixture.detectChanges();
    expect(vista.fixture.componentInstance.criterio().envioGratis).toBe(true);
  });

  it('ofrece limpiar solo cuando hay filtros puestos', async () => {
    const limpia = vi.fn();
    const vista = await render(BarraDeFiltros, {
      inputs: {
        criterio: { ...CRITERIO_VACIO, texto: 'gorro' },
        categorias: [],
        proveedores: [],
      },
      on: { limpia },
    });
    const botones = vista.container.querySelectorAll('button.btn-ghost');
    await userEvent.click(botones[botones.length - 1] as HTMLElement);
    expect(limpia).toHaveBeenCalled();
  });
});

describe('FilaListado', () => {
  it('enseña el precio ya formateado por el backend', async () => {
    await render(FilaListado, {
      inputs: { producto: producto() },
      providers: [provideRouter([])],
    });
    expect(screen.getByText('9,90 €')).toBeInTheDocument();
  });

  it('sin precio de venta pinta un guión, no el coste del proveedor', async () => {
    await render(FilaListado, {
      inputs: { producto: producto({ precio: {} }) },
      providers: [provideRouter([])],
    });
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('CuadriculaProductos', () => {
  it('mientras carga enseña siluetas, no un vacío', async () => {
    const vista = await render(CuadriculaProductos, {
      inputs: { productos: [], cargando: true, cuantosHuecos: 4 },
      providers: [provideRouter([])],
    });
    expect(vista.container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('sin resultados lo dice', async () => {
    const vista = await render(CuadriculaProductos, {
      inputs: { productos: [], cargando: false },
      providers: [provideRouter([])],
    });
    expect(vista.container.querySelector('.card')).not.toBeNull();
  });

  it('con resultados pinta una tarjeta por producto', async () => {
    await render(CuadriculaProductos, {
      inputs: { productos: [producto(), producto({ id: 'p2', slug: 'otro' })] },
      providers: PUERTOS_DE_LA_TARJETA,
    });
    expect(screen.getAllByText('Gorro de lana')).toHaveLength(2);
  });
});

describe('HileraDeslizable', () => {
  /** Sin el indicador, en el móvil no había forma de saber que la fila seguía. */
  it('sin recorrido no pinta indicador', async () => {
    const vista = await render(HileraDeslizable);
    expect(vista.container.querySelectorAll('.bg-brand-500')).toHaveLength(0);
  });
});
