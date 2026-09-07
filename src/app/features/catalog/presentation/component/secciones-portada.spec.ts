import { DeferBlockBehavior } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { Portada } from '../../domain/model/catalogo-auxiliar';
import { ResumenDeProducto } from '../../domain/model/producto';
import { CATALOGO_PORT, PORTADA_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { ANADIR_AL_CARRITO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { APLICACION_DEL_CATALOGO } from '../../catalog.providers';
import { SeccionesPortada } from './secciones-portada';

/**
 * Las hileras de la portada.
 *
 * <p>Lo que se fija aquí es qué se ve CUANDO NO HAY DATOS, que era el agujero: si la petición fallaba,
 * este bloque no pintaba absolutamente nada. La portada salía con su marco intacto y sin una sola
 * hilera, o sea indistinguible de un catálogo recién montado que todavía no tiene productos. Quien
 * entra concluye que la tienda está vacía y se va.
 *
 * <p>Ahora se dice lo que pasa y se ofrece reintentar SOLO este bloque: recargar la página entera para
 * recuperar unas hileras es desproporcionado, y además pierde el sitio donde se estaba.
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

function producto(parcial: Partial<ResumenDeProducto> = {}): ResumenDeProducto {
  return {
    id: 'p1',
    slug: 'gorro-de-lana',
    titulo: 'Gorro de lana',
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: { formateado: '9,90 €' },
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    ...parcial,
  };
}

const PORTADA: Portada = {
  secciones: [
    { codigo: 'BESTSELLERS', titulo: 'Más vendidos', items: [producto()] },
    { codigo: 'NEWEST', titulo: 'Novedades', items: [producto({ id: 'p2', titulo: 'Bufanda' })] },
  ],
  categoriasDestacadas: [],
  totalDeProductos: 2,
};

async function monta(respuestas: Result<Portada, AppError>[]) {
  const pendientes = [...respuestas];
  const secciones = vi.fn(
    async (_porSeccion: number): Promise<Result<Portada, AppError>> =>
      pendientes.shift() ?? exito(PORTADA),
  );

  const vista = await render(SeccionesPortada, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: PORTADA_PORT, useValue: { secciones } },
      /* Lo que piden las tarjetas de producto de cada hilera. Se doblan a lo mínimo: aquí se comprueba
       * qué pinta la portada, no cómo se añade a la cesta ni cómo se marca un favorito. */
      { provide: CATALOGO_PORT, useValue: { ficha: vi.fn() } },
      { provide: CESTA_PORT, useValue: { productosQueLleva: vi.fn() } },
      {
        provide: ANADIR_AL_CARRITO_PORT,
        useValue: { unidades: () => 0, anade: vi.fn(), abreElCajon: vi.fn() },
      },
      { provide: FAVORITOS_PORT, useValue: {} },
      ...APLICACION_DEL_CATALOGO,
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await new Promise((sigue) => setTimeout(sigue, 0));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return { vista, asienta, secciones };
}

describe('SeccionesPortada', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('pinta una hilera por sección con sus productos', async () => {
    await monta([exito(PORTADA)]);

    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
    expect(screen.getByText('Bufanda')).toBeInTheDocument();
  });

  /** Un título sobre una fila vacía deja un hueco roto, que es lo que se ve en un catálogo recién montado. */
  it('una sección sin productos no pinta su encabezado', async () => {
    await monta([
      exito({ ...PORTADA, secciones: [{ codigo: 'BESTSELLERS', titulo: 'Más vendidos', items: [] }] }),
    ]);

    expect(screen.queryByRole('heading')).toBeNull();
  });

  describe('cuando la portada no carga', () => {
    /** Antes no se pintaba NADA: la tienda parecía vacía en vez de averiada. */
    it('lo DICE, en vez de dejar el hueco en blanco', async () => {
      const { vista } = await monta([fallo(creaError('sin-conexion'))]);

      expect(
        vista.fixture.nativeElement.querySelector('nx-contenido-no-disponible'),
      ).not.toBeNull();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('y reintentar vuelve a pedir SOLO este bloque', async () => {
      const { secciones, asienta } = await monta([fallo(creaError('sin-conexion')), exito(PORTADA)]);
      expect(secciones).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByRole('button'));
      await asienta();

      /* Recargar la página entera para recuperar unas hileras es desproporcionado, y pierde el sitio
       * donde se estaba mirando. */
      expect(secciones).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
    });
  });
});
