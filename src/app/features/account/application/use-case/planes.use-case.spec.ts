import { TestBed } from '@angular/core/testing';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { Plan } from '../../domain/model/plan';
import { FACTURAS_PORT, PLANES_PORT } from '../../domain/port/planes.port';
import { DESCARGA_PORT, FicheroDescargable } from '../../domain/port/descarga.port';
import { PlanesStore } from '../state/planes.store';
import {
  CancelaSuscripcion,
  CargaFacturas,
  CargaPlanes,
  ContrataPlan,
  DescargaFactura,
} from './planes.use-case';
import { APLICACION_DE_ACCOUNT } from '../../account.providers';

const PRO: Plan = {
  id: 'plan-pro',
  codigo: 'PRO',
  nombre: 'Pro',
  centimosMensuales: 2900,
  centimosAnuales: 29000,
  posicion: 3,
  limites: {},
};

const SUSCRIPCION = { idPlan: 'plan-pro', estado: 'ACTIVE', periodoDeFacturacion: 'MONTHLY' };

describe('casos de uso de planes', () => {
  const lista = vi.fn();
  const suscripcionActual = vi.fn();
  const contrata = vi.fn();
  const cancela = vi.fn();
  const listaFacturas = vi.fn();
  const descarga = vi.fn();
  const entrega = vi.fn();

  let almacen: PlanesStore;

  beforeEach(() => {
    lista.mockReset().mockResolvedValue(exito([PRO]));
    suscripcionActual.mockReset().mockResolvedValue(exito(SUSCRIPCION));
    contrata.mockReset().mockResolvedValue(exito('active'));
    cancela.mockReset().mockResolvedValue(exito(undefined));
    listaFacturas.mockReset().mockResolvedValue(exito([{ numero: 'F-1' }]));
    descarga.mockReset();
    entrega.mockReset();
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: PLANES_PORT, useValue: { lista, suscripcionActual, contrata, cancela } },
        { provide: FACTURAS_PORT, useValue: { lista: listaFacturas, descarga } },
        { provide: DESCARGA_PORT, useValue: { entrega } },
      ],
    });
    almacen = TestBed.inject(PlanesStore);
  });

  it('con sesión trae el catálogo y la suscripción', async () => {
    const resultado = await TestBed.inject(CargaPlanes).ejecuta(true);

    expect(resultado.ok).toBe(true);
    expect(almacen.planes()).toEqual([PRO]);
    expect(almacen.suscripcion()).toEqual(SUSCRIPCION);
  });

  /** El catálogo es público; la suscripción no. Sin sesión ni se pregunta. */
  it('sin sesión no pregunta por la suscripción', async () => {
    await TestBed.inject(CargaPlanes).ejecuta(false);

    expect(almacen.planes()).toEqual([PRO]);
    expect(suscripcionActual).not.toHaveBeenCalled();
    expect(almacen.suscripcion()).toBeNull();
  });

  it('si el catálogo falla no se pregunta nada más', async () => {
    lista.mockResolvedValue(fallo(creaError('sin-conexion')));

    expect((await TestBed.inject(CargaPlanes).ejecuta(true)).ok).toBe(false);
    expect(suscripcionActual).not.toHaveBeenCalled();
  });

  /** Que falle preguntar por la suscripción no puede vaciar la parrilla: se sigue pudiendo elegir. */
  it('la parrilla sobrevive a un fallo al leer la suscripción', async () => {
    suscripcionActual.mockResolvedValue(fallo(creaError('error-del-servidor')));

    const resultado = await TestBed.inject(CargaPlanes).ejecuta(true);

    expect(resultado.ok).toBe(false);
    expect(almacen.planes()).toEqual([PRO]);
  });

  it('sin suscripción, el puerto devuelve nulo y no es un error', async () => {
    suscripcionActual.mockResolvedValue(exito(null));

    expect((await TestBed.inject(CargaPlanes).ejecuta(true)).ok).toBe(true);
    expect(almacen.suscripcion()).toBeNull();
  });

  it('contratar refresca la suscripción y las facturas', async () => {
    const resultado = await TestBed.inject(ContrataPlan).ejecuta('PRO', 'ANUAL');

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.valor).toBe('contratado');
    expect(contrata).toHaveBeenCalledWith('PRO', 'ANUAL');
    expect(suscripcionActual).toHaveBeenCalled();
    expect(listaFacturas).toHaveBeenCalled();
  });

  /**
   * Bajar de plan no cobra ahora: se aplica en la renovación. Decir «contratado» haría creer que el
   * plan grande se pierde hoy.
   */
  it('distingue la bajada programada de la contratación inmediata', async () => {
    contrata.mockResolvedValue(exito('scheduled'));

    const resultado = await TestBed.inject(ContrataPlan).ejecuta('BASIC', 'MENSUAL');

    expect(resultado.ok && resultado.valor).toBe('bajada-programada');
  });

  it('si contratar falla, no se refresca nada', async () => {
    contrata.mockResolvedValue(fallo(creaError('peticion-invalida', 'Hace falta tarjeta')));

    expect((await TestBed.inject(ContrataPlan).ejecuta('PRO', 'MENSUAL')).ok).toBe(false);
    expect(suscripcionActual).not.toHaveBeenCalled();
  });

  it('cancelar refresca la suscripción', async () => {
    expect((await TestBed.inject(CancelaSuscripcion).ejecuta()).ok).toBe(true);
    expect(suscripcionActual).toHaveBeenCalled();
  });

  it('cancelar que falla no refresca', async () => {
    cancela.mockResolvedValue(fallo(creaError('conflicto')));

    expect((await TestBed.inject(CancelaSuscripcion).ejecuta()).ok).toBe(false);
    expect(suscripcionActual).not.toHaveBeenCalled();
  });

  it('cargar facturas las deja en el almacén', async () => {
    expect((await TestBed.inject(CargaFacturas).ejecuta()).ok).toBe(true);
    expect(almacen.facturas()).toEqual([{ numero: 'F-1' }]);
  });

  it('si las facturas fallan, la lista se queda como estaba', async () => {
    listaFacturas.mockResolvedValue(fallo(creaError('sin-conexion')));

    expect((await TestBed.inject(CargaFacturas).ejecuta()).ok).toBe(false);
    expect(almacen.facturas()).toEqual([]);
  });

  it('descargar una factura la entrega al navegador', async () => {
    const fichero: FicheroDescargable = { nombre: 'factura-F-1.pdf', contenido: new Blob([]) };
    descarga.mockResolvedValue(exito(fichero));

    expect((await TestBed.inject(DescargaFactura).ejecuta('F-1')).ok).toBe(true);
    expect(entrega).toHaveBeenCalledWith(fichero);
  });

  it('si la factura no se puede bajar, no se entrega nada', async () => {
    descarga.mockResolvedValue(fallo(creaError('no-encontrado')));

    expect((await TestBed.inject(DescargaFactura).ejecuta('F-1')).ok).toBe(false);
    expect(entrega).not.toHaveBeenCalled();
  });
});
