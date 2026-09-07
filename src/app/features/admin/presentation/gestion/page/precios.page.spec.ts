import { DeferBlockBehavior } from '@angular/core/testing';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { AjusteDeMoq } from '../../../domain/gestion/model/precios';
import { ResultadoMasivo } from '../../../domain/gestion/model/pagina';
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

/**
 * Las reglas de MARGEN: de aquí sale el precio al que se vende cada producto.
 *
 * <p>Lo que se certifica no es la tabla, es lo que pasa cuando algo va a medias. **El lote no se aborta
 * cuando una regla falla**: el backend sigue con las demás, así que hay que decir las DOS cifras. Contar
 * un «7 de 9» como acierto invita a repetir el lote entero, que volvería a intentar lo ya hecho y daría
 * otro error encima.
 *
 * <p>Y el ajuste por pedido mínimo es una palanca APARTE: si no se puede leer, su tarjeta no se pinta y
 * las reglas se siguen administrando. Bloquear la pantalla entera por un dato secundario deja sin tocar
 * lo que sí funciona.
 */
const REGLA_BASE: ReglaDePrecio = {
  id: 'r1',
  ambito: 'GLOBAL',
  tipo: 'PERCENTAGE',
  valor: 150,
  activa: true,
  posicion: 1,
  descripcion: 'Margen base del escaparate',
};

const MOQ_BASE: AjusteDeMoq = { activo: true, factorPorcentaje: 50 };

interface OpcionesDeLote {
  reglas?: readonly ReglaDePrecio[] | 'falla';
  moq?: AjusteDeMoq | 'falla';
  lote?: ResultadoMasivo | 'falla';
}

async function montaConDobles(opciones: OpcionesDeLote = {}) {
  const consultaReglas = vi.fn(
    async (): Promise<Result<readonly ReglaDePrecio[], AppError>> =>
      opciones.reglas === 'falla'
        ? fallo(creaError('sin-conexion', 'No hay red'))
        : exito(opciones.reglas ?? [REGLA_BASE]),
  );
  const consultaMoq = vi.fn(
    async (): Promise<Result<AjusteDeMoq, AppError>> =>
      opciones.moq === 'falla'
        ? fallo(creaError('error-del-servidor'))
        : exito(opciones.moq ?? MOQ_BASE),
  );
  const enLote = vi.fn(
    async (_ids: readonly string[], _activa?: boolean): Promise<Result<ResultadoMasivo, AppError>> =>
      opciones.lote === 'falla'
        ? fallo(creaError('sin-permiso', 'No puedes'))
        : exito(opciones.lote ?? { correctos: 2, fallidos: 0, errores: [] }),
  );
  const guarda = vi.fn(async (_b: unknown) => exito(REGLA_BASE));
  const alterna = vi.fn(async (_id: string) => exito(undefined));
  const borra = vi.fn(async (_id: string) => exito(undefined));
  const guardaMoq = vi.fn(async (ajuste: AjusteDeMoq) => exito(ajuste));

  const vista = await render(PreciosPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      DialogoStore,
      ImportesStore,
      { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
      { provide: ConsultaReglas, useValue: { ejecuta: consultaReglas } },
      { provide: GuardaLaRegla, useValue: { ejecuta: guarda } },
      { provide: AlternaLaRegla, useValue: { ejecuta: alterna } },
      { provide: BorraLaRegla, useValue: { ejecuta: borra } },
      { provide: AlternaReglasEnLote, useValue: { ejecuta: enLote } },
      { provide: BorraReglasEnLote, useValue: { ejecuta: enLote } },
      { provide: ConsultaElAjusteDeMoq, useValue: { ejecuta: consultaMoq } },
      { provide: GuardaElAjusteDeMoq, useValue: { ejecuta: guardaMoq } },
      {
        provide: CargaLosAmbitos,
        useValue: {
          ejecuta: async () => ({ categorias: [], proveedores: [], productos: [], grupos: [] }),
        },
      },
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

  const pantalla = vista.fixture.componentInstance as unknown as Record<
    string,
    ((...args: never[]) => Promise<void> | void) & { limpia?: () => void }
  >;

  return {
    vista,
    asienta,
    pantalla,
    consultaReglas,
    guarda,
    enLote,
    guardaMoq,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

/** Marca filas en la selección de la tabla, que es un campo del componente. */
function marcaFilas(pantalla: Record<string, unknown>, ids: readonly string[]): void {
  const seleccion = pantalla['seleccion'] as { alterna(id: string): void };
  for (const id of ids) {
    seleccion.alterna(id);
  }
}

describe('PreciosPage · lotes y ajuste de pedido mínimo', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('carga las reglas y el ajuste de pedido mínimo al entrar', async () => {
    const { consultaReglas } = await montaConDobles();

    expect(consultaReglas).toHaveBeenCalled();
    expect(screen.getByText(/Margen base del escaparate/)).toBeInTheDocument();
  });

  it('si las reglas no se pueden leer, se dice', async () => {
    const { avisos } = await montaConDobles({ reglas: 'falla' });

    expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'No hay red' });
  });

  /** Un dato secundario que no carga no puede dejar sin administrar lo principal. */
  it('si el ajuste de pedido mínimo falla, las reglas se siguen administrando', async () => {
    await montaConDobles({ moq: 'falla' });

    expect(screen.getByText(/Margen base del escaparate/)).toBeInTheDocument();
  });

  it('guardar una regla cierra el editor y recarga', async () => {
    const { pantalla, guarda, consultaReglas, asienta } = await montaConDobles();
    consultaReglas.mockClear();

    await pantalla['guardaLaRegla']({ ambito: 'GLOBAL', tipo: 'PERCENTAGE', valor: 120 } as never);
    await asienta();

    expect(guarda).toHaveBeenCalled();
    expect(consultaReglas).toHaveBeenCalled();
  });

  it('si el guardado falla, el editor NO se cierra y se dice por qué', async () => {
    const { pantalla, guarda, avisos, asienta } = await montaConDobles();
    guarda.mockResolvedValueOnce(fallo(creaError('conflicto', 'Ya hay una regla igual')) as never);

    await pantalla['abreAlta']();
    await pantalla['guardaLaRegla']({ ambito: 'GLOBAL', tipo: 'PERCENTAGE', valor: 120 } as never);
    await asienta();

    expect(avisos.avisos().at(-1)?.mensaje).toBe('Ya hay una regla igual');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  describe('el lote', () => {
    it('sin nada marcado no llama a nadie', async () => {
      const { pantalla, enLote, asienta } = await montaConDobles();

      await pantalla['cambiaActividadEnLote'](true as never);
      await asienta();

      expect(enLote).not.toHaveBeenCalled();
    });

    it('cuando salen todas, el aviso es de acierto y se limpia la selección', async () => {
      const { pantalla, enLote, avisos, asienta } = await montaConDobles();
      marcaFilas(pantalla, ['r1']);

      await pantalla['cambiaActividadEnLote'](false as never);
      await asienta();

      expect(enLote).toHaveBeenCalledWith(['r1'], false);
      expect(avisos.avisos().at(-1)?.tipo).toBe('success');
    });

    /** «7 de 9» no puede pintarse igual que «9 de 9»: repetir el lote reintentaría lo ya hecho. */
    it('a medias avisa en ámbar y lleva los motivos', async () => {
      const { pantalla, avisos, asienta } = await montaConDobles({
        lote: { correctos: 7, fallidos: 2, errores: ['r8: en uso', 'r9: bloqueada'] },
      });
      marcaFilas(pantalla, ['r1']);

      await pantalla['cambiaActividadEnLote'](true as never);
      await asienta();

      expect(avisos.avisos().at(-1)?.tipo).toBe('warning');
      expect(avisos.avisos().at(-1)?.mensaje).toContain('r8: en uso');
    });

    it('un rechazo entero se distingue de un lote a medias', async () => {
      const { pantalla, avisos, asienta } = await montaConDobles({ lote: 'falla' });
      marcaFilas(pantalla, ['r1']);

      await pantalla['cambiaActividadEnLote'](true as never);
      await asienta();

      expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'No puedes' });
    });

    it('borrar en lote PREGUNTA con cuántas son', async () => {
      const { pantalla, enLote, dialogo, asienta } = await montaConDobles();
      marcaFilas(pantalla, ['r1']);

      const enCurso = pantalla['borraEnLote']();
      await asienta();

      expect(dialogo.actual()?.mensaje).toContain('1');
      dialogo.cierra(false);
      await enCurso;
      expect(enLote).not.toHaveBeenCalled();
    });
  });

  it('guardar el ajuste de pedido mínimo lo confirma', async () => {
    const { pantalla, guardaMoq, avisos, asienta } = await montaConDobles();

    await pantalla['guardaElMoq']({ activo: true, factorPorcentaje: 60 } as never);
    await asienta();

    expect(guardaMoq).toHaveBeenCalledWith({ activo: true, factorPorcentaje: 60 });
    expect(avisos.avisos().at(-1)?.tipo).toBe('success');
  });
});
