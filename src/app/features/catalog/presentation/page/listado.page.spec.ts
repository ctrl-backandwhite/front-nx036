import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { CATALOGO_PORT, TAXONOMIA_PORT } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { PaginaDeProductos } from '../../domain/model/producto';
import { ListadoPage } from './listado.page';

function pagina(cuantos: number, totalDePaginas = 1): PaginaDeProductos {
  return {
    items: Array.from({ length: cuantos }, (_, i) => ({
      id: `p${i}`,
      slug: `p${i}`,
      titulo: `Producto ${i}`,
      ventasMensuales: 0,
      estado: 'ACTIVE',
      precio: { formateado: '9,90 €' },
      arancel: { centimosExtra: null, cubierto: false, grupo: 'g1' },
      etiquetas: [],
    })),
    pagina: 0,
    tamano: 36,
    total: cuantos,
    totalDePaginas,
  };
}

async function monta(busca = vi.fn().mockResolvedValue(exito(pagina(2, 2)))) {
  const memoria = new Map<string, string>();
  const vista = await render(ListadoPage, {
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: RECUPERADOR_DE_SESION, useValue: { asegura: async () => undefined } },
      {
        provide: ALMACEN_LOCAL,
        useValue: {
          lee: (clave: string) => memoria.get(clave) ?? null,
          guarda: (clave: string, valor: string) => memoria.set(clave, valor),
          borra: (clave: string) => memoria.delete(clave),
        },
      },
      { provide: CATALOGO_PORT, useValue: { busca, ficha: vi.fn() } },
      {
        provide: TAXONOMIA_PORT,
        useValue: {
          arbolDeCategorias: async () =>
            exito([
              { id: 'c1', slug: 'gorros', nombre: 'Gorros', posicion: 0, cuantosProductos: 5, hijas: [] },
            ]),
          proveedores: async () => exito([]),
          categoriasRaiz: vi.fn(),
        },
      },
      {
        provide: CESTA_PORT,
        useValue: { productosQueLleva: async () => exito([]), anade: vi.fn() },
      },
      { provide: FAVORITOS_PORT, useValue: { identificadores: async () => exito([]) } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista, busca, memoria };
}

describe('ListadoPage', () => {
  it('pinta los productos que devuelve la búsqueda', async () => {
    await monta();
    expect(screen.getByText('Producto 0')).toBeInTheDocument();
  });

  /** El listado se conserva al ir a una ficha y volver, así que hace falta refrescar a mano. */
  it('refrescar vuelve a pedir desde la primera página con otra baraja', async () => {
    const { vista, busca } = await monta();
    const antes = busca.mock.calls.length;
    const refrescar = vista.container.querySelector<HTMLElement>('button.btn-outline')!;
    await userEvent.click(refrescar);
    await vista.fixture.whenStable();
    expect(busca.mock.calls.length).toBeGreaterThan(antes);
    expect(busca.mock.calls.at(-1)?.[0].pagina).toBe(0);
  });

  it('la forma de ver se recuerda entre visitas', async () => {
    const { vista, memoria } = await monta();
    const botones = vista.container.querySelectorAll<HTMLElement>('.join button');
    await userEvent.click(botones[1]);
    vista.fixture.detectChanges();
    expect(memoria.get('nx036-catalog-view')).toBe('list');
  });

  /** Un slug donde va un identificador dejaba la pantalla con el esqueleto puesto para siempre. */
  it('una categoría inválida no dispara ninguna consulta', async () => {
    const busca = vi.fn().mockResolvedValue(exito(pagina(0)));
    const { vista } = await monta(busca);
    await TestBed.inject(Router).navigate([], { queryParams: { categoryId: 'moda-mujer' } });
    await vista.fixture.whenStable();
    const conCategoria = busca.mock.calls.filter(
      (llamada) => llamada[0].criterio.categoria === 'moda-mujer',
    );
    expect(conCategoria).toHaveLength(0);
  });

  it('un fallo deja la lista vacía en vez de a medias', async () => {
    const { vista } = await monta(vi.fn().mockResolvedValue(fallo(creaError('error-del-servidor'))));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(screen.queryByText('Producto 0')).toBeNull();
  });

  it('con más páginas ofrece traer las siguientes', async () => {
    const { vista, busca } = await monta();
    const masBotones = [...vista.container.querySelectorAll<HTMLElement>('button')];
    const cargarMas = masBotones.at(-1)!;
    const antes = busca.mock.calls.length;
    await userEvent.click(cargarMas);
    await vista.fixture.whenStable();
    expect(busca.mock.calls.length).toBeGreaterThan(antes);
    expect(busca.mock.calls.at(-1)?.[0].pagina).toBe(1);
  });
});
