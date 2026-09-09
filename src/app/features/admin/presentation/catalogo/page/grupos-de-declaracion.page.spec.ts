import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { GrupoDeDeclaracion } from '../../../domain/catalogo/model/grupo-de-declaracion';
import {
  CambiaAprobacionDeGrupo,
  GuardaDescripcionDeGrupo,
  ListaGruposDeDeclaracion,
  SiembraGruposDeDeclaracion,
} from '../../../application/catalogo/use-case/administra-grupos-de-declaracion.use-case';
import { GruposDeDeclaracionPage } from './grupos-de-declaracion.page';

/**
 * Los grupos de declaración aduanera: la terna HS6 + material + uso con la que se declara cada envío.
 *
 * <p>Lo que hay que dejar fijado —y es la razón de que esta pantalla exista aparte— es que **guardar el
 * texto DESAPRUEBA el grupo**. No es un efecto colateral que se pueda perder en un refactor: cambiar la
 * descripción es cambiar lo que se declara ante veintisiete aduanas, así que el texto nuevo tiene que
 * volver a pasar por una aprobación. Y hay que DECIRLO, o quien lo edita se va creyendo que el grupo
 * sigue aprobado.
 */
const GRUPO: GrupoDeDeclaracion = {
  id: 'd1',
  hs6: '610910',
  material: 'algodón',
  codigoDeUso: 'ropa',
  nombreEn: 'Cotton t-shirt',
  nombreZh: '棉质T恤',
  numeroDeProductos: 42,
  aprobado: true,
  sinRedactar: false,
};

interface Opciones {
  grupos?: readonly GrupoDeDeclaracion[];
  guardar?: 'falla';
  siembra?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const lista = vi.fn(async () => exito(opciones.grupos ?? [GRUPO]));
  const guarda = vi.fn(async (_id: string, _en: string, _zh: string) =>
    opciones.guardar === 'falla'
      ? fallo(creaError('peticion-invalida', 'La descripción es obligatoria'))
      : exito(undefined),
  );
  const cambia = vi.fn(async (_g: GrupoDeDeclaracion, _aprobar: boolean) => exito(undefined));
  const siembra = vi.fn(async () =>
    opciones.siembra === 'falla' ? fallo(creaError('error-del-servidor')) : exito(17),
  );

  const vista = await render(GruposDeDeclaracionPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      { provide: ListaGruposDeDeclaracion, useValue: { ejecuta: lista } },
      { provide: GuardaDescripcionDeGrupo, useValue: { ejecuta: guarda } },
      { provide: CambiaAprobacionDeGrupo, useValue: { ejecuta: cambia } },
      { provide: SiembraGruposDeDeclaracion, useValue: { ejecuta: siembra } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return {
    vista,
    asienta,
    lista,
    guarda,
    cambia,
    siembra,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
  };
}

describe('GruposDeDeclaracionPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('enseña cada terna con su descripción y su recuento', async () => {
    await monta();

    expect(screen.getByText(/610910/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cotton t-shirt')).toBeInTheDocument();
  });

  it('sin grupos explica cómo conseguirlos', async () => {
    await monta({ grupos: [] });

    expect(screen.getByText(/Siémbralos desde el catálogo/)).toBeInTheDocument();
  });

  /** Lo que no se puede perder: el texto nuevo vuelve a necesitar aprobación, y hay que decirlo. */
  it('al guardar el texto se avisa de que vuelve a necesitar aprobación', async () => {
    const { guarda, lista, asienta } = await monta();
    lista.mockClear();

    const ingles = screen.getByDisplayValue('Cotton t-shirt');
    await userEvent.clear(ingles);
    await userEvent.type(ingles, 'Cotton tee');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await asienta();

    expect(guarda).toHaveBeenCalledWith('d1', 'Cotton tee', '棉质T恤');
    expect(screen.getByText(/vuelve a necesitar aprobación/)).toBeInTheDocument();
    expect(lista, 'la tabla se ha quedado con el estado viejo').toHaveBeenCalled();
  });

  it('si el guardado falla, se dice y NO se anuncia la desaprobación', async () => {
    const { avisos, asienta } = await monta({ guardar: 'falla' });

    const ingles = screen.getByDisplayValue('Cotton t-shirt');
    await userEvent.clear(ingles);
    await userEvent.type(ingles, 'Cotton tee');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await asienta();

    expect(avisos.avisos().at(-1)?.mensaje).toBe('La descripción es obligatoria');
    expect(screen.queryByText(/vuelve a necesitar aprobación/)).toBeNull();
  });

  it('quitar la aprobación llega al backend y limpia el aviso', async () => {
    const { cambia, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: 'Retirar aprobación' }));
    await asienta();

    expect(cambia).toHaveBeenCalledWith(GRUPO, false);
  });

  it('sembrar dice cuántos grupos se han creado', async () => {
    const { siembra, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Sembrar desde el catálogo/ }));
    await asienta();

    expect(siembra).toHaveBeenCalled();
    expect(screen.getByText(/17 grupos creados/)).toBeInTheDocument();
  });

  it('si la siembra falla, se dice y el botón se suelta', async () => {
    const { avisos, asienta } = await monta({ siembra: 'falla' });

    await userEvent.click(screen.getByRole('button', { name: /Sembrar desde el catálogo/ }));
    await asienta();

    expect(avisos.avisos().at(-1)?.tipo).toBe('error');
    expect(screen.getByRole('button', { name: /Sembrar desde el catálogo/ })).not.toBeDisabled();
  });
});
