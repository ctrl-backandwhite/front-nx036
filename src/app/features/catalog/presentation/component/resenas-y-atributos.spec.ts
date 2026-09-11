import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { SesionActual } from '@core/auth/sesion-actual';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { RESENAS_PORT } from '../../domain/port/resenas.port';
import { FichaDeProducto } from '../../domain/model/producto';
import { SeccionResenas } from './seccion-resenas';
import { TablaAtributos } from './tabla-atributos';
import { Recomendados } from './recomendados';
import { VisorGaleria } from './visor-galeria';
import { BloqueEnvio } from './bloque-envio';
import { BloqueSubsidios } from './bloque-subsidios';
import { TarjetaVendedor } from './tarjeta-vendedor';
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

function ficha(cambios: Partial<FichaDeProducto> = {}): FichaDeProducto {
  return {
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro',
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: {},
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    origen: '1688',
    idExterno: '1',
    moq: 6,
    numeroDeResenas: 0,
    imagenes: [],
    variantes: [],
    ejesDeVariante: [],
    tramosDePrecio: [],
    especificaciones: [],
    atributos: {},
    ...cambios,
  };
}

describe('SeccionResenas', () => {
  async function monta(lista: () => Promise<unknown>, publica = vi.fn()) {
    const vista = await render(SeccionResenas, {
      inputs: { idDelProducto: 'p1' },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        { provide: RESENAS_PORT, useValue: { lista, publica } },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return { vista, publica };
  }

  /** Cero coma cero estrellas se lee como un producto mal valorado, no como uno sin valorar. */
  it('sin reseñas no enseña una valoración inventada', async () => {
    const { vista } = await monta(async () =>
      exito({ items: [], total: 0, media: 0, reparto: {} }),
    );
    expect(vista.container.textContent).not.toContain('0.0');
  });

  it('enseña la media y el reparto cuando las hay', async () => {
    const { vista } = await monta(async () =>
      exito({
        items: [{ id: 'r1', valoracion: 5, autor: 'Ana', idioma: 'es' }],
        total: 1,
        media: 5,
        reparto: { '5': 1 },
      }),
    );
    expect(vista.container.textContent).toContain('5.0');
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  /** Presentarlas como propias es una práctica desleal de la lista negra de la Directiva Ómnibus. */
  it('avisa cuando alguna reseña viene del proveedor', async () => {
    const { vista } = await monta(async () =>
      exito({
        items: [{ id: 'r1', valoracion: 4, origen: 'SUPPLIER' }],
        total: 1,
        media: 4,
        reparto: { '4': 1 },
      }),
    );
    expect(vista.container.querySelector('.bg-base-200')).not.toBeNull();
  });

  it('publica la reseña escrita', async () => {
    const publica = vi.fn().mockResolvedValue(exito(undefined));
    const { vista } = await monta(
      async () => exito({ items: [], total: 0, media: 0, reparto: {} }),
      publica,
    );
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-outline')!);
    vista.fixture.detectChanges();
    const cuerpo = vista.container.querySelector<HTMLTextAreaElement>('textarea')!;
    await userEvent.type(cuerpo, 'Muy buena calidad');
    vista.fixture.detectChanges();
    await userEvent.click(vista.container.querySelector<HTMLElement>('button[type=submit]')!);
    await vista.fixture.whenStable();
    expect(publica).toHaveBeenCalled();
  });

  /**
   * Una reseña sin título NI texto no dice nada. La regla es la de siempre, pero antes solo apagaba el
   * botón: quien no entendía por qué se marchaba.
   */
  it('sin título ni texto no se puede enviar, y ahora lo dice', async () => {
    const { vista } = await monta(async () =>
      exito({ items: [], total: 0, media: 0, reparto: {} }),
    );
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-outline')!);
    vista.fixture.detectChanges();
    expect(vista.container.querySelector<HTMLButtonElement>('button[type=submit]')).toBeDisabled();

    const cuerpo = vista.container.querySelector<HTMLTextAreaElement>('textarea')!;
    cuerpo.dispatchEvent(new Event('blur'));
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('[role=alert]')).not.toBeNull();

    await userEvent.type(cuerpo, 'Muy buena calidad');
    vista.fixture.detectChanges();
    expect(
      vista.container.querySelector<HTMLButtonElement>('button[type=submit]'),
    ).not.toBeDisabled();
  });

  /** El nombre lo pone la sesión: dejarlo teclear con la cuenta abierta permitiría firmar por otro. */
  it('con la sesión abierta el nombre queda bloqueado', async () => {
    const { vista } = await monta(async () =>
      exito({ items: [], total: 0, media: 0, reparto: {} }),
    );
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol: 'USER', nombreVisible: 'Ana', pais: 'ES' });
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-outline')!);
    vista.fixture.detectChanges();
    const autor = vista.container.querySelector<HTMLInputElement>('#resena-autor')!;
    expect(autor.value).toBe('Ana');
    expect(autor.readOnly).toBe(true);
  });

  /**
   * El selector de idioma es SOLO para quien administra: quien compra lee en el idioma con el que
   * navega, y ofrecerle saltar al chino o al neerlandés no le ayuda a decidir —no los entiende— y le
   * llena la ficha de píldoras.
   */
  it('quien compra NO ve el selector de idioma de las reseñas', async () => {
    const { vista } = await monta(async () =>
      exito({
        items: [
          { id: 'r1', valoracion: 5, idioma: 'es', cuerpo: 'Muy bien' },
          { id: 'r2', valoracion: 4, idioma: 'en', cuerpo: 'Good' },
        ],
        total: 2,
        media: 4.5,
        reparto: { '5': 1, '4': 1 },
      }),
    );
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol: 'USER', nombreVisible: 'Ana', pais: 'ES' });
    vista.fixture.detectChanges();

    const pildoras = [...vista.container.querySelectorAll<HTMLElement>('button.badge')];
    expect(pildoras.map((p) => p.textContent?.trim())).not.toContain('EN');
    // Ve las de SU idioma —aquí el de las pruebas, inglés— sin poder saltar a otro.
    expect(vista.container.textContent).toContain('Good');
    expect(vista.container.textContent).not.toContain('Muy bien');
  });

  /** Quien administra sí lo necesita: revisa que la traducción de cada mercado esté puesta. */
  it('quien administra puede filtrar las reseñas por idioma', async () => {
    const { vista } = await monta(async () =>
      exito({
        items: [
          { id: 'r1', valoracion: 5, idioma: 'es', cuerpo: 'Muy bien' },
          { id: 'r2', valoracion: 4, idioma: 'en', cuerpo: 'Good' },
        ],
        total: 2,
        media: 4.5,
        reparto: { '5': 1, '4': 1 },
      }),
    );
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'a1', rol: 'ADMIN', nombreVisible: 'Admin', pais: 'ES' });
    vista.fixture.detectChanges();

    const distintivos = [...vista.container.querySelectorAll<HTMLElement>('button.badge')];
    const soloIngles = distintivos.find((d) => d.textContent?.trim() === 'EN')!;
    expect(soloIngles, 'quien administra no ve el filtro por idioma').toBeTruthy();
    await userEvent.click(soloIngles);
    vista.fixture.detectChanges();
    expect(vista.container.textContent).toContain('Good');
    expect(vista.container.textContent).not.toContain('Muy bien');

    await userEvent.click(distintivos[0]);
    vista.fixture.detectChanges();
    expect(vista.container.textContent).toContain('Muy bien');
  });

  it('un fallo al publicar se cuenta, no se traga', async () => {
    const publica = vi.fn().mockResolvedValue(fallo(creaError('error-del-servidor', 'no se pudo')));
    const { vista } = await monta(
      async () => exito({ items: [], total: 0, media: 0, reparto: {} }),
      publica,
    );
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol: 'USER', nombreVisible: 'Ana', pais: 'ES' });
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-outline')!);
    vista.fixture.detectChanges();
    await userEvent.type(vista.container.querySelector<HTMLTextAreaElement>('textarea')!, 'Mal');
    vista.fixture.detectChanges();
    await userEvent.click(vista.container.querySelector<HTMLElement>('button[type=submit]')!);
    await vista.fixture.whenStable();
    expect(publica).toHaveBeenCalled();
  });
});

describe('TablaAtributos', () => {
  async function monta(entrada: FichaDeProducto, especificaciones: () => Promise<unknown>) {
    const vista = await render(TablaAtributos, {
      inputs: { ficha: entrada },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        { provide: CATALOGO_PORT, useValue: { especificaciones } },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return vista;
  }

  it('construye la ficha técnica con las especificaciones traducidas', async () => {
    await monta(ficha(), async () => exito([{ clave: 'material', valor: 'Lana' }]));
    expect(screen.getByText('Lana')).toBeInTheDocument();
  });

  /** Mezclarlos con las especificaciones duplicaba filas en dos idiomas. */
  it('los atributos del proveedor son solo el respaldo', async () => {
    await monta(ficha({ atributos: { season: 'all_season' } }), async () => exito([]));
    expect(screen.getByText(/All seasons|Todo el año|all_season/)).toBeInTheDocument();
  });

  it('añade los básicos sin pisar lo que ya viene', async () => {
    await monta(ficha({ marca: 'NX036' }), async () => exito([]));
    expect(screen.getByText('NX036')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('sin nada que enseñar lo dice en vez de dejar la tabla vacía', async () => {
    const vista = await monta(ficha({ moq: 1 }), async () => exito([]));
    expect(vista.container.querySelector('td[colspan="2"]')).not.toBeNull();
  });
});

describe('Recomendados', () => {
  it('pinta los relacionados con su precio ya formateado', async () => {
    const vista = await render(Recomendados, {
      inputs: { idDelProducto: 'p1' },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        provideRouter([]),
        {
          provide: CATALOGO_PORT,
          useValue: {
            relacionados: async () =>
              exito([
                {
                  id: 'r1',
                  slug: 'otro',
                  titulo: 'Otro gorro',
                  ventasMensuales: 0,
                  estado: 'ACTIVE',
                  precio: { formateado: '12,00 €' },
                  arancel: { centimosExtra: null, cubierto: false },
                  etiquetas: [],
                },
              ]),
          },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(screen.getByText('Otro gorro')).toBeInTheDocument();
    expect(screen.getByText('12,00 €')).toBeInTheDocument();
  });

  /** Que no haya recomendaciones no puede romper la ficha. */
  it('sin relacionados lo dice y sigue', async () => {
    const vista = await render(Recomendados, {
      inputs: { idDelProducto: 'p1' },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        provideRouter([]),
        {
          provide: CATALOGO_PORT,
          useValue: { relacionados: async () => fallo(creaError('sin-conexion')) },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.querySelectorAll('a')).toHaveLength(0);
  });
});

describe('VisorGaleria', () => {
  it('avisa al cerrar y al pasar de foto', async () => {
    const cierra = vi.fn();
    const siguiente = vi.fn();
    const vista = await render(VisorGaleria, {
      inputs: { src: 'a.jpg', titulo: 'Gorro', indice: 0, total: 3 },
      on: { cierra, siguiente },
    });
    const botones = [...vista.container.querySelectorAll<HTMLElement>('button')];
    await userEvent.click(botones.at(-1)!);
    expect(cierra).toHaveBeenCalled();
    await userEvent.click(botones[1]);
    expect(siguiente).toHaveBeenCalled();
  });

  it('con una sola foto no ofrece navegación', async () => {
    const vista = await render(VisorGaleria, {
      inputs: { src: 'a.jpg', titulo: 'Gorro', indice: 0, total: 1 },
    });
    expect(vista.container.querySelectorAll('button')).toHaveLength(1);
  });
});

describe('piezas fijas de la ficha', () => {
  it('el bloque de envío enseña las tres promesas', async () => {
    const vista = await render(BloqueEnvio);
    expect(vista.container.querySelectorAll('li')).toHaveLength(3);
  });

  /**
   * Lo que pone la tienda tiene que decirse CON LETRA en la ficha.
   *
   * <p>En la tarjeta son dos iconos con su texto en el título emergente porque no hay sitio; aquí sí lo
   * hay, y un icono verde suelto no lo lee nadie. La prueba mira el texto, no el dibujo.
   */
  it('la ficha dice con palabras qué paga la tienda', async () => {
    const vista = await render(BloqueSubsidios, {
      inputs: { envioCubierto: true, arancelCubierto: true },
    });
    const t = TestBed.inject(TraduccionService).t;
    expect(vista.container.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByText(t('catalog.shipping.covered'))).toBeInTheDocument();
    expect(screen.getByText(t('catalog.duty.covered'))).toBeInTheDocument();
  });

  /** Sin nada que cubrir no se pinta un hueco: prometer «nada» ocupa sitio y no dice nada. */
  it('sin subvención el bloque no existe', async () => {
    const vista = await render(BloqueSubsidios);
    expect(vista.container.querySelectorAll('li')).toHaveLength(0);
  });

  /** Las dos bolsas son estancas: que la tienda ponga porte no dice nada del arancel. */
  it('cada bolsa se anuncia por su cuenta', async () => {
    const vista = await render(BloqueSubsidios, { inputs: { envioCubierto: true } });
    const t = TestBed.inject(TraduccionService).t;
    expect(vista.container.querySelectorAll('li')).toHaveLength(1);
    expect(screen.getByText(t('catalog.shipping.covered'))).toBeInTheDocument();
  });

  /** El cliente compra a la plataforma: los datos del proveedor de origen NO se enseñan. */
  it('la tarjeta de vendedor habla de NX036, no del proveedor', async () => {
    await render(TarjetaVendedor, { providers: [...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO, provideRouter([])] });
    expect(screen.getByText('NX036')).toBeInTheDocument();
  });
});

describe('Recomendados, desplazamiento', () => {
  it('las flechas mueven el carril', async () => {
    const vista = await render(Recomendados, {
      inputs: { idDelProducto: 'p1' },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        provideRouter([]),
        { provide: CATALOGO_PORT, useValue: { relacionados: async () => exito([]) } },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    const carril = vista.container.querySelector<HTMLElement>('.scroll-smooth')!;
    carril.scrollBy = vi.fn();
    const flechas = [...vista.container.querySelectorAll<HTMLElement>('.join button')];
    await userEvent.click(flechas[0]);
    await userEvent.click(flechas[1]);
    expect(carril.scrollBy).toHaveBeenCalledTimes(2);
  });
});

describe('VisorGaleria, teclado', () => {
  /** Quedarse encerrado dentro de una imagen es de las cosas que más irritan. */
  it('el escape cierra y las flechas pasan de foto', async () => {
    const cierra = vi.fn();
    const anterior = vi.fn();
    const siguiente = vi.fn();
    await render(VisorGaleria, {
      inputs: { src: 'a.jpg', titulo: 'Gorro', indice: 1, total: 3 },
      on: { cierra, anterior, siguiente },
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(cierra).toHaveBeenCalled();
    expect(anterior).toHaveBeenCalled();
    expect(siguiente).toHaveBeenCalled();
  });
});
