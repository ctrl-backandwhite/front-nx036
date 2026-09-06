import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import {
  AlternaLaPromocion,
  AnunciaLaPromocion,
  BorraLaPromocion,
  ConsultaCategoriasDePromocion,
  ConsultaPromociones,
  GuardaLaPromocion,
} from '../../../application/gestion/use-case/promociones.use-case';
import { Promocion } from '../../../domain/gestion/model/promociones';
import { PROMOCIONES_PORT } from '../../../domain/gestion/port/promociones.port';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';
import { PromocionesPage } from './promociones.page';

const promocion = (parcial: Partial<Promocion> = {}): Promocion => ({
  id: 'p1',
  nombre: 'Rebajas de enero',
  clase: 'SEASONAL',
  ambito: 'ALL',
  porcentaje: 20,
  activa: true,
  vigente: true,
  prioridad: 0,
  usos: 3,
  categorias: [],
  productos: [],
  ...parcial,
});

function enEspanolYEnDolares(): void {
  document.cookie = 'nx036-locale=es';
  document.cookie = 'nx036-currency=USD';
}

/**
 * Plazo generoso por prueba.
 *
 * <p>Montar la pantalla arranca el diccionario de la interfaz y los iconos, y estas pruebas se ejecutan
 * en una máquina compartida con las demás pasadas. Con los cinco segundos de serie, bajo carga fallaba
 * por tiempo agotado una prueba distinta en cada pasada, sin que nada estuviera roto. Un fallo de verdad
 * sigue saliendo al instante, porque es una comprobación que no casa, no una espera.
 */
const PLAZO = 20_000;

describe('PromocionesPage', () => {
  const puerto = {
    lista: vi.fn(),
    crea: vi.fn(),
    actualiza: vi.fn(),
    alterna: vi.fn(),
    anuncia: vi.fn(),
    borra: vi.fn(),
    categorias: vi.fn(),
  };
  const dialogo = { alerta: vi.fn(), confirma: vi.fn() };

  const monta = () =>
    render(PromocionesPage, {
      providers: [
        { provide: PROMOCIONES_PORT, useValue: puerto },
        { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
        { provide: DialogoStore, useValue: dialogo },
        ConsultaPromociones,
        GuardaLaPromocion,
        AlternaLaPromocion,
        AnunciaLaPromocion,
        BorraLaPromocion,
        ConsultaCategoriasDePromocion,
        ImportesStore,
      ],
    });

  beforeEach(() => {
    enEspanolYEnDolares();
    vi.resetAllMocks();
    puerto.lista.mockResolvedValue(exito([promocion()]));
    puerto.categorias.mockResolvedValue(exito([{ id: 'c1', nombre: 'Moda' }]));
    puerto.crea.mockResolvedValue(exito(undefined));
    puerto.anuncia.mockResolvedValue(exito(120));
    puerto.borra.mockResolvedValue(exito(undefined));
  }, PLAZO);

  it('lee la promoción con su descuento y su alcance', async () => {
    await monta();

    expect(await screen.findByText('Rebajas de enero')).toBeInTheDocument();
    expect(screen.getByText('-20%')).toBeInTheDocument();
    expect(screen.getByText('Todo el catálogo')).toBeInTheDocument();
  }, PLAZO);

  /**
   * Se cuenta si está DESCONTANDO ahora, no la casilla de activa: una promoción activa fuera de fechas
   * no rebaja nada, y pintarla igual que una viva haría creer que el escaparate está de rebajas.
   */
  it('una promoción activa pero fuera de fechas no se cuenta como viva', async () => {
    puerto.lista.mockResolvedValue(exito([promocion({ activa: true, vigente: false })]));

    await monta();
    await screen.findByText('Rebajas de enero');

    expect(screen.getByTitle('Activa pero fuera de fechas')).toBeInTheDocument();
  }, PLAZO);

  /** Avisar escribe a toda la base de usuarios y no se puede retirar: se pregunta antes. */
  it('anunciar pide confirmación y dice a cuánta gente se avisó', async () => {
    dialogo.confirma.mockResolvedValue(true);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Avisar a los usuarios' }));

    expect(puerto.anuncia).toHaveBeenCalledWith('p1');
    expect(dialogo.alerta).toHaveBeenCalledWith('Avisados 120 usuarios');
  }, PLAZO);

  it('si no se confirma, no se avisa a nadie', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Avisar a los usuarios' }));

    expect(puerto.anuncia).not.toHaveBeenCalled();
  }, PLAZO);

  it('borrar pregunta con el nombre de la promoción', async () => {
    dialogo.confirma.mockResolvedValue(true);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(dialogo.confirma).toHaveBeenCalledWith('¿Eliminar la promoción «Rebajas de enero»?');
    expect(puerto.borra).toHaveBeenCalledWith('p1');
  }, PLAZO);

  it('si la lectura falla se queda con el rótulo de que no hay ninguna', async () => {
    puerto.lista.mockResolvedValue(fallo(creaError('error-del-servidor')));

    await monta();

    expect(await screen.findByText('Todavía no hay ninguna promoción.')).toBeInTheDocument();
  }, PLAZO);

  it('un rechazo al guardar se enseña dentro del editor', async () => {
    puerto.crea.mockResolvedValue(
      fallo(creaError('peticion-invalida', 'Ese código ya está en uso')),
    );

    const vista = await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva' }));
    vista.fixture.detectChanges();
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Verano');
    vista.fixture.detectChanges();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    vista.fixture.detectChanges();

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese código ya está en uso');
  }, PLAZO);

  /** Sin código es una rebaja automática: el código vacío no puede viajar como cadena en blanco. */
  it('sin código se manda «sin código», no una cadena vacía', async () => {
    const vista = await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva' }));
    vista.fixture.detectChanges();
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Verano');
    vista.fixture.detectChanges();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    vista.fixture.detectChanges();

    expect(puerto.crea).toHaveBeenCalledOnce();
    expect(puerto.crea.mock.calls[0][0].codigo).toBeUndefined();
  }, PLAZO);
});
