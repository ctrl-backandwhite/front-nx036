import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import {
  CoberturaDeTransportista,
  claveDeCobertura,
  coberturaEnBlanco,
  coberturaGuardable,
  importeLegible,
  plazoLegible,
  transportistasDeCobertura,
} from '../../../domain/logistica/model/cobertura-transportista';
import { COBERTURA_DE_TRANSPORTISTA_PORT } from '../../../domain/logistica/port/configuracion-logistica.port';
import {
  AlternaCoberturaDeTransportista,
  BorraCoberturaDeTransportista,
  ConsultaCoberturaDeTransportista,
  ConsultaTransportistasDisponibles,
  GuardaCoberturaDeTransportista,
} from '../../../application/logistica/use-case/configura-logistica.use-case';
import { CoberturaDeTransportistaPage } from './cobertura-de-transportista.page';

/**
 * La pantalla de cobertura: a qué países llega cada transportista.
 *
 * <p>No existía hasta el 9-nov-2026 —los destinos solo se cambiaban con migraciones SQL— y es la que
 * permite encender uno de los 17 destinos que solo cubre el segundo transportista sin un despliegue.
 *
 * <p>Lo que se fija aquí es lo que no se ve si se hace mal: que el interruptor sea la acción normal y
 * el borrado la excepción —apagar conserva la tarifa y el plazo, borrar los pierde—, y que no se pueda
 * guardar una fila sin clave, que se guardaría igual y dejaría el destino sin servirse.
 */
function cobertura(parcial: Partial<CoberturaDeTransportista> = {}): CoberturaDeTransportista {
  return {
    carrier: 'FOURPX',
    pais: 'KE',
    nombre: 'Kenia',
    zona: 'AF1',
    baseCents: 900,
    porKgCents: 450,
    diasMin: 7,
    diasMax: 14,
    habilitado: true,
    ...parcial,
  };
}

interface Opciones {
  coberturas?: readonly CoberturaDeTransportista[];
  transportistas?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const puerto = {
    lista: vi.fn(
      async (): Promise<Result<readonly CoberturaDeTransportista[], AppError>> =>
        exito(
          opciones.coberturas ?? [
            cobertura(),
            cobertura({ carrier: 'YUNEXPRESS', pais: 'ES', nombre: 'España', habilitado: false }),
          ],
        ),
    ),
    transportistas: vi.fn(
      async (): Promise<Result<readonly string[], AppError>> =>
        opciones.transportistas === 'falla'
          ? fallo(creaError('sin-conexion', 'No hay red'))
          : exito(['FOURPX', 'YUNEXPRESS']),
    ),
    guarda: vi.fn(
      async (_c: CoberturaDeTransportista): Promise<Result<void, AppError>> => exito(undefined),
    ),
    borra: vi.fn(
      async (_ca: string, _co: string): Promise<Result<void, AppError>> => exito(undefined),
    ),
  };

  const vista = await render(CoberturaDeTransportistaPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      DialogoStore,
      ConsultaCoberturaDeTransportista,
      ConsultaTransportistasDisponibles,
      GuardaCoberturaDeTransportista,
      AlternaCoberturaDeTransportista,
      BorraCoberturaDeTransportista,
      { provide: COBERTURA_DE_TRANSPORTISTA_PORT, useValue: puerto },
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

  const pantalla = vista.fixture.componentInstance as unknown as Record<
    string,
    (...args: never[]) => Promise<void> | void
  >;

  return { vista, asienta, pantalla, puerto };
}

describe('CoberturaDeTransportistaPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('carga la cobertura y los transportistas al entrar', async () => {
    const { puerto } = await monta();

    expect(puerto.lista).toHaveBeenCalled();
    expect(puerto.transportistas).toHaveBeenCalled();
    expect(screen.getAllByText(/Kenia/).length).toBeGreaterThan(0);
  });

  /**
   * Que falle la lista de transportistas deja el desplegable vacío, no la pantalla: ver la tabla sigue
   * siendo útil, y una pantalla en blanco por un desplegable es peor que un desplegable sin opciones.
   */
  it('si falla la lista de transportistas la tabla se sigue viendo', async () => {
    await monta({ transportistas: 'falla' });

    expect(screen.getAllByText(/Kenia/).length).toBeGreaterThan(0);
  });

  it('enseña los destinos apagados, no solo los que se sirven', async () => {
    await monta();

    // Un destino apagado tiene que verse: es el que hay que encender, y si no sale no se encuentra.
    expect(screen.getAllByText(/España/).length).toBeGreaterThan(0);
  });

  /** El interruptor es la acción normal: apagar conserva la tarifa y el plazo ya medidos. */
  it('el interruptor cambia el estado sin abrir el formulario', async () => {
    const { pantalla, puerto, asienta } = await monta();

    await pantalla['alterna'](cobertura() as never);
    await asienta();

    expect(puerto.guarda).toHaveBeenCalledWith(expect.objectContaining({ habilitado: false }));
  });

  it('encender un destino nuevo lo guarda habilitado', async () => {
    const { pantalla, puerto, asienta } = await monta();

    await pantalla['guardaCobertura'](cobertura({ pais: 'NG', nombre: 'Nigeria' }) as never);
    await asienta();

    expect(puerto.guarda).toHaveBeenCalledWith(
      expect.objectContaining({ pais: 'NG', habilitado: true }),
    );
  });

  /**
   * Sin clave no se llama al servidor. El fallo que esto evita no es un 422: es que una fila sin país
   * se guardara y dejara el destino sin servirse sin que nada lo dijera.
   */
  it('una fila sin clave no llega al servidor', async () => {
    const { pantalla, puerto, asienta } = await monta();

    await pantalla['guardaCobertura'](cobertura({ pais: '' }) as never);
    await asienta();

    expect(puerto.guarda).not.toHaveBeenCalled();
  });

  it('borrar pide confirmación y no borra si se cancela', async () => {
    const { pantalla, puerto, asienta, vista } = await monta();
    const dialogo = vista.fixture.debugElement.injector.get(DialogoStore);
    vi.spyOn(dialogo, 'confirma').mockResolvedValue(false);

    await pantalla['borra'](cobertura() as never);
    await asienta();

    expect(puerto.borra).not.toHaveBeenCalled();
  });

  it('borrar confirmado retira el destino', async () => {
    const { pantalla, puerto, asienta, vista } = await monta();
    const dialogo = vista.fixture.debugElement.injector.get(DialogoStore);
    vi.spyOn(dialogo, 'confirma').mockResolvedValue(true);

    await pantalla['borra'](cobertura() as never);
    await asienta();

    expect(puerto.borra).toHaveBeenCalledWith('FOURPX', 'KE');
  });
});

describe('modelo de cobertura', () => {
  /** La pareja transportista+país es la clave: dos transportistas pueden cubrir el mismo país. */
  it('la clave lleva el transportista y el país', () => {
    expect(claveDeCobertura(cobertura())).toBe('FOURPX|KE');
    expect(claveDeCobertura(cobertura({ carrier: 'YUNEXPRESS' }))).toBe('YUNEXPRESS|KE');
  });

  /**
   * El país se exige de DOS letras y no solo «no vacío»: es la regla que aplica el backend, y dejar
   * que el intento llegue hasta allí convierte un error evidente en un 422 que hay que interpretar.
   */
  it('no es guardable sin un ISO-2 de verdad', () => {
    expect(coberturaGuardable(cobertura())).toBe(true);
    expect(coberturaGuardable(cobertura({ pais: '' }))).toBe(false);
    expect(coberturaGuardable(cobertura({ pais: 'KEN' }))).toBe(false);
    expect(coberturaGuardable(cobertura({ pais: 'K1' }))).toBe(false);
    expect(coberturaGuardable(cobertura({ carrier: '  ' }))).toBe(false);
    expect(coberturaGuardable(cobertura({ nombre: '' }))).toBe(false);
    expect(coberturaGuardable(cobertura({ zona: '' }))).toBe(false);
  });

  /** Nace habilitada: dar de alta un destino es justo para servirlo. */
  it('la fila en blanco nace habilitada y con el transportista que se le pase', () => {
    expect(coberturaEnBlanco('FOURPX').habilitado).toBe(true);
    expect(coberturaEnBlanco('FOURPX').carrier).toBe('FOURPX');
    expect(coberturaEnBlanco().carrier).toBe('');
  });

  /** Un cero no se enseña como «0 días», que prometería la entrega hoy: es sin dato. */
  it('un plazo a cero es sin dato y no entrega inmediata', () => {
    expect(plazoLegible(cobertura())).toBe('7–14');
    expect(plazoLegible(cobertura({ diasMin: 0, diasMax: 0 }))).toBeUndefined();
    expect(plazoLegible(cobertura({ diasMin: 10, diasMax: 10 }))).toBe('10');
    expect(plazoLegible(cobertura({ diasMin: 0, diasMax: 9 }))).toBe('9');
  });

  it('los transportistas presentes salen sin repetir y en orden', () => {
    const filas = [cobertura(), cobertura({ pais: 'NG' }), cobertura({ carrier: 'YUNEXPRESS' })];

    expect(transportistasDeCobertura(filas)).toEqual(['FOURPX', 'YUNEXPRESS']);
  });

  it('la tarifa de reserva se lee en importe y no en céntimos', () => {
    expect(importeLegible(900)).toBe('9.00');
    expect(importeLegible(0)).toBe('0.00');
    expect(importeLegible(1250)).toBe('12.50');
  });
});
