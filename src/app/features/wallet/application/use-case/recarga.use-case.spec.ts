import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { PreferenciasService } from '@core/preferences/preferencias';
import { CARTERA_PORT, RECARGA_PORT } from '../../domain/port/cartera.port';
import { COMISIONES_PENDIENTES_PORT } from '../../domain/port/comisiones-pendientes.port';
import { IniciaRecarga } from './inicia-recarga.use-case';
import { ConfirmaRecarga } from './confirma-recarga.use-case';
import { ConsultaCartera } from './consulta-cartera.use-case';
import { ConsultaComisionesPendientes } from './consulta-comisiones-pendientes.use-case';
import { APLICACION_DE_LA_CARTERA } from '../../wallet.providers';

describe('casos de uso de la cartera', () => {
  const cartera = { consulta: vi.fn(), movimientos: vi.fn() };
  const recarga = {
    opciones: vi.fn(),
    inicia: vi.fn(),
    confirma: vi.fn(),
    capturaPaypal: vi.fn(),
    confirmaSimulada: vi.fn(),
  };
  const comisiones = { consulta: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DE_LA_CARTERA,
        { provide: CARTERA_PORT, useValue: cartera },
        { provide: RECARGA_PORT, useValue: recarga },
        { provide: COMISIONES_PENDIENTES_PORT, useValue: comisiones },
        { provide: PreferenciasService, useValue: { moneda: () => 'EUR' } },
      ],
    });
  });

  it('ConsultaCartera pide una primera página de veinte movimientos', async () => {
    cartera.movimientos.mockResolvedValue(exito({ movimientos: [], total: 0 }));
    await TestBed.inject(ConsultaCartera).ultimosMovimientos();
    expect(cartera.movimientos).toHaveBeenCalledWith(0, 20);
  });

  it('ConsultaCartera deja pasar el fallo del saldo', async () => {
    cartera.consulta.mockResolvedValue(fallo(creaError('no-autenticado')));
    expect((await TestBed.inject(ConsultaCartera).ejecuta()).ok).toBe(false);
  });

  it('ConsultaComisionesPendientes entrega lo que devuelve su puerto', async () => {
    comisiones.consulta.mockResolvedValue(
      exito({ esAfiliado: false, totalFormateado: '', comisiones: [] }),
    );
    expect((await TestBed.inject(ConsultaComisionesPendientes).ejecuta()).ok).toBe(true);
  });

  /** La divisa la pone el caso de uso: dos pantallas no pueden enviar monedas distintas. */
  it('IniciaRecarga pide las opciones en la divisa activa', async () => {
    recarga.opciones.mockResolvedValue(exito({ divisa: 'EUR', simbolo: '€', sugeridos: [] }));
    await TestBed.inject(IniciaRecarga).opciones();
    expect(recarga.opciones).toHaveBeenCalledWith('EUR');
  });

  it('IniciaRecarga manda el importe con la divisa activa', async () => {
    recarga.inicia.mockResolvedValue(exito({ idDePago: 'p1' }));
    await TestBed.inject(IniciaRecarga).ejecuta('CARD', '50');
    expect(recarga.inicia).toHaveBeenCalledWith({
      metodo: 'CARD',
      divisa: 'EUR',
      importe: 50,
      cadenaCripto: undefined,
    });
  });

  /** Un importe inválido no llega a salir a la red: viajaría como una recarga sin importe. */
  it('IniciaRecarga rechaza un importe inválido sin llamar a nadie', async () => {
    const resultado = await TestBed.inject(IniciaRecarga).ejecuta('CARD', '1e999');
    expect(resultado.ok).toBe(false);
    expect(recarga.inicia).not.toHaveBeenCalled();
  });

  it('ConfirmaRecarga usa la captura de PayPal cuando se vuelve de PayPal', async () => {
    recarga.capturaPaypal.mockResolvedValue(exito(undefined));
    await TestBed.inject(ConfirmaRecarga).ejecuta('p1', 'paypal');
    expect(recarga.capturaPaypal).toHaveBeenCalledWith('p1');
    expect(recarga.confirma).not.toHaveBeenCalled();
  });

  it('ConfirmaRecarga usa la confirmación normal para el resto de pasarelas', async () => {
    recarga.confirma.mockResolvedValue(exito(undefined));
    await TestBed.inject(ConfirmaRecarga).ejecuta('p1', 'pasarela');
    expect(recarga.confirma).toHaveBeenCalledWith('p1');
  });

  it('ConfirmaRecarga sabe dar por bueno un cobro simulado', async () => {
    recarga.confirmaSimulada.mockResolvedValue(exito(undefined));
    await TestBed.inject(ConfirmaRecarga).simulada('p1');
    expect(recarga.confirmaSimulada).toHaveBeenCalledWith('p1');
  });
});
