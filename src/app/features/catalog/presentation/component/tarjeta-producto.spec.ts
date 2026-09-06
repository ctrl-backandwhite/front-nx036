import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { ResumenDeProducto } from '../../domain/model/producto';
import { SesionActual } from '@core/auth/sesion-actual';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { TarjetaProducto } from './tarjeta-producto';
import { APLICACION_DEL_CATALOGO } from '../../catalog.providers';

function producto(cambios: Partial<ResumenDeProducto> = {}): ResumenDeProducto {
  return {
    id: 'p1',
    slug: 'gorro-de-lana',
    titulo: 'Gorro de lana',
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: { formateado: '9,90 €' },
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    ...cambios,
  };
}

async function monta(
  entrada: ResumenDeProducto,
  puertos: {
    ficha?: unknown;
    anade?: unknown;
    favoritos?: Record<string, unknown>;
    haySesion?: boolean;
  } = {},
) {
  const vista = await render(TarjetaProducto, {
    inputs: { producto: entrada },
    providers: [
      ...APLICACION_DEL_CATALOGO,
      provideRouter([{ path: '**', children: [] }]),
      {
        provide: CATALOGO_PORT,
        useValue: {
          ficha: puertos.ficha ?? vi.fn().mockResolvedValue(exito({ ...entrada, variantes: [] })),
        },
      },
      {
        provide: CESTA_PORT,
        useValue: {
          anade: puertos.anade ?? vi.fn().mockResolvedValue(exito(undefined)),
          productosQueLleva: vi.fn(),
        },
      },
      { provide: FAVORITOS_PORT, useValue: puertos.favoritos ?? {} },
    ],
  });
  if (puertos.haySesion) {
    TestBed.inject(SesionActual).publica({
      id: 'u1',
      rol: 'USER',
      nombreVisible: 'Ana',
      pais: 'ES',
    });
  }
  vista.fixture.detectChanges();
  return vista;
}

describe('TarjetaProducto', () => {
  it('enseña el título y el precio que manda el backend', async () => {
    await monta(producto());
    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
    expect(screen.getByText('9,90 €')).toBeInTheDocument();
  });

  /** La etiqueta prometía un éxito de esta tienda enseñando el del proveedor. */
  it('no marca superventas por vender mucho en el proveedor', async () => {
    const { container } = await monta(producto({ ventasMensuales: 50_000, tendencia: 0.1 }));
    expect(container.textContent).not.toContain('product.badge.bestseller');
  });

  it('lleva a la ficha pública, y a la del panel cuando se navega desde dentro', async () => {
    const vista = await monta(producto());
    expect(vista.container.querySelector('a')?.getAttribute('href')).toBe('/catalog/gorro-de-lana');

    await vista.rerender({ inputs: { producto: producto(), enPanel: true } });
    expect(vista.container.querySelector('a')?.getAttribute('href')).toBe(
      '/admin/browse/gorro-de-lana',
    );
  });

  /** Sin cuenta no hay dónde guardar la lista de deseos. */
  it('el corazón solo aparece con sesión', async () => {
    await monta(producto());
    expect(screen.queryByRole('button', { name: /favorite/i })).toBeNull();
  });

  it('marcar un favorito no navega a la ficha', async () => {
    const anade = vi.fn().mockResolvedValue(exito(undefined));
    const vista = await monta(producto(), {
      haySesion: true,
      favoritos: { anade, quita: vi.fn(), identificadores: vi.fn() },
    });
    const corazon = screen.getAllByRole('button')[0];
    await userEvent.click(corazon);
    vista.fixture.detectChanges();
    expect(anade).toHaveBeenCalledWith('p1');
  });

  it('avisa cuando no queda ninguna variante disponible', async () => {
    const conVariantes = {
      ...producto(),
      moq: 1,
      origen: '1688',
      idExterno: '1',
      numeroDeResenas: 0,
      imagenes: [],
      variantes: [{ id: 'v1', existencias: 0, opciones: {}, activa: true }],
      ejesDeVariante: [],
      tramosDePrecio: [],
      especificaciones: [],
      atributos: {},
    };
    const vista = await monta(producto(), {
      ficha: vi.fn().mockResolvedValue(exito(conVariantes)),
    });
    const botones = screen.getAllByRole('button');
    await userEvent.click(botones[botones.length - 1]);
    vista.fixture.detectChanges();
    expect(TestBed.inject(AvisosStore).avisos().length).toBe(1);
  });

  it('un fallo de red al añadir se cuenta, no se traga', async () => {
    const vista = await monta(producto(), {
      ficha: vi.fn().mockResolvedValue(fallo(creaError('sin-conexion', 'sin red'))),
    });
    const botones = screen.getAllByRole('button');
    await userEvent.click(botones[botones.length - 1]);
    vista.fixture.detectChanges();
    expect(TestBed.inject(AvisosStore).avisos()[0].tipo).toBe('error');
  });

  it('pinta los distintivos que el backend marca', async () => {
    const { container } = await monta(
      producto({ tendencia: 0.8, etiquetas: ['ready', 'free_shipping'] }),
    );
    // Superventas, «listo para enviar» y envío gratis: tres distintivos sobre la foto.
    expect(container.querySelectorAll('.absolute.top-2.left-2 > span')).toHaveLength(3);
  });

  /** El escudo ya significa «marca» en la tarjeta: aquí va una mano que paga. */
  it('marca los productos cuyo arancel paga la tienda', async () => {
    const { container } = await monta(
      producto({ arancel: { centimosExtra: null, cubierto: true } }),
    );
    expect(container.querySelector('.text-emerald-600')).not.toBeNull();
  });

  it('enseña la valoración y las ventas abreviadas', async () => {
    const { container } = await monta(producto({ valoracion: 4.27, ventasMensuales: 12_345 }));
    expect(container.textContent).toContain('4.3');
    expect(container.textContent).toContain('12.3k');
  });

  /**
   * Con cesta, el filtro lleva a las líneas de declaración DE LA CESTA; sin ella, al grupo de este
   * producto, que es la única referencia que hay.
   */
  it('el filtro de arancel apunta al grupo del producto cuando la cesta está vacía', async () => {
    const vista = await monta(
      producto({
        arancel: { centimosExtra: 300, formateado: '3,00 €', cubierto: false, grupo: 'g1' },
      }),
    );
    const filtro = [...vista.container.querySelectorAll<HTMLElement>('button')].find((b) =>
      b.classList.contains('underline'),
    )!;
    await userEvent.click(filtro);
    await vista.fixture.whenStable();
    const { Router } = await import('@angular/router');
    expect(TestBed.inject(Router).url).toContain('grupo=g1');
  });

  it('la primera fila pide su foto con prioridad', async () => {
    const vista = await render(TarjetaProducto, {
      inputs: { producto: producto({ imagenPrincipal: 'foto.jpg' }), prioritaria: true },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        provideRouter([{ path: '**', children: [] }]),
        { provide: CATALOGO_PORT, useValue: { ficha: vi.fn() } },
        { provide: CESTA_PORT, useValue: { anade: vi.fn(), productosQueLleva: vi.fn() } },
        { provide: FAVORITOS_PORT, useValue: {} },
      ],
    });
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('img[fetchpriority=high]')).not.toBeNull();
  });
});
