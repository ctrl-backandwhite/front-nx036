import { render, screen, waitFor } from '@testing-library/angular';
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
import { ANADIR_AL_CARRITO_PORT } from '@features/cart/domain/port/carrito-compartido.port';

/**
 * La cesta es de OTRO contexto: aquí solo se conoce su puerto público, que es por donde el catálogo mete
 * lo que se añade. Antes escribía por su cuenta contra el backend y la cesta de la aplicación —la que
 * cuenta la insignia y pinta el carrito— no se enteraba; el doble mantiene esa frontera visible.
 */
const CESTA_DE_OTRO_CONTEXTO = {
  provide: ANADIR_AL_CARRITO_PORT,
  useValue: {
    unidades: () => 0,
    anade: async () => ({ estado: 'anadido', sugiereAhorroDeEnvio: false }),
    abreElCajon: () => undefined,
  },
};

/** La cuadrícula monta tarjetas, y una tarjeta habla con tres puertos: aquí van sus dobles. */
const PUERTOS_DE_LA_TARJETA = [
  ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
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

/**
 * Las opciones del panel solo existen con el panel abierto: primero se pulsa el chip.
 *
 * <p>Se ESPERA a que aparezcan en vez de leerlas al momento: el panel se pinta en el ciclo siguiente
 * al clic, y con la máquina cargada ese ciclo llega tarde. Leer sin esperar hacía fallar la prueba una
 * pasada de cada tantas, que es el peor tipo de prueba: la que no dice la verdad ni cuando falla.
 */
async function abre(chip: HTMLElement): Promise<HTMLElement[]> {
  await userEvent.click(chip);
  return waitFor(() => {
    const opciones = [...chip.parentElement!.querySelectorAll<HTMLElement>('[role=option]')];
    if (opciones.length === 0) {
      throw new Error('el panel todavía no está pintado');
    }
    return opciones;
  });
}

/**
 * Se elige por POSICIÓN y no por texto: la opción 0 es siempre «todos» y las demás van en el orden en
 * que se pasaron. Así la prueba no depende de cómo esté traducida cada etiqueta.
 */
async function elige(chip: HTMLElement, posicion: number): Promise<void> {
  const opciones = await abre(chip);
  await userEvent.click(opciones[posicion]);
}

describe('FiltroDesplegable', () => {
  const OPCIONES = [
    { valor: 'a', etiqueta: 'Gorros' },
    { valor: 'b', etiqueta: 'Bufandas' },
  ];

  async function monta(valor: string | null = null) {
    return render(FiltroDesplegable, {
      inputs: { etiqueta: 'Categoría', marcador: 'Todas', opciones: OPCIONES, valor },
    });
  }

  /** El chip es lo único que se ve con el panel cerrado: si no dice qué hay puesto, no dice nada. */
  it('el chip enseña la etiqueta y lo elegido, y se resalta', async () => {
    await monta('a');
    const chip = screen.getByRole('button', { name: 'Categoría' });
    expect(chip.textContent).toContain('Categoría:');
    expect(chip.textContent).toContain('Gorros');
    expect(chip.className).toContain('border-brand-300');
  });

  it('sin filtro puesto enseña el marcador y no se resalta', async () => {
    await monta(null);
    const chip = screen.getByRole('button', { name: 'Categoría' });
    expect(chip.textContent).toContain('Todas');
    expect(chip.className).toContain('border-ink-200');
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    expect(chip).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('abre un panel propio con las opciones y la marca sobre la activa', async () => {
    const vista = await monta('a');
    const chip = screen.getByRole('button', { name: 'Categoría' });
    const opciones = await abre(chip);
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('[role=listbox]')).not.toBeNull();
    expect(opciones).toHaveLength(3);
    expect(opciones[1]).toHaveAttribute('aria-selected', 'true');
    expect(opciones[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('devuelve nulo al elegir el marcador de «todos»', async () => {
    const vista = await monta('a');
    await elige(screen.getByRole('button', { name: 'Categoría' }), 0);
    vista.fixture.detectChanges();
    expect(vista.fixture.componentInstance.valor()).toBeNull();
    expect(vista.container.querySelector('[role=listbox]')).toBeNull();
  });

  it('devuelve el valor de la opción elegida', async () => {
    const vista = await monta(null);
    await elige(screen.getByRole('button', { name: 'Categoría' }), 2);
    vista.fixture.detectChanges();
    expect(vista.fixture.componentInstance.valor()).toBe('b');
  });

  /** Sin esto el panel se quedaba abierto tapando la lista de productos. */
  it('se cierra con Escape', async () => {
    const vista = await monta(null);
    await abre(screen.getByRole('button', { name: 'Categoría' }));
    vista.fixture.detectChanges();
    await userEvent.keyboard('{Escape}');
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('[role=listbox]')).toBeNull();
  });

  it('se cierra al pulsar fuera', async () => {
    const vista = await monta(null);
    await abre(screen.getByRole('button', { name: 'Categoría' }));
    vista.fixture.detectChanges();
    await userEvent.click(document.body);
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('[role=listbox]')).toBeNull();
  });

  /** Con decenas de categorías, recorrer la lista a ojo no es navegar: es rendirse. */
  it('con muchas opciones trae buscador y recorta la lista', async () => {
    const muchas = Array.from({ length: 12 }, (_, i) => ({
      valor: String(i),
      etiqueta: i === 3 ? 'Gorro de lana' : `Cosa ${i}`,
    }));
    const vista = await render(FiltroDesplegable, {
      inputs: { etiqueta: 'Categoría', opciones: muchas, valor: null },
    });
    const chip = screen.getByRole('button', { name: 'Categoría' });
    await abre(chip);
    vista.fixture.detectChanges();
    const buscador = vista.container.querySelector<HTMLInputElement>('[role=listbox] input')!;
    expect(buscador).not.toBeNull();
    await userEvent.type(buscador, 'lana');
    vista.fixture.detectChanges();
    const opciones = [...vista.container.querySelectorAll<HTMLElement>('[role=option]')];
    // La primera sigue siendo «todos»; de las 12 solo queda la que coincide.
    expect(opciones).toHaveLength(2);
    expect(opciones[1].textContent).toContain('Gorro de lana');
  });

  it('con pocas opciones no trae buscador', async () => {
    const vista = await monta(null);
    await abre(screen.getByRole('button', { name: 'Categoría' }));
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('[role=listbox] input')).toBeNull();
  });
});

describe('FiltroInterruptor', () => {
  it('se enciende y se apaga', async () => {
    const vista = await render(FiltroInterruptor, { inputs: { etiqueta: 'Envío gratis' } });
    const interruptor = screen.getByRole('checkbox', { name: 'Envío gratis' });
    expect(interruptor).not.toBeChecked();
    await userEvent.click(interruptor);
    vista.fixture.detectChanges();
    expect(vista.fixture.componentInstance.activo()).toBe(true);
    expect(screen.getByRole('checkbox', { name: 'Envío gratis' })).toBeChecked();
  });

  /** El toggle de daisyUI es lo que hace que se vea como una pastilla y no como un botón suelto. */
  it('es una pastilla con el interruptor de daisyUI dentro', async () => {
    const vista = await render(FiltroInterruptor, {
      inputs: { etiqueta: 'Envío gratis', activo: true },
    });
    const pastilla = vista.container.querySelector('label')!;
    expect(pastilla.className).toContain('rounded-full');
    expect(pastilla.className).toContain('border-primary/40');
    expect(pastilla.querySelector('input.toggle.toggle-primary.toggle-xs')).not.toBeNull();
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

/**
 * El rótulo y el botón de limpiar se buscan por su papel en el marcado y no por su texto: las pruebas
 * corren con el diccionario en inglés, así que cualquier consulta por rótulo traducido es una trampa.
 */
const ROTULO_DE_FILTROS = 'button[aria-controls=filtros-del-catalogo]';
const BOTON_DE_LIMPIAR = '#filtros-del-catalogo > button';

describe('BarraDeFiltros', () => {
  const CATEGORIAS = [
    { id: 'c1', slug: 'gorros', nombre: 'Gorros', posicion: 0, cuantosProductos: 3, hijas: [] },
  ];
  const PROVEEDORES = [{ id: 's1', slug: 'p', nombre: 'Textiles del Sur' }];

  async function monta(esAdministrador = false) {
    const vista = await render(BarraDeFiltros, {
      inputs: {
        criterio: CRITERIO_VACIO,
        categorias: CATEGORIAS,
        proveedores: PROVEEDORES,
        esAdministrador,
      },
    });
    return { vista };
  }

  /** Los chips son lo que se ve: si no hay uno por filtro, ese filtro no existe para quien mira. */
  function chips(vista: { container: HTMLElement }): HTMLElement[] {
    return [...vista.container.querySelectorAll<HTMLElement>('[aria-haspopup=listbox]')];
  }

  it('ofrece las categorías y los proveedores que recibe', async () => {
    const { vista } = await monta();
    const [categoria, proveedor] = chips(vista);
    await abre(categoria);
    vista.fixture.detectChanges();
    expect(screen.getByText('Gorros')).toBeInTheDocument();
    await abre(proveedor);
    vista.fixture.detectChanges();
    expect(screen.getByText('Textiles del Sur')).toBeInTheDocument();
  });

  /** El backend lo ignora si no es administrador: ofrecerlo sería un control que no hace nada. */
  it('el filtro de revisión manual solo lo ve el administrador', async () => {
    const { vista } = await monta(false);
    const sinAdmin = chips(vista).length;
    await vista.rerender({
      inputs: {
        criterio: CRITERIO_VACIO,
        categorias: CATEGORIAS,
        proveedores: PROVEEDORES,
        esAdministrador: true,
      },
    });
    expect(chips(vista).length).toBe(sinAdmin + 1);
  });

  /** La barra no guarda estado propio: recibe el criterio y devuelve el criterio ENTERO. */
  it('cambiar un filtro devuelve el criterio entero', async () => {
    const { vista } = await monta();
    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    vista.fixture.detectChanges();
    expect(vista.fixture.componentInstance.criterio().envioGratis).toBe(true);
  });

  /**
   * Cada control devuelve el criterio ENTERO con su campo cambiado. Se recorren todos porque el fallo
   * típico es que uno se quede sin conectar: no se ve, sencillamente ese filtro no filtra.
   */
  it('cada control escribe su parte del criterio', async () => {
    const { vista } = await monta(true);
    const desplegables = chips(vista);
    // Posición dentro del panel: la 1 es la primera opción de verdad; el orden `price_asc` es la 8.
    const posiciones = [1, 1, 1, 1, 1, 1, 8];
    for (const [i, posicion] of posiciones.entries()) {
      await elige(desplegables[i], posicion);
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

  /** El rango vive dentro de una pastilla con su rótulo, como el resto de los filtros. */
  it('el rango de precio va en una pastilla rotulada', async () => {
    const { vista } = await monta();
    const pastilla = vista.container.querySelector<HTMLElement>('input[type=number]')!.parentElement!;
    expect(pastilla.className).toContain('rounded-full');
    // El rótulo se compara por forma y no por texto: las pruebas corren con el diccionario en inglés.
    expect(pastilla.querySelector('span')!.textContent!.trim()).toMatch(/:$/);
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
    await userEvent.click(screen.getAllByRole('checkbox')[1]);
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
    const { vista } = await monta();
    expect(vista.container.querySelector(BOTON_DE_LIMPIAR)).toBeNull();
  });

  it('limpiar avisa a quien monta la barra', async () => {
    const limpia = vi.fn();
    const vista = await render(BarraDeFiltros, {
      inputs: {
        criterio: { ...CRITERIO_VACIO, texto: 'gorro' },
        categorias: [],
        proveedores: [],
      },
      on: { limpia },
    });
    await userEvent.click(vista.container.querySelector<HTMLElement>(BOTON_DE_LIMPIAR)!);
    expect(limpia).toHaveBeenCalled();
  });

  /**
   * En el móvil los filtros arrancan plegados y el rótulo es el botón que los abre. Sin la insignia se
   * podía estar filtrando sin verlo, que es la queja que originó el plegado.
   */
  it('en móvil el rótulo pliega y despliega, con la cuenta de filtros puestos', async () => {
    const vista = await render(BarraDeFiltros, {
      inputs: {
        criterio: { ...CRITERIO_VACIO, texto: 'gorro' },
        categorias: [],
        proveedores: [],
      },
    });
    const rotulo = vista.container.querySelector<HTMLElement>(ROTULO_DE_FILTROS)!;
    const panel = vista.container.querySelector<HTMLElement>('#filtros-del-catalogo')!;
    expect(rotulo.textContent).toContain('1');
    expect(rotulo).toHaveAttribute('aria-expanded', 'false');
    expect(panel.className).toContain('hidden');

    await userEvent.click(rotulo);
    vista.fixture.detectChanges();
    expect(rotulo).toHaveAttribute('aria-expanded', 'true');
    expect(panel.className).not.toContain('hidden');
    // En escritorio no se pliega nada: `md:flex` gana a `hidden` pase lo que pase.
    expect(panel.className).toContain('md:flex');
  });
});

describe('FilaListado', () => {
  it('enseña el precio ya formateado por el backend', async () => {
    await render(FilaListado, {
      inputs: { producto: producto() },
      providers: [...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO, provideRouter([])],
    });
    expect(screen.getByText('9,90 €')).toBeInTheDocument();
  });

  it('sin precio de venta pinta un guión, no el coste del proveedor', async () => {
    await render(FilaListado, {
      inputs: { producto: producto({ precio: {} }) },
      providers: [...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO, provideRouter([])],
    });
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('CuadriculaProductos', () => {
  it('mientras carga enseña siluetas, no un vacío', async () => {
    const vista = await render(CuadriculaProductos, {
      inputs: { productos: [], cargando: true, cuantosHuecos: 4 },
      providers: [...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO, provideRouter([])],
    });
    expect(vista.container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('sin resultados lo dice', async () => {
    const vista = await render(CuadriculaProductos, {
      inputs: { productos: [], cargando: false },
      providers: [...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO, provideRouter([])],
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
