import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { SOPORTE_PORT, SoportePort } from '../../../domain/gestion/port/soporte.port';
import { RespondeAlTicket, ResuelveElTicket } from './soporte.use-case';

function doble(sobrescribe: Partial<SoportePort> = {}): SoportePort & { llamadas: string[] } {
  const llamadas: string[] = [];
  return {
    llamadas,
    tickets: async () => exito([]),
    mensajes: async () => exito([]),
    responde: async (id, cuerpo) => (llamadas.push(`responde:${id}:${cuerpo}`), exito(undefined)),
    resuelve: async (id, texto) => (llamadas.push(`resuelve:${id}:${texto}`), exito(undefined)),
    ...sobrescribe,
  };
}

describe('RespondeAlTicket', () => {
  let puerto: ReturnType<typeof doble>;

  beforeEach(() => {
    puerto = doble();
    TestBed.configureTestingModule({
      providers: [{ provide: SOPORTE_PORT, useValue: puerto }, RespondeAlTicket, ResuelveElTicket],
    });
  });

  it('manda el mensaje recortado', async () => {
    await TestBed.inject(RespondeAlTicket).ejecuta('t1', '  ya está en camino  ');

    expect(puerto.llamadas).toEqual(['responde:t1:ya está en camino']);
  });

  it('un mensaje vacío no se manda', async () => {
    const resultado = await TestBed.inject(RespondeAlTicket).ejecuta('t1', '   ');

    expect(resultado.ok).toBe(false);
    expect(puerto.llamadas).toEqual([]);
  });

  /** Cerrar sin explicación deja al cliente sin saber qué pasó con su reclamación. */
  it('no se cierra un caso sin resolución escrita', async () => {
    const resultado = await TestBed.inject(ResuelveElTicket).ejecuta('t1', '  ');

    expect(resultado.ok).toBe(false);
    expect(puerto.llamadas).toEqual([]);
  });

  it('cierra el caso con la resolución recortada', async () => {
    await TestBed.inject(ResuelveElTicket).ejecuta('t1', '  reenviado  ');

    expect(puerto.llamadas).toEqual(['resuelve:t1:reenviado']);
  });

  it('propaga el rechazo del backend en vez de tragárselo', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: SOPORTE_PORT, useValue: doble({ resuelve: async () => fallo(creaError('conflicto', 'Ya resuelto')) }) },
        ResuelveElTicket,
      ],
    });

    const resultado = await TestBed.inject(ResuelveElTicket).ejecuta('t1', 'reenviado');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.mensaje).toBe('Ya resuelto');
    }
  });
});
