import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { CATALOGO_PORT, PORTADA_PORT, TAXONOMIA_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { HISTORIAL_PORT } from '../../domain/port/historial.port';
import { PROMOCIONES_PORT } from '../../domain/port/promociones.port';
import { PaginaDeProductos } from '../../domain/model/producto';
import { FavoritosPage } from './favoritos.page';
import { HistorialPage } from './historial.page';
import { PortadaPage } from './portada.page';

function pagina(cuantos: number, totalDePaginas = 1): PaginaDeProductos {
  return {
    items: Array.from({ length: cuantos }, (_, i) => ({
      id: `p${i}`,
      slug: `p${i}`,
      titulo: `Producto ${i}`,
      ventasMensuales: 0,
      estado: 'ACTIVE',
      precio: { formateado: '9,90 €' },
      arancel: { centimosExtra: null, cubierto: false },
      etiquetas: [],
    })),
    pagina: 0,
    tamano: 24,
    total: cuantos,
    totalDePaginas,
  };
}

const SESION_RESUELTA = {
  provide: RECUPERADOR_DE_SESION,
  useValue: { asegura: async () => undefined },
};

/** Las tarjetas de la cuadrícula hablan con tres puertos: sin sus dobles, no llegan a montarse. */
const PUERTOS_DE_LA_TARJETA = [
  provideRouter([]),
  SESION_RESUELTA,
  { provide: CATALOGO_PORT, useValue: { ficha: vi.fn() } },
  { provide: CESTA_PORT, useValue: { anade: vi.fn(), productosQueLleva: vi.fn() } },
  { provide: FAVORITOS_PORT, useValue: { identificadores: async () => exito([]) } },
];

describe('FavoritosPage', () => {
  it('enseña los productos marcados', async () => {
    const vista = await render(FavoritosPage, {
      providers: [
        ...PUERTOS_DE_LA_TARJETA,
        {
          provide: FAVORITOS_PORT,
          useValue: { lista: async () => exito(pagina(2)), identificadores: async () => exito([]) },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(screen.getByText('Producto 0')).toBeInTheDocument();
  });

  /** Una lista vacía tiene que invitar al catálogo, no dejar a nadie en un callejón. */
  it('sin favoritos ofrece ir al catálogo', async () => {
    const vista = await render(FavoritosPage, {
      providers: [
        ...PUERTOS_DE_LA_TARJETA,
        {
          provide: FAVORITOS_PORT,
          useValue: { lista: async () => exito(pagina(0)), identificadores: async () => exito([]) },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('a[href="/catalog"]')).not.toBeNull();
  });

  it('un fallo del servidor no deja la pantalla rota', async () => {
    const vista = await render(FavoritosPage, {
      providers: [
        ...PUERTOS_DE_LA_TARJETA,
        {
          provide: FAVORITOS_PORT,
          useValue: {
            lista: async () => fallo(creaError('sin-conexion')),
            identificadores: async () => exito([]),
          },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.textContent?.trim().length).toBeGreaterThan(0);
  });
});

describe('HistorialPage', () => {
  it('enseña lo visitado y recuerda la retención del dato', async () => {
    const vista = await render(HistorialPage, {
      providers: [
        ...PUERTOS_DE_LA_TARJETA,
        {
          provide: HISTORIAL_PORT,
          useValue: { lista: async () => exito(pagina(1)), anota: vi.fn() },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(screen.getByText('Producto 0')).toBeInTheDocument();
    // La promesa de retención se repite donde se está mirando el dato, no solo en el documento legal.
    expect(vista.container.querySelectorAll('p').length).toBeGreaterThan(1);
  });

  it('con varias páginas ofrece pasar de una a otra', async () => {
    const vista = await render(HistorialPage, {
      providers: [
        ...PUERTOS_DE_LA_TARJETA,
        {
          provide: HISTORIAL_PORT,
          useValue: { lista: async () => exito(pagina(24, 3)), anota: vi.fn() },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('nav')).not.toBeNull();
  });
});

describe('PortadaPage', () => {
  async function monta(haySesion: boolean) {
    const vista = await render(PortadaPage, {
      providers: [
        provideRouter([]),
        SESION_RESUELTA,
        {
          provide: PORTADA_PORT,
          useValue: {
            secciones: async () =>
              exito({ secciones: [], categoriasDestacadas: [], totalDeProductos: 1234 }),
          },
        },
        {
          provide: TAXONOMIA_PORT,
          useValue: {
            categoriasRaiz: async () => exito([]),
            arbolDeCategorias: vi.fn(),
            proveedores: vi.fn(),
          },
        },
        { provide: PROMOCIONES_PORT, useValue: { vivas: async () => exito([]) } },
        { provide: CATALOGO_PORT, useValue: { ficha: vi.fn() } },
        { provide: CESTA_PORT, useValue: { anade: vi.fn(), productosQueLleva: vi.fn() } },
        { provide: FAVORITOS_PORT, useValue: { identificadores: async () => exito([]) } },
      ],
    });
    if (haySesion) {
      const { SesionActual } = await import('@core/auth/sesion-actual');
      vista.fixture.debugElement.injector
        .get(SesionActual)
        .publica({ id: 'u1', rol: 'USER', nombreVisible: 'Ana', pais: 'ES' });
    }
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return vista;
  }

  it('enseña el número REAL de productos del catálogo', async () => {
    const vista = await monta(false);
    expect(vista.container.textContent).toContain((1234).toLocaleString());
  });

  it('sin sesión invita a registrarse', async () => {
    const vista = await monta(false);
    expect(vista.container.querySelector('a[href="/register"]')).not.toBeNull();
  });

  /** Con sesión, invitar a registrarse no tiene sentido: se lleva al catálogo. */
  it('con sesión lleva al catálogo', async () => {
    const vista = await monta(true);
    expect(vista.container.querySelector('a[href="/catalog"]')).not.toBeNull();
  });
});
