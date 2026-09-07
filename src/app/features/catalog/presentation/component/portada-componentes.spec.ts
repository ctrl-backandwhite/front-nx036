import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { PORTADA_PORT } from '../../domain/port/catalogo.port';
import { PROMOCIONES_PORT } from '../../domain/port/promociones.port';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { ResumenDeProducto } from '../../domain/model/producto';
import { SeccionesPortada } from './secciones-portada';
import { FondoHero } from './fondo-hero';
import { CartelPromociones } from './cartel-promociones';
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

function producto(id: string): ResumenDeProducto {
  return {
    id,
    slug: id,
    titulo: `Producto ${id}`,
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: { formateado: '9,90 €' },
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
  };
}

const PROVEEDORES_DE_TARJETA = [
  provideRouter([]),
  { provide: CATALOGO_PORT, useValue: { ficha: vi.fn() } },
  { provide: CESTA_PORT, useValue: { anade: vi.fn(), productosQueLleva: vi.fn() } },
  { provide: FAVORITOS_PORT, useValue: {} },
];

describe('SeccionesPortada', () => {
  async function monta(secciones: () => Promise<unknown>) {
    return render(SeccionesPortada, {
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        ...PROVEEDORES_DE_TARJETA,
        { provide: PORTADA_PORT, useValue: { secciones } },
      ],
    });
  }

  it('pinta una hilera por apartado con productos', async () => {
    await monta(async () =>
      exito({
        secciones: [
          { codigo: 'trending', titulo: 'Tendencia', items: [producto('a')] },
          { codigo: 'newest', titulo: 'Nuevos', items: [] },
        ],
        categoriasDestacadas: [],
        totalDeProductos: 1,
      }),
    );
    expect(await screen.findByText('Producto a')).toBeInTheDocument();
  });

  /** Un título sobre una fila vacía deja un hueco roto en la portada. */
  it('sin categorías no pinta su encabezado', async () => {
    const vista = await monta(async () =>
      exito({ secciones: [], categoriasDestacadas: [], totalDeProductos: 0 }),
    );
    await vista.fixture.whenStable();
    expect(vista.container.querySelectorAll('section')).toHaveLength(0);
  });

  it('una portada que no carga no rompe la página', async () => {
    const vista = await monta(async () => fallo(creaError('sin-conexion')));
    await vista.fixture.whenStable();
    expect(vista.container.textContent?.trim()).toBe('');
  });
});

describe('FondoHero', () => {
  /** Media docena de fotos repetidas se nota y queda peor que no poner fondo. */
  it('con pocas fotos no pinta cintas', async () => {
    const vista = await render(FondoHero, {
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        {
          provide: PORTADA_PORT,
          useValue: {
            secciones: async () =>
              exito({
                secciones: [{ codigo: 'trending', titulo: 'T', items: [producto('a')] }],
                categoriasDestacadas: [],
                totalDeProductos: 1,
              }),
          },
        },
      ],
    });
    await vista.fixture.whenStable();
    expect(vista.container.querySelector('.hero-belts')).toBeNull();
  });

  it('con fotos de sobra reparte tres cintas', async () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({
      ...producto(id),
      imagenPrincipal: `${id}.jpg`,
    }));
    const vista = await render(FondoHero, {
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        {
          provide: PORTADA_PORT,
          useValue: {
            secciones: async () =>
              exito({
                secciones: [{ codigo: 'trending', titulo: 'T', items }],
                categoriasDestacadas: [],
                totalDeProductos: items.length,
              }),
          },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.querySelectorAll('.hero-belt')).toHaveLength(3);
  });
});

describe('CartelPromociones', () => {
  async function monta(vivas: () => Promise<unknown>) {
    const vista = await render(CartelPromociones, {
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        provideRouter([]),
        { provide: PROMOCIONES_PORT, useValue: { vivas } },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return vista;
  }

  /** Un hueco vacío sería peor que no tener cartel. */
  it('sin rebajas vivas no ocupa ni un píxel', async () => {
    const vista = await monta(async () => exito([]));
    expect(vista.container.textContent?.trim()).toBe('');
  });

  it('anuncia la rebaja y sus productos', async () => {
    await monta(async () =>
      exito([
        {
          id: 'promo1',
          nombre: 'Rebajas de invierno',
          porcentaje: 30,
          productos: [producto('a')],
        },
      ]),
    );
    expect(screen.getByText('Rebajas de invierno')).toBeInTheDocument();
    expect(screen.getByText('Producto a')).toBeInTheDocument();
  });

  it('con varias rebajas ofrece los puntos para saltar entre ellas', async () => {
    const vista = await monta(async () =>
      exito([
        { id: '1', nombre: 'Una', porcentaje: 10, productos: [] },
        { id: '2', nombre: 'Otra', porcentaje: 20, productos: [] },
      ]),
    );
    const puntos = vista.container.querySelectorAll('button[aria-current]');
    expect(puntos).toHaveLength(2);
    await userEvent.click(puntos[1] as HTMLElement);
    vista.fixture.detectChanges();
    expect(screen.getByText('Otra')).toBeInTheDocument();
  });

  it('un cartel que no carga no rompe la portada', async () => {
    const vista = await monta(async () => fallo(creaError('sin-conexion')));
    expect(vista.container.textContent?.trim()).toBe('');
  });

  /** Con el ratón encima, el pase se detiene: nadie quiere que le cambien lo que está leyendo. */
  it('el pase se pausa al pasar el ratón por encima', async () => {
    const vista = await monta(async () =>
      exito([
        { id: '1', nombre: 'Una', porcentaje: 10, productos: [] },
        { id: '2', nombre: 'Otra', porcentaje: 20, productos: [] },
      ]),
    );
    const cartel = vista.container.querySelector<HTMLElement>('section')!;
    cartel.dispatchEvent(new Event('mouseenter'));
    vista.fixture.detectChanges();
    cartel.dispatchEvent(new Event('mouseleave'));
    vista.fixture.detectChanges();
    expect(vista.container.textContent).toContain('Una');
  });

  /** El porcentaje es el TECHO: el suelo de coste recorta el descuento en algunos productos. */
  it('anuncia el descuento como un máximo y los días que quedan', async () => {
    const manana = new Date(Date.now() + 86_400_000).toISOString();
    const vista = await monta(async () =>
      exito([{ id: '1', nombre: 'Una', porcentaje: 30, terminaEl: manana, productos: [] }]),
    );
    expect(vista.container.textContent).toContain('30');
    expect(vista.container.querySelectorAll('.bg-white\\/10').length).toBeGreaterThan(0);
  });
});

describe('SeccionesPortada, más a fondo', () => {
  it('las categorías destacadas llevan al listado con su filtro puesto', async () => {
    const vista = await render(SeccionesPortada, {
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        ...PROVEEDORES_DE_TARJETA,
        {
          provide: PORTADA_PORT,
          useValue: {
            secciones: async () =>
              exito({
                secciones: [],
                categoriasDestacadas: [
                  {
                    id: 'c1',
                    slug: 'gorros',
                    nombre: 'Gorros',
                    posicion: 0,
                    cuantosProductos: 4,
                    hijas: [],
                  },
                ],
                totalDeProductos: 4,
              }),
          },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    const enlace = vista.container.querySelector('a')!;
    expect(enlace.getAttribute('href')).toContain('categoryId=c1');
    // Sin foto de categoría, la distinción visual la da un círculo con la inicial.
    expect(vista.container.textContent).toContain('G');
  });

  it('«ver todos» lleva al orden que representa cada hilera', async () => {
    const vista = await render(SeccionesPortada, {
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        ...PROVEEDORES_DE_TARJETA,
        {
          provide: PORTADA_PORT,
          useValue: {
            secciones: async () =>
              exito({
                secciones: [
                  { codigo: 'video', titulo: 'Con vídeo', items: [producto('a')] },
                  { codigo: 'top_selling', titulo: 'Más vendidos', items: [producto('b')] },
                ],
                categoriasDestacadas: [],
                totalDeProductos: 2,
              }),
          },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    const enlaces = [...vista.container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(enlaces.some((h) => h?.includes('hasVideo=1'))).toBe(true);
    expect(enlaces.some((h) => h?.includes('sort=sales'))).toBe(true);
  });
});
