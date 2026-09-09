import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { HISTORIAL_PORT } from '../../domain/port/historial.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { RESENAS_PORT } from '../../domain/port/resenas.port';
import { FichaDeProducto, ResumenDeProducto } from '../../domain/model/producto';
import { CRITERIO_VACIO } from '../../domain/model/criterio-de-busqueda';
import { FavoritosStore } from '../state/favoritos.store';
import { SesionActual } from '@core/auth/sesion-actual';
import { ReferenciaDeCestaStore } from '../state/referencia-de-cesta.store';
import { AlternaFavorito } from './alterna-favorito.use-case';
import { AnadeALaCesta, esMotivoDeRechazo } from './anade-a-la-cesta.use-case';
import { AbreLaFicha } from './abre-la-ficha.use-case';
import { BuscaProductos } from './busca-productos.use-case';
import { PublicaResena } from './publica-resena.use-case';
import { ListaFavoritos, ListaHistorial } from './lista-guardados.use-case';
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
    precio: { importe: 10, divisa: 'EUR', formateado: '10,00 €' },
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    origen: '1688',
    idExterno: '1',
    moq: 1,
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

describe('AlternaFavorito', () => {
  function monta(puerto: Partial<Record<string, unknown>>, haySesion = true) {
    TestBed.configureTestingModule({
      providers: [...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO, { provide: FAVORITOS_PORT, useValue: puerto }],
    });
    if (haySesion) {
      TestBed.inject(SesionActual).publica({
        id: 'u1',
        rol: 'USER',
        nombreVisible: 'Ana',
        pais: 'ES',
      });
    }
    return {
      caso: TestBed.inject(AlternaFavorito),
      estado: TestBed.inject(FavoritosStore),
    };
  }

  it('sin sesión no hay favoritos que marcar', async () => {
    const { caso } = monta({}, false);
    const resultado = await caso.ejecuta('p1');
    expect(resultado.ok).toBe(false);
  });

  it('marca y desmarca contra el puerto', async () => {
    const anade = vi.fn().mockResolvedValue(exito(undefined));
    const quita = vi.fn().mockResolvedValue(exito(undefined));
    const { caso, estado } = monta({ anade, quita });

    await caso.ejecuta('p1');
    expect(anade).toHaveBeenCalledWith('p1');
    expect(estado.esFavorito('p1')).toBe(true);

    await caso.ejecuta('p1');
    expect(quita).toHaveBeenCalledWith('p1');
    expect(estado.esFavorito('p1')).toBe(false);
  });

  /** El optimismo solo es honesto si se DESHACE cuando la llamada falla. */
  it('deshace el cambio si el servidor lo rechaza', async () => {
    const { caso, estado } = monta({
      anade: vi.fn().mockResolvedValue(fallo(creaError('error-del-servidor'))),
    });
    const resultado = await caso.ejecuta('p1');
    expect(resultado.ok).toBe(false);
    expect(estado.esFavorito('p1')).toBe(false);
  });

  it('carga los identificadores una sola vez', async () => {
    const identificadores = vi.fn().mockResolvedValue(exito(['a']));
    const { caso, estado } = monta({ identificadores });
    await caso.carga();
    await caso.carga();
    expect(identificadores).toHaveBeenCalledTimes(1);
    expect(estado.esFavorito('a')).toBe(true);
  });

  it('sin sesión no pide nada', async () => {
    const identificadores = vi.fn();
    const { caso } = monta({ identificadores }, false);
    await caso.carga();
    expect(identificadores).not.toHaveBeenCalled();
  });

  /**
   * EL PORQUÉ DEL DEFECTO DE «MIS FAVORITOS». La decisión entre marcar y desmarcar sale de este
   * conjunto, no del servidor: sin haberlo traído, TODO parece sin marcar y el corazón vuelve a AÑADIR
   * lo que ya estaba. Con él traído, pulsar sobre un favorito lo QUITA, que es lo que se espera desde
   * una pantalla donde todo está marcado.
   */
  it('con los identificadores traídos, pulsar sobre un favorito lo QUITA', async () => {
    const anade = vi.fn().mockResolvedValue(exito(undefined));
    const quita = vi.fn().mockResolvedValue(exito(undefined));
    const { caso, estado } = monta({
      identificadores: vi.fn().mockResolvedValue(exito(['p0'])),
      anade,
      quita,
    });

    await caso.carga();
    expect(estado.esFavorito('p0')).toBe(true);
    await caso.ejecuta('p0');

    expect(quita).toHaveBeenCalledWith('p0');
    expect(anade).not.toHaveBeenCalled();
    expect(estado.esFavorito('p0')).toBe(false);
  });
});

describe('AnadeALaCesta', () => {
  /**
   * El doble es el PUERTO PÚBLICO de «cart», no un cliente HTTP. Es justo lo que arregló el fallo: este
   * caso de uso escribía un `PUT /me/cart` por su cuenta y la cesta de la aplicación —la que cuenta la
   * insignia de la cabecera y la que pinta el carrito— no se enteraba de nada. Eran dos cestas.
   */
  function monta(estado: 'anadido' | 'sin-existencias' = 'anadido') {
    const anade = vi.fn().mockResolvedValue({ estado, sugiereAhorroDeEnvio: false });
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        { provide: CATALOGO_PORT, useValue: { ficha: vi.fn() } },
        { provide: CESTA_PORT, useValue: { productosQueLleva: vi.fn() } },
        {
          provide: ANADIR_AL_CARRITO_PORT,
          useValue: { unidades: () => 0, anade, abreElCajon: vi.fn() },
        },
      ],
    });
    return { caso: TestBed.inject(AnadeALaCesta), anade };
  }

  const tarjeta = (precio: ResumenDeProducto['precio']): ResumenDeProducto => ({
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro',
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio,
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
  });

  /** El coste del proveedor ya no viaja fuera del panel: sin precio de venta la cesta quedaría a cero. */
  it('desde la tarjeta manda el precio de venta con SU divisa', async () => {
    const { caso, anade } = monta();

    await caso.desdeLaTarjeta(tarjeta({ formateado: '10,00 €', importe: 10, divisa: 'EUR' }));

    expect(anade).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', slug: 'gorro', precioMostrado: 10, divisaMostrada: 'EUR' }),
    );
  });

  /**
   * Desde una tarjeta no hay nada elegido y la variante la resuelve la cesta, que ya pide la ficha
   * recortada a lo que necesita. Resolverla aquí obligaba a pedir la ficha ENTERA —galería, reseñas,
   * cumplimiento— para acabar usando cuatro campos.
   */
  it('desde la tarjeta no impone ninguna variante', async () => {
    const { caso, anade } = monta();

    await caso.desdeLaTarjeta(tarjeta({}));

    expect(anade.mock.calls[0][0].eleccion).toBeUndefined();
  });

  it('desde la ficha manda la variante ELEGIDA, sus unidades y su precio', async () => {
    const conVariantes = ficha({
      variantes: [
        { id: 'v1', existencias: 0, opciones: { Talla: 'S' }, activa: true },
        { id: 'v2', sku: 'SKU-2', existencias: 4, opciones: { Talla: 'M' }, activa: true, precio: 8 },
      ],
    });
    const { caso, anade } = monta();

    await caso.conVariante(conVariantes, conVariantes.variantes[1], 2);

    expect(anade).toHaveBeenCalledWith(
      expect.objectContaining({
        precioMostrado: 8,
        eleccion: expect.objectContaining({
          varianteId: 'v2',
          sku: 'SKU-2',
          etiquetaDeVariante: 'M',
          precioUnitario: 8,
          cantidad: 2,
        }),
      }),
    );
  });

  /**
   * El detalle del catálogo NO devuelve `mainImage` —solo lo hace el listado—, así que en la ficha
   * ese campo viene siempre vacío y la línea llegaba a la cesta sin imagen: en la cesta y en el pago
   * salía un hueco gris con el nombre al lado.
   */
  it('la imagen de la línea sale de la galería cuando la ficha no trae principal', async () => {
    const conGaleria = ficha({
      imagenPrincipal: undefined,
      imagenes: [
        { id: 'i1', direccion: 'https://cdn/segunda.jpg', posicion: 1, papel: 'GALLERY' },
        { id: 'i2', direccion: 'https://cdn/principal.jpg', posicion: 0, papel: 'MAIN' },
      ],
    });
    const { caso, anade } = monta();

    await caso.conVariante(conGaleria, undefined, 1);

    expect(anade).toHaveBeenCalledWith(
      expect.objectContaining({ imagen: 'https://cdn/principal.jpg' }),
    );
  });

  /** Añadir a ciegas acaba en pedidos con la talla equivocada. */
  it('no añade nada si la ficha dice que no queda ninguna variante', async () => {
    const { caso, anade } = monta();

    const resultado = await caso.conVariante(ficha(), 'ninguna-disponible', 1);

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && esMotivoDeRechazo(resultado.error)).toBe(true);
    expect(anade).not.toHaveBeenCalled();
  });

  it('sin precio de venta no se añade: sería inventárselo', async () => {
    const sinPrecio = ficha({ precio: { divisa: 'EUR' } });
    const { caso, anade } = monta();

    const resultado = await caso.conVariante(sinPrecio, undefined, 1);

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error).toBe('sin-precio');
    expect(anade).not.toHaveBeenCalled();
  });

  /** Quien resuelve la variante es la cesta; si dice que no queda ninguna, se traduce a un rechazo. */
  it('propaga como rechazo que la cesta no encuentre existencias', async () => {
    const { caso } = monta('sin-existencias');

    const resultado = await caso.desdeLaTarjeta(tarjeta({}));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && esMotivoDeRechazo(resultado.error)).toBe(true);
  });
});

describe('AbreLaFicha', () => {
  function monta(haySesion: boolean, anota = vi.fn().mockResolvedValue(exito(undefined))) {
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        {
          provide: CATALOGO_PORT,
          useValue: { ficha: vi.fn().mockResolvedValue(exito(ficha())) },
        },
        { provide: HISTORIAL_PORT, useValue: { anota, lista: vi.fn() } },
      ],
    });
    if (haySesion) {
      TestBed.inject(SesionActual).publica({
        id: 'u1',
        rol: 'USER',
        nombreVisible: 'Ana',
        pais: 'ES',
      });
    }
    return { caso: TestBed.inject(AbreLaFicha), anota };
  }

  /** Sin usuario no hay a quién asociar la visita: a un anónimo ni se le intenta anotar. */
  it('no anota la visita sin sesión', async () => {
    const { caso, anota } = monta(false);
    await caso.ejecuta('gorro');
    expect(anota).not.toHaveBeenCalled();
  });

  it('anota una sola vez por producto', async () => {
    const { caso, anota } = monta(true);
    await caso.ejecuta('gorro');
    await caso.ejecuta('gorro');
    expect(anota).toHaveBeenCalledTimes(1);
  });
});

describe('BuscaProductos', () => {
  function monta(
    busca = vi
      .fn()
      .mockResolvedValue(exito({ items: [], pagina: 0, tamano: 36, total: 0, totalDePaginas: 0 })),
  ) {
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        { provide: CATALOGO_PORT, useValue: { busca } },
        {
          provide: CESTA_PORT,
          useValue: { productosQueLleva: vi.fn().mockResolvedValue(exito(['p9'])), anade: vi.fn() },
        },
      ],
    });
    return {
      caso: TestBed.inject(BuscaProductos),
      busca,
      referencia: TestBed.inject(ReferenciaDeCestaStore),
    };
  }

  /** Un slug donde va un identificador dejaba la pantalla con el esqueleto puesto para siempre. */
  it('no llega a pedir nada con una categoría que no es un identificador', async () => {
    const { caso, busca } = monta();
    const resultado = await caso.ejecuta({
      criterio: { ...CRITERIO_VACIO, categoria: 'moda-mujer' },
      pagina: 0,
      tamano: 36,
    });
    expect(resultado.ok).toBe(false);
    expect(busca).not.toHaveBeenCalled();
  });

  it('adjunta lo que ya lleva el comprador, que es la referencia del arancel', async () => {
    const { caso, busca, referencia } = monta();
    await caso.refrescaLaReferencia();
    expect(referencia.productos()).toEqual(['p9']);
    await caso.ejecuta({ criterio: CRITERIO_VACIO, pagina: 0, tamano: 36 });
    expect(busca).toHaveBeenCalledWith(expect.objectContaining({ productosEnLaCesta: ['p9'] }));
  });
});

describe('PublicaResena', () => {
  /** Dejar teclear el nombre con la cuenta abierta permitiría firmar con el nombre de otro. */
  it('firma con el nombre de la sesión, no con el tecleado', async () => {
    const publica = vi.fn().mockResolvedValue(exito(undefined));
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        { provide: RESENAS_PORT, useValue: { publica, lista: vi.fn() } },
      ],
    });
    TestBed.inject(SesionActual).publica({
      id: 'u1',
      rol: 'USER',
      nombreVisible: 'Ana',
      pais: 'ES',
    });
    await TestBed.inject(PublicaResena).ejecuta('p1', {
      valoracion: 5,
      titulo: '  Muy bien  ',
      cuerpo: '',
      autor: 'Impostor',
    });
    expect(publica).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ autor: 'Ana', titulo: 'Muy bien', cuerpo: undefined }),
    );
  });

  it('un invitado sí firma con lo que escribe', async () => {
    const publica = vi.fn().mockResolvedValue(exito(undefined));
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        { provide: RESENAS_PORT, useValue: { publica, lista: vi.fn() } },
      ],
    });
    await TestBed.inject(PublicaResena).ejecuta('p1', {
      valoracion: 4,
      titulo: '',
      cuerpo: 'Correcto',
      autor: 'Invitada',
    });
    expect(publica).toHaveBeenCalledWith('p1', expect.objectContaining({ autor: 'Invitada' }));
  });
});

describe('listas guardadas', () => {
  it('piden su página al puerto que les toca', async () => {
    const lista = vi
      .fn()
      .mockResolvedValue(exito({ items: [], pagina: 1, tamano: 24, total: 0, totalDePaginas: 0 }));
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        { provide: FAVORITOS_PORT, useValue: { lista } },
        { provide: HISTORIAL_PORT, useValue: { lista } },
      ],
    });
    await TestBed.inject(ListaFavoritos).ejecuta(1);
    await TestBed.inject(ListaHistorial).ejecuta(2);
    expect(lista).toHaveBeenNthCalledWith(1, 1, 24);
    expect(lista).toHaveBeenNthCalledWith(2, 2, 24);
  });
});
