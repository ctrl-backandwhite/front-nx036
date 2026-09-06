import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { COBRO_DE_AFILIADO_PORT, PANEL_DE_AFILIADO_PORT } from '../../domain/port/afiliado.port';
import { ConsultaPanelDeAfiliado } from './consulta-panel-de-afiliado.use-case';
import { GestionaCobro } from './gestiona-cobro.use-case';

describe('casos de uso del afiliado', () => {
  const panel = { consulta: vi.fn(), inscribe: vi.fn(), creaCodigo: vi.fn() };
  const cobro = { consultaPerfil: vi.fn(), guardaPerfil: vi.fn(), solicita: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: PANEL_DE_AFILIADO_PORT, useValue: panel },
        { provide: COBRO_DE_AFILIADO_PORT, useValue: cobro },
      ],
    });
  });

  it('crea el enlace con la etiqueta por defecto si no se da otra', async () => {
    panel.creaCodigo.mockResolvedValue(exito({ id: 'k1' }));
    await TestBed.inject(ConsultaPanelDeAfiliado).creaCodigo();
    expect(panel.creaCodigo).toHaveBeenCalledWith('Link');
  });

  it('el alta se delega al puerto tal cual', async () => {
    panel.inscribe.mockResolvedValue(exito({ inscrito: true }));
    expect((await TestBed.inject(ConsultaPanelDeAfiliado).inscribe()).ok).toBe(true);
  });

  it('el fallo del panel llega sin disfrazar', async () => {
    panel.consulta.mockResolvedValue(fallo(creaError('sin-permiso')));
    expect((await TestBed.inject(ConsultaPanelDeAfiliado).ejecuta()).ok).toBe(false);
  });

  /** El IBAN vacío no viaja: el guardado reemplaza el perfil entero y lo borraría. */
  it('GestionaCobro omite el IBAN vacío antes de guardar', async () => {
    cobro.guardaPerfil.mockResolvedValue(exito({}));

    await TestBed.inject(GestionaCobro).guardaPerfil({
      titular: 'Ana',
      iban: '   ',
      bic: 'BIC',
      correoPaypal: '',
      metodoPreferido: 'BANK',
      contrasena: 'x',
    });

    expect(cobro.guardaPerfil).toHaveBeenCalledWith(
      expect.not.objectContaining({ iban: expect.anything() }),
    );
  });

  it('GestionaCobro solicita el pago con el método elegido', async () => {
    cobro.solicita.mockResolvedValue(exito(undefined));
    await TestBed.inject(GestionaCobro).solicita('PAYPAL');
    expect(cobro.solicita).toHaveBeenCalledWith('PAYPAL');
  });

  it('GestionaCobro devuelve el perfil leído', async () => {
    cobro.consultaPerfil.mockResolvedValue(exito({ metodoPreferido: 'WALLET' }));
    expect((await TestBed.inject(GestionaCobro).consultaPerfil()).ok).toBe(true);
  });
});
