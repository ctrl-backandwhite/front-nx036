import { TestBed } from '@angular/core/testing';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import {
  ESTADO_DEL_SERVICIO_PORT,
  EstadoDelServicioPort,
} from '../../domain/port/estado-del-servicio.port';
import { CompruebaEstadoDelServicio } from './comprueba-estado-del-servicio.use-case';

class ServicioFalso implements EstadoDelServicioPort {
  respuesta: Result<void, AppError> = exito(undefined);

  async comprueba(): Promise<Result<void, AppError>> {
    return this.respuesta;
  }
}

describe('CompruebaEstadoDelServicio', () => {
  let puerto: ServicioFalso;
  let caso: CompruebaEstadoDelServicio;

  beforeEach(() => {
    puerto = new ServicioFalso();
    TestBed.configureTestingModule({
      providers: [
        CompruebaEstadoDelServicio,
        { provide: ESTADO_DEL_SERVICIO_PORT, useValue: puerto },
      ],
    });
    caso = TestBed.inject(CompruebaEstadoDelServicio);
  });

  it('si el backend responde, el servicio está operativo', async () => {
    expect(await caso.ejecuta()).toBe('operativo');
  });

  it('si no responde, degradado', async () => {
    puerto.respuesta = fallo(creaError('sin-conexion'));
    expect(await caso.ejecuta()).toBe('degradado');
  });

  it('un 500 también cuenta como degradado', async () => {
    puerto.respuesta = fallo(creaError('error-del-servidor', 'Vaya'));
    expect(await caso.ejecuta()).toBe('degradado');
  });
});
