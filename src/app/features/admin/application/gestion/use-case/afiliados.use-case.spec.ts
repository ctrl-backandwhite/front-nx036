import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { PagoPendiente } from '../../../domain/gestion/model/afiliados';
import {
  PAGOS_DE_AFILIADOS_PORT, PagosDeAfiliadosPort,
} from '../../../domain/gestion/port/afiliados.port';
import { ApruebaElPago, RechazaElPago } from './afiliados.use-case';

function pago(metodo: string): PagoPendiente {
  return {
    id: 'g1', idAfiliado: 'a1', importeCentimos: 5000, importeFormateado: '50,00 €',
    divisa: 'EUR', metodo, comisiones: 2,
  };
}

describe('pagos de afiliados', () => {
  let llamadas: string[];
  let puerto: PagosDeAfiliadosPort;

  beforeEach(() => {
    llamadas = [];
    puerto = {
      pendientes: async () => exito([]),
      aprueba: async (id, ref) => (llamadas.push(`aprueba:${id}:${ref ?? ''}`), exito(undefined)),
      rechaza: async (id, motivo) => (llamadas.push(`rechaza:${id}:${motivo}`), exito(undefined)),
      paga: async () => exito(5000),
      apruebaVencidas: async () => exito(3),
      revisaComision: async () => exito(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PAGOS_DE_AFILIADOS_PORT, useValue: puerto },
        ApruebaElPago, RechazaElPago,
      ],
    });
  });

  /**
   * La referencia es lo único que permite casar el apunte del banco con la comisión cuando el afiliado
   * reclama que no ha cobrado. Es una regla del negocio, no una ayuda al teclear.
   */
  it('no aprueba una transferencia sin referencia', async () => {
    const resultado = await TestBed.inject(ApruebaElPago).ejecuta(pago('BANK'), '   ');

    expect(resultado.ok).toBe(false);
    expect(llamadas).toEqual([]);
  });

  it('tampoco un pago de PayPal sin referencia', async () => {
    const resultado = await TestBed.inject(ApruebaElPago).ejecuta(pago('PAYPAL'), '');

    expect(resultado.ok).toBe(false);
  });

  it('la cartera no necesita referencia: se manda sin ella', async () => {
    const resultado = await TestBed.inject(ApruebaElPago).ejecuta(pago('WALLET'), '  ');

    expect(resultado.ok).toBe(true);
    expect(llamadas).toEqual(['aprueba:g1:']);
  });

  it('recorta la referencia antes de mandarla', async () => {
    await TestBed.inject(ApruebaElPago).ejecuta(pago('BANK'), '  TRF-2026-01  ');

    expect(llamadas).toEqual(['aprueba:g1:TRF-2026-01']);
  });

  /** Rechazar siempre lleva motivo: es lo que se le acaba contando al afiliado. */
  it('no rechaza sin motivo', async () => {
    const resultado = await TestBed.inject(RechazaElPago).ejecuta('g1', '   ');

    expect(resultado.ok).toBe(false);
    expect(llamadas).toEqual([]);
  });

  it('rechaza con el motivo recortado', async () => {
    await TestBed.inject(RechazaElPago).ejecuta('g1', '  datos incorrectos  ');

    expect(llamadas).toEqual(['rechaza:g1:datos incorrectos']);
  });

  it('propaga el fallo del puerto al aprobar', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PAGOS_DE_AFILIADOS_PORT,
          useValue: { ...puerto, aprueba: async () => fallo(creaError('conflicto')) },
        },
        ApruebaElPago,
      ],
    });

    const resultado = await TestBed.inject(ApruebaElPago).ejecuta(pago('WALLET'), '');

    expect(resultado.ok).toBe(false);
  });
});
