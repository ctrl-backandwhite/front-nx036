import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SesionActual } from '@core/auth/sesion-actual';
import { EDICION_DE_FICHA_PORT } from '../../domain/port/edicion-de-ficha.port';
import { EjeDeVariante, FichaDeProducto } from '../../domain/model/producto';
import { SeleccionDeLaFicha } from '../seleccion-de-la-ficha';
import { PanelDeCompra } from './panel-de-compra';

function eje(nombre: string, valores: string[]): EjeDeVariante {
  return {
    id: nombre,
    nombreZh: nombre,
    nombre,
    posicion: 0,
    valores: valores.map((valor, i) => ({ id: `${nombre}-${i}`, valorZh: valor, valor, posicion: i })),
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

async function monta(entrada: FichaDeProducto, esAdministrador = false) {
  const anade = vi.fn();
  const marcaFavorito = vi.fn();
  const vista = await render(PanelDeCompra, {
    inputs: { ficha: entrada },
    on: { anade, marcaFavorito },
    providers: [SeleccionDeLaFicha, { provide: EDICION_DE_FICHA_PORT, useValue: {} }],
  });
  const seleccion = vista.fixture.debugElement.injector.get(SeleccionDeLaFicha);
  seleccion.empieza(entrada);
  if (esAdministrador) {
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol: 'ADMIN', nombreVisible: 'Ana', pais: 'ES' });
  }
  vista.fixture.detectChanges();
  return { vista, anade, marcaFavorito, seleccion };
}

describe('PanelDeCompra', () => {
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
      variantes: [
        { id: 'v1', existencias: 2, opciones: { Talla: 'S' }, activa: true },
      ],
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
      providers: [SeleccionDeLaFicha, { provide: EDICION_DE_FICHA_PORT, useValue: {} }],
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
      providers: [SeleccionDeLaFicha, { provide: EDICION_DE_FICHA_PORT, useValue: {} }],
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
      providers: [SeleccionDeLaFicha, { provide: EDICION_DE_FICHA_PORT, useValue: {} }],
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
      providers: [SeleccionDeLaFicha, { provide: EDICION_DE_FICHA_PORT, useValue: {} }],
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
