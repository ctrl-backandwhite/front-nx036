import { TestBed } from '@angular/core/testing';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { DIRECCION_VACIA, Direccion } from '../../domain/model/direccion';
import { DIRECCIONES_PORT } from '../../domain/port/direcciones.port';
import { DireccionesStore } from '../state/direcciones.store';
import { CargaDirecciones, EliminaDireccion, GuardaDireccion } from './direcciones.use-case';
import { APLICACION_DE_ACCOUNT } from '../../account.providers';

const DATOS = {
  ...DIRECCION_VACIA,
  nombreCompleto: 'Ana',
  linea1: 'Calle',
  ciudad: 'Madrid',
  pais: 'ES',
};

const GUARDADA: Direccion = {
  id: 'dir-1',
  nombreCompleto: 'Ana',
  linea1: 'Calle',
  ciudad: 'Madrid',
  pais: 'ES',
  porDefecto: true,
  creadaEl: '2026-01-01T00:00:00Z',
};

describe('casos de uso de direcciones', () => {
  const lista = vi.fn();
  const crea = vi.fn();
  const actualiza = vi.fn();
  const elimina = vi.fn();

  let almacen: DireccionesStore;

  beforeEach(() => {
    lista.mockReset().mockResolvedValue(exito([GUARDADA]));
    crea.mockReset().mockResolvedValue(exito(GUARDADA));
    actualiza.mockReset().mockResolvedValue(exito(GUARDADA));
    elimina.mockReset().mockResolvedValue(exito(undefined));
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: DIRECCIONES_PORT, useValue: { lista, crea, actualiza, elimina } },
      ],
    });
    almacen = TestBed.inject(DireccionesStore);
  });

  it('cargar deja la lista en el almacén compartido', async () => {
    const resultado = await TestBed.inject(CargaDirecciones).ejecuta();

    expect(resultado.ok).toBe(true);
    expect(almacen.direcciones()).toEqual([GUARDADA]);
    expect(almacen.cargando()).toBe(false);
  });

  it('si la carga falla, la lista no se marca como cargada ni se queda cargando', async () => {
    lista.mockResolvedValue(fallo(creaError('sin-conexion')));

    const resultado = await TestBed.inject(CargaDirecciones).ejecuta();

    expect(resultado.ok).toBe(false);
    expect(almacen.cargadas()).toBe(false);
    expect(almacen.cargando()).toBe(false);
  });

  it('sin identificador CREA la dirección', async () => {
    await TestBed.inject(GuardaDireccion).ejecuta(DATOS);

    expect(crea).toHaveBeenCalledWith(DATOS);
    expect(actualiza).not.toHaveBeenCalled();
  });

  it('con identificador la ACTUALIZA', async () => {
    await TestBed.inject(GuardaDireccion).ejecuta(DATOS, 'dir-1');

    expect(actualiza).toHaveBeenCalledWith('dir-1', DATOS);
    expect(crea).not.toHaveBeenCalled();
  });

  /** Sin refrescar, la pantalla enseña la lista de antes y parece que el guardado no hizo nada. */
  it('tras guardar refresca la lista', async () => {
    await TestBed.inject(GuardaDireccion).ejecuta(DATOS);

    expect(lista).toHaveBeenCalled();
  });

  it('si guardar falla, NO refresca y devuelve el motivo del servidor', async () => {
    crea.mockResolvedValue(fallo(creaError('peticion-invalida', 'Código postal no válido')));

    const resultado = await TestBed.inject(GuardaDireccion).ejecuta(DATOS);

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.mensaje).toBe('Código postal no válido');
    expect(lista).not.toHaveBeenCalled();
  });

  it('borrar refresca la lista', async () => {
    const resultado = await TestBed.inject(EliminaDireccion).ejecuta('dir-1');

    expect(resultado.ok).toBe(true);
    expect(elimina).toHaveBeenCalledWith('dir-1');
    expect(lista).toHaveBeenCalled();
  });

  it('si borrar falla, no se refresca nada', async () => {
    elimina.mockResolvedValue(fallo(creaError('conflicto', 'Está en uso')));

    const resultado = await TestBed.inject(EliminaDireccion).ejecuta('dir-1');

    expect(resultado.ok).toBe(false);
    expect(lista).not.toHaveBeenCalled();
  });
});
