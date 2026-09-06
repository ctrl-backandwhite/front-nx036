import { describe, expect, it } from 'vitest';
import { RespuestaDelAsistente, claveDelAviso, turnoDelAsistente } from './conversacion';

function respuesta(parcial: Partial<RespuestaDelAsistente> = {}): RespuestaDelAsistente {
  return {
    idConversacion: 'c-1',
    texto: 'Aquí tienes.',
    productos: [],
    degradada: false,
    ...parcial,
  };
}

describe('claveDelAviso', () => {
  /** Distinguirlos importa: el cupo se arregla esperando y el motor apagado no. */
  it('el cupo agotado tiene su propio texto', () => {
    expect(claveDelAviso('QUOTA')).toBe('chat.quota');
  });

  it('el resto comparte el de «no disponible»', () => {
    expect(claveDelAviso('UNAVAILABLE')).toBe('chat.unavailable');
    expect(claveDelAviso(undefined)).toBe('chat.unavailable');
  });
});

describe('turnoDelAsistente', () => {
  it('pinta lo que dijo cuando dijo algo', () => {
    expect(turnoDelAsistente(respuesta(), 'aviso').texto).toBe('Aquí tienes.');
  });

  it('pone el aviso cuando no hubo texto', () => {
    expect(turnoDelAsistente(respuesta({ texto: null }), 'aviso').texto).toBe('aviso');
  });

  it('pone el aviso también cuando la respuesta viene degradada, aunque traiga texto', () => {
    expect(turnoDelAsistente(respuesta({ degradada: true }), 'aviso').texto).toBe('aviso');
  });

  it('arrastra la búsqueda para poder repetirla en el catálogo', () => {
    const turno = turnoDelAsistente(
      respuesta({ busqueda: { consulta: 'calcetines', total: 12 } }),
      'aviso',
    );
    expect(turno.busqueda).toEqual({ consulta: 'calcetines', total: 12 });
  });

  it('sin búsqueda no inventa una vacía', () => {
    expect(turnoDelAsistente(respuesta(), 'aviso').busqueda).toBeUndefined();
  });
});
