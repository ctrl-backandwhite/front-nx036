import { TestBed } from '@angular/core/testing';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  NuevaSolicitud,
  SolicitudDeAprovisionamiento,
} from '../../domain/model/aprovisionamiento';
import {
  SOLICITUDES_DE_APROVISIONAMIENTO_PORT,
  SolicitudesDeAprovisionamientoPort,
} from '../../domain/port/aprovisionamiento.port';
import { CreaSolicitudDeAprovisionamiento } from './crea-solicitud-de-aprovisionamiento.use-case';

const SOLICITUD: SolicitudDeAprovisionamiento = {
  id: 's1',
  urlDeOrigen: 'https://detail.1688.com/offer/1.html',
  estado: 'PENDING',
  creadaEl: '2026-09-01T00:00:00Z',
  cuantasCotizaciones: 0,
};

class SolicitudesFalsas implements SolicitudesDeAprovisionamientoPort {
  recibida: NuevaSolicitud | null = null;

  async mias(): Promise<Result<readonly SolicitudDeAprovisionamiento[], AppError>> {
    return exito([SOLICITUD]);
  }

  async crea(solicitud: NuevaSolicitud): Promise<Result<SolicitudDeAprovisionamiento, AppError>> {
    this.recibida = solicitud;
    return exito(SOLICITUD);
  }

  async cancela(): Promise<Result<SolicitudDeAprovisionamiento, AppError>> {
    return exito(SOLICITUD);
  }

  async elimina(): Promise<Result<void, AppError>> {
    return exito(undefined);
  }
}

describe('CreaSolicitudDeAprovisionamiento', () => {
  let puerto: SolicitudesFalsas;
  let caso: CreaSolicitudDeAprovisionamiento;

  beforeEach(() => {
    puerto = new SolicitudesFalsas();
    TestBed.configureTestingModule({
      providers: [
        CreaSolicitudDeAprovisionamiento,
        { provide: SOLICITUDES_DE_APROVISIONAMIENTO_PORT, useValue: puerto },
      ],
    });
    caso = TestBed.inject(CreaSolicitudDeAprovisionamiento);
  });

  it('crea la solicitud con un enlace de un mercado soportado', async () => {
    const resultado = await caso.ejecuta({ url: 'https://detail.1688.com/offer/1.html' });

    expect(resultado.ok).toBe(true);
    expect(puerto.recibida?.url).toBe('https://detail.1688.com/offer/1.html');
  });

  it('recorta los espacios del enlace antes de enviarlo', async () => {
    await caso.ejecuta({ url: '  https://detail.1688.com/offer/1.html  ' });
    expect(puerto.recibida?.url).toBe('https://detail.1688.com/offer/1.html');
  });

  it('rechaza lo que no es una dirección sin gastar una llamada', async () => {
    const resultado = await caso.ejecuta({ url: 'pega aquí el enlace' });

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.codigo).toBe('URL_INVALIDA');
    expect(puerto.recibida).toBeNull();
  });

  it('distingue el mercado no soportado, porque el remedio es otro', async () => {
    const resultado = await caso.ejecuta({ url: 'https://mi-tienda.example/producto' });

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.codigo).toBe('MERCADO_NO_SOPORTADO');
    expect(puerto.recibida).toBeNull();
  });

  it('deja pasar el título y las notas', async () => {
    await caso.ejecuta({
      url: 'https://detail.1688.com/offer/1.html',
      tituloOrientativo: 'Botella térmica',
      notas: 'Que sea de acero',
    });

    expect(puerto.recibida?.tituloOrientativo).toBe('Botella térmica');
    expect(puerto.recibida?.notas).toBe('Que sea de acero');
  });
});
