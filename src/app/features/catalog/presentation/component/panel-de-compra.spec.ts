import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RolDeSesion, SesionActual } from '@core/auth/sesion-actual';
import { EDICION_DE_FICHA_PORT } from '../../domain/port/edicion-de-ficha.port';
import { EjeDeVariante, FichaDeProducto } from '../../domain/model/producto';
import { SeleccionDeLaFicha } from '../seleccion-de-la-ficha';
import { PanelDeCompra } from './panel-de-compra';
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

function eje(nombre: string, valores: string[]): EjeDeVariante {
  return {
    id: nombre,
    nombreZh: nombre,
    nombre,
    posicion: 0,
    valores: valores.map((valor, i) => ({
      id: `${nombre}-${i}`,
      valorZh: valor,
      valor,
      posicion: i,
    })),
  };
}

function ficha(cambios: Partial<FichaDeProducto> = {}): FichaDeProducto {
  return {
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro de lana',
    ventasMensuales: 0,
    valoracion: 4.2,
    estado: 'ACTIVE',
    precio: { formateado: '9,90 €', importe: 9.9, divisa: 'EUR' },
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    origen: '1688',
    idExterno: 'EXT',
    moq: 1,
    numeroDeResenas: 7,
    imagenes: [],
    variantes: [{ id: 'v1', existencias: 4, opciones: {}, activa: true }],
    ejesDeVariante: [],
    tramosDePrecio: [],
    especificaciones: [],
    atributos: {},
    ...cambios,
  };
}

async function monta(entrada: FichaDeProducto, rol?: RolDeSesion) {
  const anade = vi.fn();
  const marcaFavorito = vi.fn();
  const vista = await render(PanelDeCompra, {
    inputs: { ficha: entrada },
    on: { anade, marcaFavorito },
    providers: [
      ...APLICACION_DEL_CATALOGO,
      CESTA_DE_OTRO_CONTEXTO,
      SeleccionDeLaFicha,
      { provide: EDICION_DE_FICHA_PORT, useValue: {} },
    ],
  });
  const seleccion = vista.fixture.debugElement.injector.get(SeleccionDeLaFicha);
  seleccion.empieza(entrada);
  if (rol) {
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol, nombreVisible: 'Ana', pais: 'ES' });
  }
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  return { vista, anade, marcaFavorito, seleccion };
}

describe('PanelDeCompra', () => {
  /**
   * El reparto de la ficha entre los dos papeles internos, que es TODO el rol de revisor.
   *
   * <p>El bloque de origen y el desglose de precio están pegados en la misma columna y colgaban del
   * mismo `esAdministrador()`. Al abrir el origen al revisor hay que comprobar que el desglose NO se
   * fue con él: son el coste, el margen y las dos bolsas de subvención. El backend además se lo vacía
   * —hay prueba propia—, pero eso no vuelve superflua esta: si el `@if` se relajara, bastaría con que
   * alguien devolviera el desglose por otro camino para publicárselo.
   */
  /**
   * Los dos bloques cuelgan de condiciones DISTINTAS y hay que verlo: el de origen mira
   * `puedeRevisarFichas()`, el desglose sigue mirando `esAdministrador()`. Colgaban los dos del mismo
   * sitio, y si alguien los volviera a juntar, el revisor vería el coste y el margen.
   *
   * <p>El contenido va en `@defer`, que en pruebas no se resuelve, así que se cuentan los BLOQUES
   * diferidos: cuando el `@if` de fuera es falso, el bloque ni llega a crearse. Con ficha completa,
   * el administrador tiene los dos, el revisor solo el de origen y quien compra ninguno.
   */
  async function bloquesDeAdministracion(rol: RolDeSesion | undefined) {
    const conDesglose = ficha({
      urlDeOrigen: 'https://detail.1688.com/offer/1.html',
      desglose: { baseFormateado: '11,43 €', ivaFormateado: '1,49 €', recargoCny: 8.98 },
    });
    const { vista } = await monta(conDesglose, rol);
    return { cuantos: (await vista.fixture.getDeferBlocks()).length, vista };
  }

  it('el revisor ve el bloque de origen y NO el desglose de precio', async () => {
    const { cuantos, vista } = await bloquesDeAdministracion('REVIEWER');

    expect(vista.container.querySelector('div.order-3')).not.toBeNull();
    expect(cuantos).toBe(1);
  });

  it('el administrador ve los dos', async () => {
    const { cuantos, vista } = await bloquesDeAdministracion('ADMIN');

    expect(vista.container.querySelector('div.order-3')).not.toBeNull();
    expect(cuantos).toBe(2);
  });

  it('quien compra no ve ninguno', async () => {
    const { cuantos, vista } = await bloquesDeAdministracion('USER');

    expect(vista.container.querySelector('div.order-3')).toBeNull();
    expect(cuantos).toBe(0);
  });

  it('enseña el título, la valoración y el precio', async () => {
    await monta(ficha());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Gorro de lana');
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('9,90 €')).toBeInTheDocument();
  });

  it('avisa a quien lo monta al pulsar añadir', async () => {
    const { vista, anade } = await monta(ficha());
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-outline')!);
    expect(anade).toHaveBeenCalled();
  });

  /** Un botón apagado sin decir por qué es un callejón: lo que tiene arreglo se explica al pulsar. */
  it('con color por elegir el botón se apaga', async () => {
    const conColores = ficha({ ejesDeVariante: [eje('Color', [])] });
    const { vista, seleccion } = await monta(conColores);
    seleccion.empieza({
      ...conColores,
      ejesDeVariante: [eje('Color', ['Rojo'])],
    });
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('button.btn-primary')).toBeDisabled();
  });

  it('sin sesión no ofrece el corazón', async () => {
    const { vista } = await monta(ficha());
    expect(vista.container.textContent).not.toContain('product.add_favorite');
  });

  it('con tallas enseña la tabla en vez del selector simple', async () => {
    const conTallas = ficha({
      ejesDeVariante: [eje('Talla', ['S', 'M'])],
      variantes: [{ id: 'v1', existencias: 2, opciones: { Talla: 'S' }, activa: true }],
    });
    const { vista } = await monta(conTallas);
    expect(vista.container.querySelectorAll('input[type=number]').length).toBeGreaterThan(0);
  });

  /** El código externo y el enlace al proveedor no pueden llegar a quien compra. */
  it('el bloque de administración solo existe para el administrador', async () => {
    const sinAdmin = await monta(ficha());
    expect(sinAdmin.vista.container.textContent).not.toContain('EXT');
  });

  it('comprar ahora también avisa a quien lo monta', async () => {
    const compraAhora = vi.fn();
    const entrada = ficha();
    const vista = await render(PanelDeCompra, {
      inputs: { ficha: entrada },
      on: { compraAhora },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        SeleccionDeLaFicha,
        { provide: EDICION_DE_FICHA_PORT, useValue: {} },
      ],
    });
    vista.fixture.debugElement.injector.get(SeleccionDeLaFicha).empieza(entrada);
    vista.fixture.detectChanges();
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-primary')!);
    expect(compraAhora).toHaveBeenCalled();
  });

  it('con sesión ofrece el corazón y avisa al pulsarlo', async () => {
    const marcaFavorito = vi.fn();
    const entrada = ficha();
    const vista = await render(PanelDeCompra, {
      inputs: { ficha: entrada },
      on: { marcaFavorito },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        SeleccionDeLaFicha,
        { provide: EDICION_DE_FICHA_PORT, useValue: {} },
      ],
    });
    vista.fixture.debugElement.injector.get(SeleccionDeLaFicha).empieza(entrada);
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol: 'USER', nombreVisible: 'Ana', pais: 'ES' });
    vista.fixture.detectChanges();
    const corazon = [...vista.container.querySelectorAll<HTMLElement>('button.btn-sm')].at(-1)!;
    await userEvent.click(corazon);
    expect(marcaFavorito).toHaveBeenCalled();
  });

  it('el distintivo de arancel avisa al pedir su filtro', async () => {
    const filtraPorGrupo = vi.fn();
    const entrada = ficha({
      arancel: { centimosExtra: 300, formateado: '3,00 €', cubierto: false, grupo: 'g1' },
    });
    const vista = await render(PanelDeCompra, {
      inputs: { ficha: entrada },
      on: { filtraPorGrupo },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        SeleccionDeLaFicha,
        { provide: EDICION_DE_FICHA_PORT, useValue: {} },
      ],
    });
    vista.fixture.debugElement.injector.get(SeleccionDeLaFicha).empieza(entrada);
    vista.fixture.detectChanges();
    const filtro = [...vista.container.querySelectorAll<HTMLElement>('button')].find((b) =>
      b.classList.contains('underline'),
    )!;
    await userEvent.click(filtro);
    expect(filtraPorGrupo).toHaveBeenCalled();
  });

  it('elegir color y cambiar cantidades llega a quien lo monta', async () => {
    const eligeColor = vi.fn();
    const cambia = vi.fn();
    const entrada = ficha({
      ejesDeVariante: [eje('Color', ['Rojo', 'Azul']), eje('Talla', ['S'])],
      variantes: [
        { id: 'v1', existencias: 2, opciones: { Color: 'Rojo', Talla: 'S' }, activa: true },
        { id: 'v2', existencias: 2, opciones: { Color: 'Azul', Talla: 'S' }, activa: true },
      ],
    });
    const vista = await render(PanelDeCompra, {
      inputs: { ficha: entrada },
      on: { eligeColor, cambia },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        SeleccionDeLaFicha,
        { provide: EDICION_DE_FICHA_PORT, useValue: {} },
      ],
    });
    vista.fixture.debugElement.injector.get(SeleccionDeLaFicha).empieza(entrada);
    vista.fixture.detectChanges();

    await userEvent.click(screen.getByTitle('Azul'));
    vista.fixture.detectChanges();
    expect(eligeColor).toHaveBeenCalled();

    const sumar = [...vista.container.querySelectorAll<HTMLElement>('.join button')].at(-1)!;
    await userEvent.click(sumar);
    vista.fixture.detectChanges();
    expect(cambia).toHaveBeenCalled();
  });
});
