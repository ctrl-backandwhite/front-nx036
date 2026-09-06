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
      providers: [provideRouter([]), { provide: PROMOCIONES_PORT, useValue: { vivas } }],
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
});
