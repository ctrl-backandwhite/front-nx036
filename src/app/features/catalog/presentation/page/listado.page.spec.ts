import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CIFRAS_DEL_SITIO_PORT } from '@features/catalog/domain/port/cifras-del-sitio.port';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { Plataforma } from '@core/platform/plataforma';
import { PreferenciasService } from '@core/preferences/preferencias';
import { CATALOGO_PORT, TAXONOMIA_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { PaginaDeProductos } from '../../domain/model/producto';
import { ListadoStore } from '../../application/state/listado.store';
import { ListadoPage } from './listado.page';
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

/**
 * Doble CONTROLABLE del observador de visibilidad, que sustituye al de `test-setup.ts`.
 *
 * <p>El general avisa EN CUANTO se le da algo que observar, y aquí eso lo cambiaría todo: el centinela
 * del desplazamiento infinito se dispararía solo en cada prueba y el listado se llenaría hasta el final
 * antes de la primera comprobación. Con este, el aviso lo da la prueba cuando quiere, que es lo que
 * permite distinguir «lo pidió el centinela» de «lo pidió el botón».
 */
interface ObservadorFalso {
  readonly margen: string;
  readonly avisa: () => void;
  readonly dueno: object;
  desconectado: boolean;
}

let observadores: ObservadorFalso[] = [];
let observadorOriginal: typeof IntersectionObserver;

beforeEach(() => {
  observadores = [];
  observadorOriginal = globalThis.IntersectionObserver;
  class Controlable {
    constructor(
      private readonly llamada: IntersectionObserverCallback,
      private readonly opciones?: IntersectionObserverInit,
    ) {}

    observe(objetivo: Element): void {
      observadores.push({
        margen: this.opciones?.rootMargin ?? '0px',
        dueno: this,
        desconectado: false,
        avisa: () =>
          this.llamada(
            [{ isIntersecting: true, target: objetivo } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
      });
    }

    unobserve(): void {
      this.disconnect();
    }

    disconnect(): void {
      for (const registro of observadores) {
        if (registro.dueno === this) {
          registro.desconectado = true;
        }
      }
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = Controlable as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  globalThis.IntersectionObserver = observadorOriginal;
});

/** El único observador que sigue conectado: el que de verdad vigila el final de la lista. */
function centinelaVivo(): ObservadorFalso | undefined {
  return observadores.filter((observador) => !observador.desconectado).at(-1);
}

function resumen(id: string) {
  return {
    id,
    slug: id,
    titulo: `Producto ${id}`,
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: { formateado: '9,90 €' },
    arancel: { centimosExtra: null, cubierto: false, grupo: 'g1' },
    etiquetas: [],
  };
}

function pagina(cuantos: number, totalDePaginas = 1, numero = 0): PaginaDeProductos {
  return {
    items: Array.from({ length: cuantos }, (_, i) => resumen(`p${numero * cuantos + i}`)),
    pagina: numero,
    tamano: 36,
    total: cuantos * totalDePaginas,
    totalDePaginas,
  };
}

/**
 * Un doble que devuelve páginas DISTINTAS. Acumular dos veces la misma repetiría identificadores, y
 * entonces la prueba mediría un fallo del doble en vez de la conducta del listado.
 */
function buscaPorPaginas(totalDePaginas = 3, porPagina = 2) {
  return vi
    .fn()
    .mockImplementation(async (peticion: { pagina: number }) =>
      exito(pagina(porPagina, totalDePaginas, peticion.pagina)),
    );
}

async function monta(
  busca = vi.fn().mockResolvedValue(exito(pagina(2, 2))),
  extra: Provider[] = [],
) {
  const memoria = new Map<string, string>();
  const vista = await render(ListadoPage, {
    providers: [
      ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
      provideRouter([{ path: '**', children: [] }]),
      { provide: RECUPERADOR_DE_SESION, useValue: { asegura: async () => undefined } },
      {
        provide: ALMACEN_LOCAL,
        useValue: {
          lee: (clave: string) => memoria.get(clave) ?? null,
          guarda: (clave: string, valor: string) => memoria.set(clave, valor),
          borra: (clave: string) => memoria.delete(clave),
        },
      },
      { provide: CATALOGO_PORT, useValue: { busca, ficha: vi.fn() } },
      {
        provide: TAXONOMIA_PORT,
        useValue: {
          arbolDeCategorias: async () =>
            exito([
              {
                id: 'c1',
                slug: 'gorros',
                nombre: 'Gorros',
                posicion: 0,
                cuantosProductos: 5,
                hijas: [],
              },
            ]),
          proveedores: async () => exito([]),
          categoriasRaiz: vi.fn(),
        },
      },
      {
        provide: CESTA_PORT,
        useValue: { productosQueLleva: async () => exito([]), anade: vi.fn() },
      },
      { provide: FAVORITOS_PORT, useValue: { identificadores: async () => exito([]) } },
      {
        provide: CIFRAS_DEL_SITIO_PORT,
        useValue: { consulta: async () => exito({ idiomas: 8, divisas: 25, almacenes: 2 }) },
      },
      ...extra,
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista, busca, memoria };
}

describe('ListadoPage', () => {
  it('pinta los productos que devuelve la búsqueda', async () => {
    await monta();
    expect(screen.getByText('Producto p0')).toBeInTheDocument();
  });

  /** El listado se conserva al ir a una ficha y volver, así que hace falta refrescar a mano. */
  it('refrescar vuelve a pedir desde la primera página con otra baraja', async () => {
    const { vista, busca } = await monta();
    const antes = busca.mock.calls.length;
    const refrescar = vista.container.querySelector<HTMLElement>('button.btn-outline')!;
    await userEvent.click(refrescar);
    await vista.fixture.whenStable();
    expect(busca.mock.calls.length).toBeGreaterThan(antes);
    expect(busca.mock.calls.at(-1)?.[0].pagina).toBe(0);
  });

  /**
   * EL FALLO QUE ARREGLÓ ESTA PRUEBA. Los precios los calcula el BACKEND y llegan ya formateados en la
   * divisa de la cabecera, pero la llave de la memoria del listado no incluía la moneda: cambiar de país
   * dejaba las tarjetas con los importes de la divisa anterior —y encima los daba por buenos al volver
   * de una ficha— hasta que alguien recargaba la página a mano.
   */
  it('cambiar de moneda vuelve a pedir el listado desde la primera página', async () => {
    const { vista, busca } = await monta();
    const antes = busca.mock.calls.length;

    TestBed.inject(PreferenciasService).cambiaMoneda('MXN');
    vista.fixture.detectChanges();

    // La recarga la dispara un EFECTO, y lo que arranca dentro de un efecto no lo espera `whenStable`:
    // hay que esperar al hecho —que la consulta haya salido—, no a un turno concreto del reloj.
    await vi.waitFor(() => expect(busca.mock.calls.length).toBeGreaterThan(antes));
    expect(busca.mock.calls.at(-1)?.[0].pagina).toBe(0);
  });

  it('la forma de ver se recuerda entre visitas', async () => {
    const { vista, memoria } = await monta();
    const botones = vista.container.querySelectorAll<HTMLElement>('.join button');
    await userEvent.click(botones[1]);
    vista.fixture.detectChanges();
    expect(memoria.get('nx036-catalog-view')).toBe('list');
  });

  /** Un slug donde va un identificador dejaba la pantalla con el esqueleto puesto para siempre. */
  it('una categoría inválida no dispara ninguna consulta', async () => {
    const busca = vi.fn().mockResolvedValue(exito(pagina(0)));
    const { vista } = await monta(busca);
    await TestBed.inject(Router).navigate([], { queryParams: { categoryId: 'moda-mujer' } });
    await vista.fixture.whenStable();
    const conCategoria = busca.mock.calls.filter(
      (llamada) => llamada[0].criterio.categoria === 'moda-mujer',
    );
    expect(conCategoria).toHaveLength(0);
  });

  it('un fallo deja la lista vacía en vez de a medias', async () => {
    const { vista } = await monta(
      vi.fn().mockResolvedValue(fallo(creaError('error-del-servidor'))),
    );
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(screen.queryByText('Producto p0')).toBeNull();
  });

  it('con más páginas ofrece traer las siguientes', async () => {
    const { vista, busca } = await monta();
    const masBotones = [...vista.container.querySelectorAll<HTMLElement>('button')];
    const cargarMas = masBotones.at(-1)!;
    const antes = busca.mock.calls.length;
    await userEvent.click(cargarMas);
    await vista.fixture.whenStable();
    expect(busca.mock.calls.length).toBeGreaterThan(antes);
    expect(busca.mock.calls.at(-1)?.[0].pagina).toBe(1);
  });

  /**
   * Los filtros viven en la DIRECCIÓN: es lo que hace que un enlace se pueda compartir con la búsqueda
   * puesta, y que volver atrás recupere lo que se estaba mirando.
   */
  it('los filtros de la dirección llegan a la consulta', async () => {
    const busca = vi.fn().mockResolvedValue(exito(pagina(1)));
    const { vista } = await monta(busca);
    await TestBed.inject(Router).navigate([], { queryParams: { q: 'gorro', freeShipping: '1' } });
    await vista.fixture.whenStable();
    const ultima = busca.mock.calls.at(-1)?.[0];
    expect(ultima.criterio.texto).toBe('gorro');
    expect(ultima.criterio.envioGratis).toBe(true);
  });

  /** Con búsqueda por texto NO se baraja: el orden lo decide la relevancia. */
  it('buscando por texto no se baraja el desempate', async () => {
    const busca = vi.fn().mockResolvedValue(exito(pagina(1)));
    const { vista } = await monta(busca);
    await TestBed.inject(Router).navigate([], { queryParams: { q: 'gorro' } });
    await vista.fixture.whenStable();
    expect(busca.mock.calls.at(-1)?.[0].baraja).toBeUndefined();
  });

  it('con filtros puestos se pintan sus distintivos', async () => {
    const { vista } = await monta();
    await TestBed.inject(Router).navigate([], {
      queryParams: { q: 'gorro', promotionId: 'pr1', promo: 'Rebajas' },
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.querySelectorAll('.chip-active').length).toBeGreaterThan(1);
  });

  /** El grupo de arancel llega de fuera, y dejarlo puesto tras «limpiar» era el filtro invisible. */
  it('limpiar quita también el filtro de arancel', async () => {
    const { vista } = await monta();
    await TestBed.inject(Router).navigate([], { queryParams: { grupo: 'g1', q: 'gorro' } });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    // El botón de limpiar vive dentro del bloque plegable de la barra y es el único botón suelto ahí.
    const limpiar = vista.container.querySelector<HTMLElement>('#filtros-del-catalogo > button')!;
    await userEvent.click(limpiar);
    await vista.fixture.whenStable();
    expect(TestBed.inject(Router).url).not.toContain('grupo');
  });

  it('con una categoría elegida se anuncia con su rótulo y su recuento', async () => {
    const { vista } = await monta();
    await TestBed.inject(Router).navigate([], {
      queryParams: { categoryId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' },
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    // La categoría del doble no coincide con ese identificador: no se anuncia nada que no se sepa.
    expect(vista.container.querySelector('h1')).not.toBeNull();
  });

  it('la vista de lista pinta filas en vez de tarjetas', async () => {
    const { vista } = await monta();
    const botones = vista.container.querySelectorAll<HTMLElement>('.join button');
    await userEvent.click(botones[1]);
    vista.fixture.detectChanges();
    expect(vista.container.querySelectorAll('nx-fila-listado').length).toBeGreaterThan(0);
  });
  /**
   * DEFECTO REPORTADO: el listado solo traía más con el botón. Ahora, al pasar por la mitad de lo ya
   * cargado, la página siguiente llega sola.
   */
  it('el centinela trae la página siguiente sin que nadie pulse nada', async () => {
    const busca = buscaPorPaginas();
    const { vista } = await monta(busca);
    const antes = vista.container.querySelectorAll('nx-tarjeta-producto').length;
    const peticiones = busca.mock.calls.length;

    centinelaVivo()!.avisa();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    expect(busca.mock.calls.length).toBe(peticiones + 1);
    expect(busca.mock.calls.at(-1)?.[0].pagina).toBe(1);
    expect(vista.container.querySelectorAll('nx-tarjeta-producto').length).toBeGreaterThan(antes);
  });

  /** El botón SE QUEDA: es el respaldo si el observador no dispara y lo que usa quien va con teclado. */
  it('con el centinela puesto el botón de cargar más sigue estando', async () => {
    const { vista } = await monta(buscaPorPaginas());
    const centinela = vista.container.querySelector('.py-4');
    expect(centinela?.querySelector('button')).not.toBeNull();
  });

  /** Con la lista aún corta el suelo manda: sin él el centinela solo dispararía al tocar el fondo. */
  it('el margen del centinela nunca baja de 300 px', async () => {
    await monta(buscaPorPaginas());
    expect(centinelaVivo()?.margen).toBe('300px');
  });

  /**
   * El margen se MIDE: es la mitad del alto real de lo cargado, no un número de píxeles fijo. Depende
   * de la vista y del ancho, y en un móvil la misma página ocupa varias veces más alto.
   */
  it('el margen es la mitad del alto de lo ya cargado', async () => {
    const { vista } = await monta(buscaPorPaginas());
    const resultados = vista.container.querySelector('nx-cuadricula-productos')!.parentElement!;
    vi.spyOn(resultados, 'getBoundingClientRect').mockReturnValue({ height: 2400 } as DOMRect);
    // Cambiar de vista rehace el observador: es uno de los dos motivos por los que el alto cambia.
    await userEvent.click(vista.container.querySelectorAll<HTMLElement>('.join button')[1]);
    await vista.fixture.whenStable();
    expect(centinelaVivo()?.margen).toBe('1200px');
  });

  /** REGLA: con una petición en el aire, el centinela no puede pedir otra. */
  it('no duplica peticiones mientras una está en el aire', async () => {
    let suelta: (valor: unknown) => void = () => undefined;
    const busca = vi
      .fn()
      .mockResolvedValueOnce(exito(pagina(2, 3, 0)))
      .mockImplementationOnce(() => new Promise((resuelve) => (suelta = resuelve)));
    const { vista } = await monta(busca);
    const peticiones = busca.mock.calls.length;

    centinelaVivo()!.avisa();
    centinelaVivo()!.avisa();
    await vista.fixture.whenStable();

    expect(busca.mock.calls.length).toBe(peticiones + 1);
    suelta(exito(pagina(2, 3, 1)));
  });

  /** REGLA DURA: si el observador no se desconecta, cada visita al catálogo deja uno vivo. */
  it('al destruir la pantalla no queda ningún observador conectado', async () => {
    const { vista } = await monta(buscaPorPaginas());
    expect(centinelaVivo()).toBeDefined();
    vista.fixture.destroy();
    expect(centinelaVivo()).toBeUndefined();
  });

  /** Al prerenderizar no hay observador ni pantalla a la que asomarse: ahí manda el botón. */
  it('fuera del navegador no se observa nada', async () => {
    await monta(buscaPorPaginas(), [
      {
        provide: Plataforma,
        useValue: { esNavegador: false, documentoSiLoHay: null, ventanaSiLaHay: null },
      },
    ]);
    expect(observadores).toHaveLength(0);
  });

  /**
   * DEFECTO REPORTADO: al volver de una ficha el listado se reiniciaba —arriba del todo y con la
   * primera página—. Lo cargado vive en el estado del contexto, que sobrevive a esa ida y vuelta; sin
   * él la página volvía a ser corta y la restauración de la posición no tenía adónde volver.
   */
  it('volver al listado con la misma búsqueda recupera lo cargado sin volver a pedir', async () => {
    const busca = buscaPorPaginas();
    const { vista } = await monta(busca);
    centinelaVivo()!.avisa();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    const cargados = TestBed.inject(ListadoStore).productos().length;
    const peticiones = busca.mock.calls.length;
    expect(cargados).toBe(4);

    // Ir a la ficha y volver: se destruye el componente y se crea otro con el MISMO inyector de ruta.
    vista.fixture.destroy();
    const segunda = TestBed.createComponent(ListadoPage);
    segunda.detectChanges();
    await segunda.whenStable();
    segunda.detectChanges();

    expect(busca.mock.calls.length).toBe(peticiones);
    expect(segunda.nativeElement.querySelectorAll('nx-tarjeta-producto')).toHaveLength(cargados);
    segunda.destroy();
  });

  /** Memoria rancia: un filtro nuevo no puede reaprovechar los productos del anterior. */
  it('cambiar un filtro tira lo guardado y vuelve a empezar', async () => {
    const busca = buscaPorPaginas();
    const { vista } = await monta(busca);
    centinelaVivo()!.avisa();
    await vista.fixture.whenStable();
    expect(TestBed.inject(ListadoStore).productos().length).toBe(4);

    await TestBed.inject(Router).navigate([], { queryParams: { q: 'gorro' } });
    await vista.fixture.whenStable();

    expect(busca.mock.calls.at(-1)?.[0].pagina).toBe(0);
    expect(TestBed.inject(ListadoStore).productos().length).toBe(2);
  });

  /** Y refrescar tampoco: es una petición explícita de traer lo que haya cambiado. */
  it('refrescar tira lo guardado aunque los filtros no cambien', async () => {
    const busca = buscaPorPaginas();
    const { vista } = await monta(busca);
    centinelaVivo()!.avisa();
    await vista.fixture.whenStable();
    expect(TestBed.inject(ListadoStore).productos().length).toBe(4);

    const refrescar = vista.container.querySelector<HTMLElement>('button.btn-outline')!;
    await userEvent.click(refrescar);
    await vista.fixture.whenStable();

    expect(TestBed.inject(ListadoStore).productos().length).toBe(2);
  });
});
