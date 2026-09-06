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
import { APLICACION_DEL_CATALOGO } from '../../catalog.providers';

/** La cuadrícula monta tarjetas, y una tarjeta habla con tres puertos: aquí van sus dobles. */
const PUERTOS_DE_LA_TARJETA = [
  ...APLICACION_DEL_CATALOGO,
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
          {
            id: 'c1',
            slug: 'gorros',
            nombre: 'Gorros',
            posicion: 0,
            cuantosProductos: 3,
            hijas: [],
          },
        ],
        proveedores: [{ id: 's1', slug: 'p', nombre: 'Textiles del Sur' }],
        esAdministrador,
      },
    });
    return { vista };
  }

  it('ofrece las categorías y los proveedores que recibe', async () => {
    await monta();
    expect(screen.getByText('Gorros')).toBeInTheDocument();
    expect(screen.getByText('Textiles del Sur')).toBeInTheDocument();
  });

  /** El backend lo ignora si no es administrador: ofrecerlo sería un control que no hace nada. */
  it('el filtro de revisión manual solo lo ve el administrador', async () => {
    const { vista } = await monta(false);
    const sinAdmin = vista.container.querySelectorAll('select').length;
    await vista.rerender({
      inputs: {
        criterio: CRITERIO_VACIO,
        categorias: [
          {
            id: 'c1',
            slug: 'gorros',
            nombre: 'Gorros',
            posicion: 0,
            cuantosProductos: 3,
            hijas: [],
          },
        ],
        proveedores: [{ id: 's1', slug: 'p', nombre: 'Textiles del Sur' }],
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

  /**
   * Cada control devuelve el criterio ENTERO con su campo cambiado. Se recorren todos porque el fallo
   * típico es que uno se quede sin conectar: no se ve, sencillamente ese filtro no filtra.
   */
  it('cada control escribe su parte del criterio', async () => {
    const { vista } = await monta(true);
    const desplegables = [...vista.container.querySelectorAll<HTMLSelectElement>('select')];
    const valores = ['c1', 's1', 'CN', 'CE', 'true', '4', 'price_asc'];
    for (const [i, valor] of valores.entries()) {
      await userEvent.selectOptions(desplegables[i], valor);
      vista.fixture.detectChanges();
    }
    const criterio = vista.fixture.componentInstance.criterio();
    expect(criterio.categoria).toBe('c1');
    expect(criterio.proveedor).toBe('s1');
    expect(criterio.enviaDesde).toBe('CN');
    expect(criterio.certificacion).toBe('CE');
    expect(criterio.verificado).toBe('true');
    expect(criterio.valoracionMinima).toBe('4');
    expect(criterio.orden).toBe('price_asc');
  });

  /**
   * Los dos eventos, en este orden, son los que dispara un navegador de verdad al teclear y salir del
   * campo: el formulario recoge lo escrito con `input` y la barra lo publica al criterio con `change`.
   */
  it('el rango de precio viaja como texto, tal y como se teclea', async () => {
    const { vista } = await monta();
    const campos = [...vista.container.querySelectorAll<HTMLInputElement>('input[type=number]')];
    campos[0].value = '5';
    campos[0].dispatchEvent(new Event('input'));
    campos[0].dispatchEvent(new Event('change'));
    campos[1].value = '50';
    campos[1].dispatchEvent(new Event('input'));
    campos[1].dispatchEvent(new Event('change'));
    vista.fixture.detectChanges();
    expect(vista.fixture.componentInstance.criterio().precioMinimo).toBe('5');
    expect(vista.fixture.componentInstance.criterio().precioMaximo).toBe('50');
  });

  /**
   * Un precio negativo no existe y solo devolvería la lista entera. Antes no lo decía nadie: el campo
   * lo aceptaba y la búsqueda salía rara sin explicación.
   */
  it('un precio negativo se señala bajo el campo', async () => {
    const { vista } = await monta();
    const campos = [...vista.container.querySelectorAll<HTMLInputElement>('input[type=number]')];
    campos[0].value = '-5';
    campos[0].dispatchEvent(new Event('input'));
    campos[0].dispatchEvent(new Event('blur'));
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('[role=alert]')).not.toBeNull();
  });

  /** Callado hasta que se toca: un filtro recién abierto no tiene nada que reprochar a nadie. */
  it('recién abierta, la barra no acusa a nadie', async () => {
    const { vista } = await monta();
    expect(vista.container.querySelector('[role=alert]')).toBeNull();
  });

  it('el interruptor de vídeo también escribe su parte', async () => {
    const { vista } = await monta();
    await userEvent.click(screen.getAllByRole('switch')[1]);
    vista.fixture.detectChanges();
    expect(vista.fixture.componentInstance.criterio().conVideo).toBe(true);
  });

  /** Vaciar el buscador tiene que dejar el criterio sin texto, no con una cadena vacía puesta. */
  it('vaciar el buscador quita el filtro de texto', async () => {
    const vista = await render(BarraDeFiltros, {
      inputs: {
        criterio: { ...CRITERIO_VACIO, texto: 'gorro' },
        categorias: [],
        proveedores: [],
      },
    });
    const buscador = vista.container.querySelector<HTMLInputElement>('input[type=search]')!;
    await userEvent.clear(buscador);
    vista.fixture.detectChanges();
    await new Promise((sigue) => setTimeout(sigue, 350));
    vista.fixture.detectChanges();
    expect(vista.fixture.componentInstance.criterio().texto).toBeUndefined();
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
      providers: [...APLICACION_DEL_CATALOGO, provideRouter([])],
    });
    expect(screen.getByText('9,90 €')).toBeInTheDocument();
  });

  it('sin precio de venta pinta un guión, no el coste del proveedor', async () => {
    await render(FilaListado, {
      inputs: { producto: producto({ precio: {} }) },
      providers: [...APLICACION_DEL_CATALOGO, provideRouter([])],
    });
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('CuadriculaProductos', () => {
  it('mientras carga enseña siluetas, no un vacío', async () => {
    const vista = await render(CuadriculaProductos, {
      inputs: { productos: [], cargando: true, cuantosHuecos: 4 },
      providers: [...APLICACION_DEL_CATALOGO, provideRouter([])],
    });
    expect(vista.container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('sin resultados lo dice', async () => {
    const vista = await render(CuadriculaProductos, {
      inputs: { productos: [], cargando: false },
      providers: [...APLICACION_DEL_CATALOGO, provideRouter([])],
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

  /**
   * El indicador aparece solo cuando de verdad hay más a los lados, y su posición sigue al
   * desplazamiento: es lo único que dice que la fila continúa, porque la barra va oculta.
   */
  it('con recorrido aparece el indicador y sigue al desplazamiento', async () => {
    const vista = await render(HileraDeslizable);
    const caja = vista.container.querySelector<HTMLElement>('.snap-x')!;
    Object.defineProperty(caja, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(caja, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(caja, 'scrollLeft', { value: 300, configurable: true });

    caja.dispatchEvent(new Event('scroll'));
    vista.fixture.detectChanges();

    const barra = vista.container.querySelector<HTMLElement>('.bg-brand-500');
    expect(barra).not.toBeNull();
    expect(barra?.style.marginLeft).not.toBe('');
  });
});
