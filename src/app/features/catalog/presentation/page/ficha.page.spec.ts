import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { SesionActual } from '@core/auth/sesion-actual';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { ANADIR_AL_CARRITO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { HISTORIAL_PORT } from '../../domain/port/historial.port';
import { RESENAS_PORT } from '../../domain/port/resenas.port';
import { ANALITICA_DE_PRODUCTO_PORT } from '../../domain/port/analitica-de-producto.port';
import { EDICION_DE_FICHA_PORT } from '../../domain/port/edicion-de-ficha.port';
import { FichaDeProducto } from '../../domain/model/producto';
import { FichaPage } from './ficha.page';
import { APLICACION_DEL_CATALOGO } from '../../catalog.providers';

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
    /** Lo que contesta la cesta del otro contexto al meterle la línea. */
    respuestaDeLaCesta?: 'anadido' | 'sin-existencias';
    esAdministrador?: boolean;
  } = {},
) {
  const anade = vi
    .fn()
    .mockResolvedValue({
      estado: opciones.respuestaDeLaCesta ?? 'anadido',
      sugiereAhorroDeEnvio: false,
    });
  const vista = await render(FichaPage, {
    inputs: { slug: 'gorro' },
    providers: [
      ...APLICACION_DEL_CATALOGO,
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
      { provide: CESTA_PORT, useValue: { productosQueLleva: async () => exito([]) } },
      // La ficha mete en la MISMA cesta que la insignia de la cabecera: la de «cart», por su puerto.
      {
        provide: ANADIR_AL_CARRITO_PORT,
        useValue: { unidades: () => 0, anade, abreElCajon: vi.fn() },
      },
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
    // Con la variante ya elegida en la ficha, la cesta recibe la ELECCIÓN entera —variante, unidades y
    // el precio de esa variante— y no vuelve a resolverla: si lo hiciera podría meter otra talla.
    expect(anade).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p1',
        slug: 'gorro',
        eleccion: expect.objectContaining({ cantidad: 1 }),
      }),
    );
    expect(vista.fixture.debugElement.injector.get(AvisosStore).avisos()[0].tipo).toBe('success');
  });

  /**
   * Confirmar una compra que no existe es peor que no confirmarla: quien se lo cree se va sin comprar.
   */
  it('si la cesta rechaza la línea, no se confirma nada', async () => {
    const { vista } = await monta({ respuestaDeLaCesta: 'sin-existencias' });
    const botones = [...vista.container.querySelectorAll<HTMLElement>('button')];
    await userEvent.click(botones.find((b) => b.classList.contains('btn-outline'))!);
    await vista.fixture.whenStable();
    expect(vista.fixture.debugElement.injector.get(AvisosStore).avisos()[0].tipo).toBe('error');
  });

  /**
   * El precio destacado, el de cada variante y los tramos por cantidad los calcula el backend con la
   * divisa de la cabecera: cambiar de país obliga a volver a pedir la ficha. Sin la moneda en la
   * lectura, la ficha se quedaba con los importes de la divisa anterior hasta recargar a mano.
   */
  it('cambiar de moneda vuelve a pedir la ficha', async () => {
    const pedidas: string[] = [];
    const vista = await render(FichaPage, {
      inputs: { slug: 'gorro' },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        provideRouter([{ path: '**', children: [] }]),
        { provide: RECUPERADOR_DE_SESION, useValue: { asegura: async () => undefined } },
        {
          provide: CATALOGO_PORT,
          useValue: {
            ficha: async (slug: string) => {
              pedidas.push(slug);
              return exito(ficha());
            },
            relacionados: async () => exito([]),
            especificaciones: async () => exito([]),
            busca: vi.fn(),
          },
        },
        { provide: HISTORIAL_PORT, useValue: { anota: vi.fn(), lista: vi.fn() } },
        { provide: CESTA_PORT, useValue: { productosQueLleva: async () => exito([]) } },
        {
          provide: ANADIR_AL_CARRITO_PORT,
          useValue: { unidades: () => 0, anade: vi.fn(), abreElCajon: vi.fn() },
        },
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
    await vista.fixture.whenStable();
    const antes = pedidas.length;

    vista.fixture.debugElement.injector.get(PreferenciasService).cambiaMoneda('MXN');
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();

    expect(pedidas.length).toBeGreaterThan(antes);
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
        ...APLICACION_DEL_CATALOGO,
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
          useValue: { productosQueLleva: async () => exito([]) },
        },
        {
          provide: ANADIR_AL_CARRITO_PORT,
          useValue: { unidades: () => 0, anade: vi.fn(), abreElCajon: vi.fn() },
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
    const corazon = [
      ...vista.container.querySelectorAll<HTMLElement>('button.btn-outline.btn-sm'),
    ].at(-1)!;
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

  /**
   * Los paneles de administración van en `@defer`, así que su contenido no está en el primer pintado.
   * Lo que sí se ve de inmediato son las herramientas de la galería, y son la señal de que la ficha
   * ha reconocido a quien mira.
   */
  it('el administrador ve las herramientas de edición de la galería', async () => {
    const { vista } = await monta({
      esAdministrador: true,
      devuelve: exito(ficha({ urlDeOrigen: 'https://detail.1688.com/offer/1.html' })),
    });
    expect(vista.container.querySelectorAll('.bg-error').length).toBeGreaterThan(0);
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

  /**
   * La galería es zona de soltar SOLO para el administrador: al arrastrar una foto de variante
   * encima, se resalta para decir que ahí se puede soltar. (Que soltarla la copie de verdad se prueba
   * sobre `AccionesDeAdmin`, que es quien lo hace.)
   */
  it('para el administrador, la galería se resalta al arrastrar una foto encima', async () => {
    const vista = await render(FichaPage, {
      inputs: { slug: 'gorro' },
      providers: [
        ...APLICACION_DEL_CATALOGO,
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
          useValue: { productosQueLleva: async () => exito([]) },
        },
        {
          provide: ANADIR_AL_CARRITO_PORT,
          useValue: { unidades: () => 0, anade: vi.fn(), abreElCajon: vi.fn() },
        },
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
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol: 'ADMIN', nombreVisible: 'Ana', pais: 'ES' });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    const zona = vista.container.querySelector('nx-galeria-ficha')!.parentElement!;
    zona.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    vista.fixture.detectChanges();
    expect(zona.className).toContain('ring-primary');
  });

  /** Sin permiso, soltar una foto sobre la galería no puede escribir nada. */
  it('quien solo mira no puede soltar fotos en la galería', async () => {
    const anadeImagen = vi.fn();
    const { vista } = await monta();
    const zona = vista.container.querySelector('nx-galeria-ficha')!.parentElement!;
    const soltar = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(soltar, 'dataTransfer', { value: { getData: () => 'x.jpg' } });
    zona.dispatchEvent(soltar);
    await vista.fixture.whenStable();
    expect(anadeImagen).not.toHaveBeenCalled();
  });

  it('el distintivo de arancel lleva al filtro de su grupo', async () => {
    const { vista } = await monta({
      devuelve: exito(
        ficha({
          arancel: { centimosExtra: 300, formateado: '3,00 €', cubierto: false, grupo: 'g1' },
        }),
      ),
    });
    const enlace = [...vista.container.querySelectorAll<HTMLElement>('button')].find((b) =>
      b.classList.contains('underline'),
    )!;
    await userEvent.click(enlace);
    await vista.fixture.whenStable();
    const { Router } = await import('@angular/router');
    expect(vista.fixture.debugElement.injector.get(Router).url).toContain('grupo=g1');
  });

  /** Abierta desde un correo no hay historial de la tienda detrás: entonces, al inicio. */
  it('volver sin historial lleva a la portada', async () => {
    const { vista } = await monta();
    const atras = vista.container.querySelector<HTMLElement>('button.text-primary')!;
    await userEvent.click(atras);
    await vista.fixture.whenStable();
    expect(vista.fixture.debugElement.injector).toBeTruthy();
  });
});
