import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { SOCIOS_PORT, SociosPort } from '../../../domain/gestion/port/socios.port';
import { ConsultaSocios, CreaElCliente } from './socios.use-case';

function doble(sobrescribe: Partial<SociosPort> = {}): SociosPort {
  return {
    clientes: async () => exito([
      { id: '1', identificador: 'acme', nombre: 'Acme', concesiones: '', permisos: '' },
    ]),
    aplicaciones: async () => exito([]),
    entregas: async () => exito([]),
    crea: async () => exito({ identificador: 'acme', secreto: 's3cr3t' }),
    rotaSecreto: async () => exito({ identificador: 'acme', secreto: 'nuevo' }),
    borra: async () => exito(undefined),
    pruebaWebhooks: async () => exito(3),
    ...sobrescribe,
  };
}

describe('ConsultaSocios', () => {
  it('trae las tres tablas de una vez', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: SOCIOS_PORT, useValue: doble() }, ConsultaSocios],
    });

    const panorama = await TestBed.inject(ConsultaSocios).ejecuta();

    expect(panorama.clientes).toHaveLength(1);
    expect(panorama.aplicaciones).toEqual([]);
  });

  /** Que falle una tabla no puede dejar la pantalla en blanco: las otras dos siguen siendo útiles. */
  it('una tabla que falla queda vacía sin tumbar las demás', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: SOCIOS_PORT, useValue: doble({ entregas: async () => fallo(creaError('error-del-servidor')) }) },
        ConsultaSocios,
      ],
    });

    const panorama = await TestBed.inject(ConsultaSocios).ejecuta();

    expect(panorama.entregas).toEqual([]);
    expect(panorama.clientes).toHaveLength(1);
  });
});

describe('CreaElCliente', () => {
  /**
   * El secreto sale del backend UNA sola vez. Esta prueba deja constancia de que el caso de uso lo
   * devuelve a quien llama, que es quien tiene que enseñarlo en ese mismo instante.
   */
  it('devuelve el secreto recién emitido', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: SOCIOS_PORT, useValue: doble() }, CreaElCliente],
    });

    const resultado = await TestBed.inject(CreaElCliente)
      .ejecuta({ nombre: 'Acme', permisos: ['catalog.read'] });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.secreto).toBe('s3cr3t');
    }
  });
});
