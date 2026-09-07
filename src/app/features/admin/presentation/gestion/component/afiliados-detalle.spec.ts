import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';
import { Comision, DetalleDeAfiliado } from '../../../domain/gestion/model/afiliados';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import {
  ConsultaElAfiliado,
  ResuelveLaRevision,
} from '../../../application/gestion/use-case/afiliados.use-case';
import { AfiliadosDetalle } from './afiliados-detalle';

/**
 * La ficha de un afiliado: sus códigos, sus estadísticas y sus comisiones.
 *
 * <p>Es la pantalla desde la que se aprueba o se rechaza una comisión, o sea desde la que se decide si
 * se paga. Por eso lo que se fija es lo que ocurre DESPUÉS de resolver: la ficha se relee y se avisa al
 * listado de detrás. Sin lo primero, la fila resuelta seguiría ofreciendo los botones y se podría
 * resolver dos veces; sin lo segundo, el listado seguiría contando como pendiente algo que ya no lo está.
 *
 * <p>Y un estado que el backend estrene se enseña CRUDO en vez de en blanco: una fila sin estado parece
 * un error de datos, y el código al menos se puede buscar.
 */
function comision(parcial: Partial<Comision> = {}): Comision {
  return {
    id: 'm1',
    importeCentimos: 500,
    porcentaje: 10,
    estado: 'REVIEW',
    creadaEl: '2026-09-01T10:00:00Z',
    ...parcial,
  };
}

const DETALLE: DetalleDeAfiliado = {
  afiliado: {
    id: 'a1',
    estado: 'ACTIVE',
    nombre: 'Ana Ruiz',
    email: 'ana@marca.com',
    codigos: 1,
    clics: 40,
    conversiones: 3,
    pendienteCentimos: 500,
    aprobadoCentimos: 2000,
    pagadoCentimos: 0,
  },
  codigos: [{ id: 'c1', codigo: 'ANA10', clics: 4, activo: true }],
  comisiones: [comision()],
};

interface Opciones {
  detalle?: DetalleDeAfiliado | 'falla';
  resolver?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const consulta = vi.fn(
    async (_id: string): Promise<Result<DetalleDeAfiliado, AppError>> =>
      opciones.detalle === 'falla'
        ? fallo(creaError('no-encontrado', 'Ese afiliado ya no existe'))
        : exito(opciones.detalle ?? DETALLE),
  );
  const resuelve = vi.fn(
    async (_id: string, _aprueba: boolean): Promise<Result<void, AppError>> =>
      opciones.resolver === 'falla'
        ? fallo(creaError('conflicto', 'Ya la resolvió otra persona'))
        : exito(undefined),
  );
  const cambiado = vi.fn();

  const vista = await render(AfiliadosDetalle, {
    inputs: { id: 'a1', divisa: 'EUR' },
    on: { cambia: cambiado, cierra: vi.fn() },
    providers: [
      AvisosStore,
      ImportesStore,
      { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
      { provide: ConsultaElAfiliado, useValue: { ejecuta: consulta } },
      { provide: ResuelveLaRevision, useValue: { ejecuta: resuelve } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
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
    consulta,
    resuelve,
    cambiado,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
  };
}

describe('AfiliadosDetalle', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
    document.cookie = 'nx036-currency=USD';
  });

  it('pide la ficha del afiliado y enseña sus códigos', async () => {
    const { consulta } = await monta();

    expect(consulta).toHaveBeenCalledWith('a1');
    expect(screen.getByText(/ANA10/)).toBeInTheDocument();
  });

  /** Cerrar la ventana sola escondería el problema: se queda vacía y se dice qué pasó. */
  it('si no se puede leer, se avisa y la ventana NO se cierra', async () => {
    const { avisos, vista } = await monta({ detalle: 'falla' });

    expect(avisos.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'Ese afiliado ya no existe',
    });
    expect(vista.fixture.nativeElement.textContent.length).toBeGreaterThan(0);
  });

  it('sin comisiones lo dice, en vez de dejar la tabla muda', async () => {
    await monta({ detalle: { ...DETALLE, comisiones: [] } });

    expect(screen.getByText(/Aún no hay comisiones/)).toBeInTheDocument();
  });

  /** Una fila sin estado parece un error de datos; el código, al menos, se puede buscar. */
  it('un estado que el backend estrene se enseña CRUDO, no en blanco', async () => {
    await monta({
      detalle: { ...DETALLE, comisiones: [comision({ estado: 'ESTADO_NUEVO' })] },
    });

    expect(screen.getByText('ESTADO_NUEVO')).toBeInTheDocument();
  });

  it('una comisión sin fecha enseña un guion, no un «1970»', async () => {
    await monta({
      detalle: { ...DETALLE, comisiones: [comision({ creadaEl: undefined })] },
    });

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  describe('resolver una revisión', () => {
    it('aprobar relee la ficha y avisa al listado de detrás', async () => {
      const { resuelve, consulta, cambiado, asienta } = await monta();
      consulta.mockClear();

      await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
      await asienta();

      expect(resuelve).toHaveBeenCalledWith('m1', true);
      /* Sin releer, la fila resuelta seguiría ofreciendo los botones y se podría resolver dos veces. */
      expect(consulta).toHaveBeenCalled();
      /* Y sin avisar, el listado seguiría contando como pendiente algo que ya no lo está. */
      expect(cambiado).toHaveBeenCalled();
    });

    it('rechazar manda la decisión contraria', async () => {
      const { resuelve, asienta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
      await asienta();

      expect(resuelve).toHaveBeenCalledWith('m1', false);
    });

    it('si el servidor lo rechaza, se dice y NO se avisa al listado', async () => {
      const { avisos, cambiado, asienta } = await monta({ resolver: 'falla' });

      await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
      await asienta();

      expect(avisos.avisos().at(-1)).toMatchObject({
        tipo: 'error',
        mensaje: 'Ya la resolvió otra persona',
      });
      expect(cambiado).not.toHaveBeenCalled();
    });

    /** Solo las que están pendientes de revisión se pueden resolver. */
    it('una comisión ya resuelta no ofrece los botones', async () => {
      await monta({ detalle: { ...DETALLE, comisiones: [comision({ estado: 'APPROVED' })] } });

      expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Rechazar' })).toBeNull();
    });
  });
});
