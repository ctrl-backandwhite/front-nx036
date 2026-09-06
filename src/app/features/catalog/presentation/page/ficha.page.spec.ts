import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { SesionActual } from '@core/auth/sesion-actual';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { HISTORIAL_PORT } from '../../domain/port/historial.port';
import { RESENAS_PORT } from '../../domain/port/resenas.port';
import { ANALITICA_DE_PRODUCTO_PORT } from '../../domain/port/analitica-de-producto.port';
import { EDICION_DE_FICHA_PORT } from '../../domain/port/edicion-de-ficha.port';
import { FichaDeProducto } from '../../domain/model/producto';
import { FichaPage } from './ficha.page';

function ficha(cambios: Partial<FichaDeProducto> = {}): FichaDeProducto {
  return {
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro de lana',
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: { formateado: '9,90 €', importe: 9.9, divisa: 'EUR' },
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    origen: '1688',
    idExterno: '1',
    moq: 1,
    numeroDeResenas: 0,
    imagenes: [{ id: 'i1', direccion: 'foto.jpg', posicion: 0, papel: 'MAIN' }],
    variantes: [{ id: 'v1', existencias: 5, opciones: {}, activa: true }],
    ejesDeVariante: [],
    tramosDePrecio: [],
    especificaciones: [],
    atributos: {},
    ...cambios,
  };
}

async function monta(
  opciones: {
    devuelve?: unknown;
    anade?: ReturnType<typeof vi.fn>;
    esAdministrador?: boolean;
  } = {},
) {
  const anade = opciones.anade ?? vi.fn().mockResolvedValue(exito(undefined));
  const vista = await render(FichaPage, {
    inputs: { slug: 'gorro' },
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: RECUPERADOR_DE_SESION, useValue: { asegura: async () => undefined } },
      {
        provide: CATALOGO_PORT,
        useValue: {
          ficha: async () => opciones.devuelve ?? exito(ficha()),
          relacionados: async () => exito([]),
          especificaciones: async () => exito([]),
          busca: vi.fn(),
        },
      },
      { provide: HISTORIAL_PORT, useValue: { anota: vi.fn(), lista: vi.fn() } },
      { provide: CESTA_PORT, useValue: { anade, productosQueLleva: async () => exito([]) } },
      { provide: FAVORITOS_PORT, useValue: { identificadores: async () => exito([]) } },
      {
        provide: RESENAS_PORT,
        useValue: {
          lista: async () => exito({ items: [], total: 0, media: 0, reparto: {} }),
          publica: vi.fn(),
        },
      },
      {
        provide: ANALITICA_DE_PRODUCTO_PORT,
        useValue: { historicoDePrecios: async () => exito([]), estimacionDeMargen: vi.fn() },
      },
      { provide: EDICION_DE_FICHA_PORT, useValue: {} },
    ],
  });
  if (opciones.esAdministrador) {
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol: 'ADMIN', nombreVisible: 'Ana', pais: 'ES' });
  }
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista, anade };
}

describe('FichaPage', () => {
  it('enseña el título y el precio del producto', async () => {
    await monta();
    expect(
      await screen.findByRole('heading', { name: 'Gorro de lana', level: 1 }),
    ).toBeInTheDocument();
    expect(await screen.findByText('9,90 €')).toBeInTheDocument();
  });

  /** Un producto que no existe se dice; un fallo pasajero, también, pero con otro texto. */
  it('un producto inexistente lo dice sin romper la pantalla', async () => {
    const { vista } = await monta({ devuelve: fallo(creaError('no-encontrado')) });
    expect(vista.container.textContent).toContain('gorro');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('añadir a la cesta confirma con lo que la cesta se ha quedado', async () => {
    const { vista, anade } = await monta();
    const botones = [...vista.container.querySelectorAll<HTMLElement>('button')];
    const anadir = botones.find((b) => b.classList.contains('btn-outline'))!;
    await userEvent.click(anadir);
    await vista.fixture.whenStable();
    expect(anade).toHaveBeenCalled();
    expect(vista.fixture.debugElement.injector.get(AvisosStore).avisos()[0].tipo).toBe('success');
  });

  /**
   * Confirmar una compra que no existe es peor que no confirmarla: quien se lo cree se va sin comprar.
   */
  it('si la cesta rechaza la línea, no se confirma nada', async () => {
    const { vista } = await monta({
      anade: vi.fn().mockResolvedValue(fallo(creaError('error-del-servidor'))),
    });
    const botones = [...vista.container.querySelectorAll<HTMLElement>('button')];
    await userEvent.click(botones.find((b) => b.classList.contains('btn-outline'))!);
    await vista.fixture.whenStable();
    expect(vista.fixture.debugElement.injector.get(AvisosStore).avisos()[0].tipo).toBe('error');
  });

  /** Ni el enlace al proveedor ni el código externo pueden llegar a quien compra. */
  it('el bloque de administración no existe para quien solo mira', async () => {
    const { vista } = await monta({
      devuelve: exito(ficha({ urlDeOrigen: 'https://detail.1688.com/offer/1.html' })),
    });
    expect(vista.container.textContent).not.toContain('1688.com');
  });

  it('con existencias, los dos botones de compra están vivos', async () => {
    const { vista } = await monta();
    const activos = [...vista.container.querySelectorAll('button')].filter(
      (b) => b.classList.contains('btn-primary') && !b.hasAttribute('disabled'),
    );
    expect(activos.length).toBeGreaterThan(0);
  });

  /** Sin ninguna variante viva no hay nada que comprar: el botón no puede prometerlo. */
  it('sin existencias los botones se apagan', async () => {
    const { vista } = await monta({
      devuelve: exito(
        ficha({ variantes: [{ id: 'v1', existencias: 0, opciones: {}, activa: true }] }),
      ),
    });
    const primario = vista.container.querySelector('button.btn-primary');
    expect(primario).toBeDisabled();
  });

  it('con pedido mínimo se avisa al abrir, no al intentar comprar', async () => {
    const { vista } = await monta({ devuelve: exito(ficha({ moq: 6 })) });
    const { DialogoStore } = await import('@ds/component/dialogo/dialogo.store');
    expect(vista.fixture.debugElement.injector.get(DialogoStore).actual()).not.toBeNull();
  });

  it('el corazón aparece con sesión y marca el producto', async () => {
    const anadeFavorito = vi.fn().mockResolvedValue(exito(undefined));
    const vista = await render(FichaPage, {
      inputs: { slug: 'gorro' },
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: RECUPERADOR_DE_SESION, useValue: { asegura: async () => undefined } },
        {
          provide: CATALOGO_PORT,
          useValue: {
            ficha: async () => exito(ficha()),
            relacionados: async () => exito([]),
            especificaciones: async () => exito([]),
          },
        },
        { provide: HISTORIAL_PORT, useValue: { anota: vi.fn(), lista: vi.fn() } },
        {
          provide: CESTA_PORT,
          useValue: { anade: vi.fn(), productosQueLleva: async () => exito([]) },
        },
        {
          provide: FAVORITOS_PORT,
          useValue: {
            identificadores: async () => exito([]),
            anade: anadeFavorito,
            quita: vi.fn(),
          },
        },
        {
          provide: RESENAS_PORT,
          useValue: {
            lista: async () => exito({ items: [], total: 0, media: 0, reparto: {} }),
            publica: vi.fn(),
          },
        },
        {
          provide: ANALITICA_DE_PRODUCTO_PORT,
          useValue: { historicoDePrecios: async () => exito([]), estimacionDeMargen: vi.fn() },
        },
        { provide: EDICION_DE_FICHA_PORT, useValue: {} },
      ],
    });
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol: 'USER', nombreVisible: 'Ana', pais: 'ES' });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    const corazon = [...vista.container.querySelectorAll<HTMLElement>('button.btn-sm')].at(-1)!;
    await userEvent.click(corazon);
    await vista.fixture.whenStable();
    expect(anadeFavorito).toHaveBeenCalledWith('p1');
  });

  /** «Comprar ahora» sin sesión NO fuerza el acceso: desconcierta a quien está llenando la cesta. */
  it('comprar ahora lleva al carrito cuando no hay sesión', async () => {
    const { vista } = await monta();
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-primary')!);
    await vista.fixture.whenStable();
    const { Router } = await import('@angular/router');
    expect(vista.fixture.debugElement.injector.get(Router).url).toContain('/cart');
  });

  it('para el administrador se cargan los bloques de edición', async () => {
    const { vista } = await monta({
      esAdministrador: true,
      devuelve: exito(ficha({ urlDeOrigen: 'https://detail.1688.com/offer/1.html' })),
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.textContent).toContain('EXT-1');
  });

  it('elegir un color cambia la foto principal', async () => {
    const conColores = ficha({
      imagenes: [
        { id: 'i1', direccion: 'a.jpg', posicion: 0, papel: 'MAIN' },
        { id: 'i2', direccion: 'b.jpg', posicion: 1, papel: 'GALLERY' },
      ],
      ejesDeVariante: [
        {
          id: 'color',
          nombreZh: '颜色',
          nombre: 'Color',
          posicion: 0,
          valores: [
            { id: 'c1', valorZh: '红色', valor: 'Rojo', imagen: 'b.jpg', posicion: 0 },
            { id: 'c2', valorZh: '蓝色', valor: 'Azul', imagen: 'z.jpg', posicion: 1 },
          ],
        },
      ],
      variantes: [
        { id: 'v1', existencias: 3, opciones: { Color: 'Rojo' }, activa: true },
        { id: 'v2', existencias: 1, opciones: { Color: 'Azul' }, activa: true },
      ],
    });
    const { vista } = await monta({ devuelve: exito(conColores) });
    await userEvent.click(screen.getByTitle('Azul'));
    vista.fixture.detectChanges();
    // La foto del color no está en la galería: se enseña como principal sin meterla en la tira.
    expect(vista.container.querySelector('#nx-pdp-main-img')).toHaveAttribute('src', 'z.jpg');
  });
});
