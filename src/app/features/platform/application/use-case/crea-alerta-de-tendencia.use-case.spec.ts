import { TestBed } from '@angular/core/testing';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AlertaDeTendencia, NuevaAlerta } from '../../domain/model/inteligencia';
import {
  ALERTAS_DE_TENDENCIA_PORT,
  AlertasDeTendenciaPort,
} from '../../domain/port/inteligencia.port';
import { CreaAlertaDeTendencia } from './crea-alerta-de-tendencia.use-case';

const ALERTA: AlertaDeTendencia = {
  id: 'a1',
  canal: 'EMAIL',
  activa: true,
  creadaEl: '2026-09-01T00:00:00Z',
};

class AlertasFalsas implements AlertasDeTendenciaPort {
  recibida: NuevaAlerta | null = null;

  async lista(): Promise<Result<readonly AlertaDeTendencia[], AppError>> {
    return exito([ALERTA]);
  }

  async crea(alerta: NuevaAlerta): Promise<Result<AlertaDeTendencia, AppError>> {
    this.recibida = alerta;
    return exito(ALERTA);
  }

  async elimina(): Promise<Result<void, AppError>> {
    return exito(undefined);
  }
}

describe('CreaAlertaDeTendencia', () => {
  let puerto: AlertasFalsas;
  let caso: CreaAlertaDeTendencia;

  beforeEach(() => {
    puerto = new AlertasFalsas();
    TestBed.configureTestingModule({
      providers: [
        CreaAlertaDeTendencia,
        { provide: ALERTAS_DE_TENDENCIA_PORT, useValue: puerto },
      ],
    });
    caso = TestBed.inject(CreaAlertaDeTendencia);
  });

  it('pasa el umbral de la escala del formulario (0–100) a la del backend (0–1)', async () => {
    await caso.ejecuta('auriculares', '75', 'EMAIL');

    expect(puerto.recibida?.umbral).toBe(0.75);
    expect(puerto.recibida?.palabraClave).toBe('auriculares');
    expect(puerto.recibida?.canal).toBe('EMAIL');
  });

  it('recorta la palabra clave y la omite si queda vacía', async () => {
    await caso.ejecuta('   ', '50', 'PUSH');

    expect(puerto.recibida?.palabraClave).toBeUndefined();
    expect(puerto.recibida?.canal).toBe('PUSH');
  });

  it('recorta un umbral fuera de escala en vez de crear una alerta que no salta nunca', async () => {
    await caso.ejecuta('gorra', '900', 'EMAIL');
    expect(puerto.recibida?.umbral).toBe(1);
  });
});
