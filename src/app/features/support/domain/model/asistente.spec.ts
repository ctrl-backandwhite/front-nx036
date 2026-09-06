import { describe, expect, it } from 'vitest';
import { POSICION_INICIAL, acotaPosicion, animoDe, esPorEnvio, queToca } from './asistente';

describe('acotaPosicion', () => {
  it('no deja que se salga por el borde al encoger la ventana', () => {
    const fuera = { derecha: 900, abajo: 900 };
    expect(acotaPosicion(fuera, 400, 800)).toEqual({ derecha: 320, abajo: 720 });
  });

  it('respeta un margen mínimo por los dos lados', () => {
    expect(acotaPosicion({ derecha: -50, abajo: -50 }, 1200, 800)).toEqual({ derecha: 8, abajo: 8 });
  });

  it('en una ventana diminuta se queda en el margen en vez de dar un valor negativo', () => {
    expect(acotaPosicion(POSICION_INICIAL, 40, 40)).toEqual({ derecha: 8, abajo: 8 });
  });
});

describe('animoDe', () => {
  const base = { estado: 'activo' as const, arrastrando: false, consultando: false, contento: false };

  it('encogido, duerme', () => {
    expect(animoDe({ ...base, estado: 'mini', consultando: true })).toBe('dormido');
  });

  it('el arrastre manda sobre la consulta', () => {
    expect(animoDe({ ...base, arrastrando: true, consultando: true })).toBe('arrastrado');
  });

  it('mientras consulta, piensa', () => {
    expect(animoDe({ ...base, consultando: true })).toBe('pensando');
  });

  it('con algo que ofrecer, se pone contento; si no, quieto', () => {
    expect(animoDe({ ...base, contento: true })).toBe('contento');
    expect(animoDe(base)).toBe('quieto');
  });
});

describe('queToca', () => {
  const sugerencias = [{ titulo: 'Calcetines', motivo: 'DUTY' }];

  /**
   * El ORDEN no es caprichoso: quien no sabe cómo se calcula el precio final no entiende una sugerencia
   * sobre aranceles. Enseñar las tres cosas a la vez es no enseñar ninguna.
   */
  it('la guía va antes que nada', () => {
    expect(
      queToca({ guiaPendiente: true, saludando: true, globoAbierto: true, sugerencias })?.clave,
    ).toBe('avatar.guide_offer');
  });

  it('después, el saludo', () => {
    expect(
      queToca({ guiaPendiente: false, saludando: true, globoAbierto: true, sugerencias })?.clave,
    ).toBe('avatar.greeting');
  });

  it('y por último lo que conviene añadir, con los nombres detrás', () => {
    const que = queToca({
      guiaPendiente: false,
      saludando: false,
      globoAbierto: true,
      sugerencias,
    });
    expect(que).toEqual({ clave: 'avatar.suggest_title', productos: ['Calcetines'] });
  });

  it('si el ahorro es de envío, cambia el discurso entero', () => {
    const que = queToca({
      guiaPendiente: false,
      saludando: false,
      globoAbierto: true,
      sugerencias: [{ titulo: 'Gorra', motivo: 'SHIPPING' }],
    });
    expect(que?.clave).toBe('avatar.suggest_title_shipping');
  });

  it('con el globo cerrado o sin nada que ofrecer, calla', () => {
    expect(
      queToca({ guiaPendiente: false, saludando: false, globoAbierto: false, sugerencias }),
    ).toBeNull();
    expect(
      queToca({ guiaPendiente: false, saludando: false, globoAbierto: true, sugerencias: [] }),
    ).toBeNull();
  });
});

describe('esPorEnvio', () => {
  it('manda el motivo de la primera sugerencia', () => {
    expect(esPorEnvio([{ motivo: 'SHIPPING' }, { motivo: 'DUTY' }])).toBe(true);
    expect(esPorEnvio([{ motivo: 'DUTY' }])).toBe(false);
    expect(esPorEnvio([])).toBe(false);
  });
});
