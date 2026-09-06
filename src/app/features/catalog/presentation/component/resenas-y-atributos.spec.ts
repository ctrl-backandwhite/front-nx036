import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { SesionActual } from '@core/auth/sesion-actual';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { RESENAS_PORT } from '../../domain/port/resenas.port';
import { FichaDeProducto } from '../../domain/model/producto';
import { SeccionResenas } from './seccion-resenas';
import { TablaAtributos } from './tabla-atributos';
import { Recomendados } from './recomendados';
import { VisorGaleria } from './visor-galeria';
import { BloqueEnvio } from './bloque-envio';
import { TarjetaVendedor } from './tarjeta-vendedor';

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
      providers: [{ provide: RESENAS_PORT, useValue: { lista, publica } }],
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

  /** Se enseñan por defecto las del idioma de quien mira; el filtro deja ver todas. */
  it('con reseñas en varios idiomas ofrece filtrarlas', async () => {
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
    const distintivos = [...vista.container.querySelectorAll<HTMLElement>('.badge')];
    const soloIngles = distintivos.find((d) => d.textContent?.trim() === 'EN')!;
    await userEvent.click(soloIngles);
    vista.fixture.detectChanges();
    expect(vista.container.textContent).toContain('Good');
    expect(vista.container.textContent).not.toContain('Muy bien');

    const todas = distintivos[0];
    await userEvent.click(todas);
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
      providers: [{ provide: CATALOGO_PORT, useValue: { especificaciones } }],
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

  /** El cliente compra a la plataforma: los datos del proveedor de origen NO se enseñan. */
  it('la tarjeta de vendedor habla de NX036, no del proveedor', async () => {
    await render(TarjetaVendedor, { providers: [provideRouter([])] });
    expect(screen.getByText('NX036')).toBeInTheDocument();
  });
});

describe('Recomendados, desplazamiento', () => {
  it('las flechas mueven el carril', async () => {
    const vista = await render(Recomendados, {
      inputs: { idDelProducto: 'p1' },
      providers: [
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
