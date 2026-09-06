import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FichaDeProducto } from '../../domain/model/producto';
import { VistaRapida } from './vista-rapida';

function ficha(cambios: Partial<FichaDeProducto> = {}): FichaDeProducto {
  return {
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro de lana',
    ventasMensuales: 42,
    valoracion: 4.5,
    estado: 'ACTIVE',
    precio: { formateado: '9,90 €', importe: 9.9, divisa: 'EUR' },
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    origen: '1688',
    idExterno: '1',
    moq: 3,
    numeroDeResenas: 0,
    descripcion: 'Lana merina',
    imagenes: [
      { id: 'i1', direccion: 'a.jpg', posicion: 0, papel: 'MAIN' },
      { id: 'i2', direccion: 'b.jpg', posicion: 1, papel: 'GALLERY' },
    ],
    variantes: [],
    ejesDeVariante: [],
    tramosDePrecio: [],
    especificaciones: [],
    atributos: {},
    ...cambios,
  };
}

async function monta(
  opciones: { devuelve?: unknown; anade?: ReturnType<typeof vi.fn>; slug?: string | null } = {},
) {
  const anade = opciones.anade ?? vi.fn().mockResolvedValue(exito(undefined));
  const cierra = vi.fn();
  const vista = await render(VistaRapida, {
    inputs: { slug: opciones.slug === undefined ? 'gorro' : opciones.slug },
    on: { cierra },
    providers: [
      provideRouter([]),
      {
        provide: CATALOGO_PORT,
        useValue: { ficha: async () => opciones.devuelve ?? exito(ficha()) },
      },
      { provide: CESTA_PORT, useValue: { anade, productosQueLleva: vi.fn() } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista, anade, cierra };
}

describe('VistaRapida', () => {
  /** Nula = cerrada: no puede quedarse un fondo negro sobre la página que se estaba mirando. */
  it('sin producto no se pinta', async () => {
    const { vista } = await monta({ slug: null });
    expect(vista.container.querySelector('[role=dialog]')).toBeNull();
  });

  it('enseña lo mismo que la ficha, sin salir de donde estás', async () => {
    await monta();
    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
    expect(screen.getByText('9,90 €')).toBeInTheDocument();
    expect(screen.getByText('Lana merina')).toBeInTheDocument();
  });

  it('el pedido mínimo se dice también aquí', async () => {
    const { vista } = await monta();
    expect(vista.container.textContent).toContain('3');
  });

  it('pasa de foto y da la vuelta en los extremos', async () => {
    const { vista } = await monta();
    await userEvent.click(screen.getByLabelText(/prev|anterior/i));
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('img')).toHaveAttribute('src', 'b.jpg');
  });

  it('añade a la cesta y lo confirma', async () => {
    const { vista, anade } = await monta();
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-primary')!);
    await vista.fixture.whenStable();
    expect(anade).toHaveBeenCalled();
    expect(vista.fixture.debugElement.injector.get(AvisosStore).avisos()[0].tipo).toBe('success');
  });

  /** Añadir a ciegas acaba en pedidos con la talla equivocada. */
  it('sin variantes disponibles avisa y no añade', async () => {
    const agotado = ficha({ variantes: [{ id: 'v', existencias: 0, opciones: {}, activa: true }] });
    const { vista, anade } = await monta({ devuelve: exito(agotado) });
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-primary')!);
    await vista.fixture.whenStable();
    expect(anade).not.toHaveBeenCalled();
    expect(vista.fixture.debugElement.injector.get(AvisosStore).avisos()[0].tipo).toBe('error');
  });

  it('si la ficha no carga lo dice', async () => {
    const { vista } = await monta({ devuelve: fallo(creaError('sin-conexion')) });
    expect(vista.container.querySelector('[role=dialog]')).not.toBeNull();
    expect(vista.container.querySelector('button.btn-primary')).toBeNull();
  });

  it('el aspa cierra', async () => {
    const { vista, cierra } = await monta();
    await userEvent.click(vista.container.querySelectorAll<HTMLElement>('button')[0]);
    expect(cierra).toHaveBeenCalled();
  });
});
