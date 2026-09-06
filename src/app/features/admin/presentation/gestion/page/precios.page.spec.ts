import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import {
  AlternaLaRegla,
  AlternaReglasEnLote,
  BorraLaRegla,
  BorraReglasEnLote,
  CargaLosAmbitos,
  ConsultaElAjusteDeMoq,
  ConsultaReglas,
  GuardaElAjusteDeMoq,
  GuardaLaRegla,
} from '../../../application/gestion/use-case/precios.use-case';
import { ReglaDePrecio } from '../../../domain/gestion/model/precios';
import {
  AMBITOS_DE_REGLA_PORT,
  PRECIOS_PORT,
} from '../../../domain/gestion/port/precios.port';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';
import { PreciosPage } from './precios.page';

const regla = (parcial: Partial<ReglaDePrecio> = {}): ReglaDePrecio => ({
  id: 'r1',
  ambito: 'GLOBAL',
  tipo: 'PERCENTAGE',
  valor: 30,
  activa: true,
  posicion: 0,
  descripcion: 'Margen general',
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

describe('PreciosPage', () => {
  const puerto = {
    reglas: vi.fn(),
    crea: vi.fn(),
    actualiza: vi.fn(),
    alterna: vi.fn(),
    borra: vi.fn(),
    alternaEnLote: vi.fn(),
    borraEnLote: vi.fn(),
    ajusteDeMoq: vi.fn(),
    guardaAjusteDeMoq: vi.fn(),
  };
  const ambitos = {
    categorias: vi.fn(),
    proveedores: vi.fn(),
    productos: vi.fn(),
    grupos: vi.fn(),
  };
  const dialogo = { alerta: vi.fn(), confirma: vi.fn() };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };

  const monta = () =>
    render(PreciosPage, {
      providers: [
        { provide: PRECIOS_PORT, useValue: puerto },
        { provide: AMBITOS_DE_REGLA_PORT, useValue: ambitos },
        { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
        { provide: DialogoStore, useValue: dialogo },
        { provide: AvisosStore, useValue: avisos },
        ConsultaReglas,
        GuardaLaRegla,
        AlternaLaRegla,
        BorraLaRegla,
        AlternaReglasEnLote,
        BorraReglasEnLote,
        ConsultaElAjusteDeMoq,
        GuardaElAjusteDeMoq,
        CargaLosAmbitos,
        ImportesStore,
      ],
    });

  beforeEach(() => {
    enEspanolYEnDolares();
    vi.resetAllMocks();
    puerto.reglas.mockResolvedValue(exito([regla({ costeMinimoUsd: 5, costeMaximoUsd: 50 })]));
    puerto.ajusteDeMoq.mockResolvedValue(exito({ activo: true, factorPorcentaje: 50 }));
    puerto.guardaAjusteDeMoq.mockResolvedValue(exito({ activo: true, factorPorcentaje: 40 }));
    puerto.borra.mockResolvedValue(exito(undefined));
    for (const lista of [ambitos.categorias, ambitos.proveedores, ambitos.productos, ambitos.grupos]) {
      lista.mockResolvedValue(exito([]));
    }
  }, PLAZO);

  it('escribe el margen con su símbolo y el tramo de coste en la divisa activa', async () => {
    await monta();

    expect(await screen.findByText('Margen general')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('$5.00 → $50.00')).toBeInTheDocument();
  }, PLAZO);

  /** Dos reglas con la misma huella hacen lo mismo y sobra una: se marcan para poder limpiarlas. */
  it('marca las reglas duplicadas', async () => {
    puerto.reglas.mockResolvedValue(exito([regla(), regla({ id: 'r2' })]));

    await monta();

    expect(await screen.findAllByText('duplicada')).toHaveLength(2);
  }, PLAZO);

  /**
   * Dos reglas activas del mismo ámbito con tramos que se pisan dejan el precio sin determinar: es el
   * fallo más caro de esta pantalla y por eso se avisa MIENTRAS se edita, no después de guardar.
   */
  it('avisa del solape antes de guardar', async () => {
    puerto.reglas.mockResolvedValue(
      exito([
        regla({ id: 'r1', costeMinimoUsd: 0, costeMaximoUsd: 100 }),
        regla({ id: 'r2', valor: 45, costeMinimoUsd: 50, costeMaximoUsd: 200 }),
      ]),
    );

    const vista = await monta();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]);
    vista.fixture.detectChanges();

    expect(
      await screen.findByText(/Solapa con 1 regla\(s\) activa\(s\) del mismo alcance\./),
    ).toBeInTheDocument();
  }, PLAZO);

  it('borrar una regla pide confirmación y respeta el «no»', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(dialogo.confirma).toHaveBeenCalledOnce();
    expect(puerto.borra).not.toHaveBeenCalled();
  }, PLAZO);

  it('confirmado, borra y vuelve a leer las reglas', async () => {
    dialogo.confirma.mockResolvedValue(true);

    await monta();
    await screen.findByText('Margen general');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(puerto.borra).toHaveBeenCalledWith('r1');
    expect(puerto.reglas).toHaveBeenCalledTimes(2);
  }, PLAZO);

  it('si no se pueden leer las reglas lo dice y deja la tabla vacía', async () => {
    puerto.reglas.mockResolvedValue(fallo(creaError('sin-conexion', 'No hay conexión')));
    puerto.ajusteDeMoq.mockResolvedValue(fallo(creaError('sin-conexion')));

    await monta();

    expect(
      await screen.findByText('Ningún resultado coincide con los filtros'),
    ).toBeInTheDocument();
    expect(avisos.error).toHaveBeenCalledWith('No hay conexión');
  }, PLAZO);

  /** El ajuste por pedido mínimo es una palanca aparte: solo se guarda si se ha tocado algo. */
  it('el ajuste por pedido mínimo se guarda cuando cambia', async () => {
    const vista = await monta();

    const factor = await screen.findByLabelText(/Reducir margen al/);
    await userEvent.clear(factor);
    await userEvent.type(factor, '40');
    // El botón solo se habilita cuando hay algo que guardar: hay que repintar antes de pulsarlo.
    vista.fixture.detectChanges();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    vista.fixture.detectChanges();

    expect(puerto.guardaAjusteDeMoq).toHaveBeenCalledWith({ activo: true, factorPorcentaje: 40 });
    expect(avisos.exito).toHaveBeenCalledWith('Ajuste por pedido mínimo guardado.');
  }, PLAZO);
});
