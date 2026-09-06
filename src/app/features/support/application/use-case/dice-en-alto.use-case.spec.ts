import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VOZ_PORT, VozPort } from '../../domain/port/voz.port';
import { DiceEnAlto } from './dice-en-alto.use-case';

const traduce = (clave: string): string => `[${clave}]`;

describe('DiceEnAlto', () => {
  let voz: VozPort;

  beforeEach(() => {
    voz = { disponible: vi.fn().mockReturnValue(true), habla: vi.fn(), calla: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: VOZ_PORT, useValue: voz }] });
  });

  it('lee el titular con los nombres detrás', () => {
    TestBed.inject(DiceEnAlto).ejecuta(
      { clave: 'avatar.suggest_title', productos: ['Calcetines', 'Gorra'] },
      'es',
      traduce,
    );

    expect(voz.habla).toHaveBeenCalledWith('[avatar.suggest_title]. Calcetines. Gorra', 'es');
  });

  /**
   * Sin esto, cualquier repintado volvía a soltar la misma frase, que es la forma más rápida de que
   * alguien apague la voz para siempre.
   */
  it('dice cada cosa UNA sola vez', () => {
    const caso = TestBed.inject(DiceEnAlto);

    caso.ejecuta({ clave: 'avatar.greeting' }, 'es', traduce);
    caso.ejecuta({ clave: 'avatar.greeting' }, 'es', traduce);

    expect(voz.habla).toHaveBeenCalledTimes(1);
  });

  it('el botón de repetir sí insiste', () => {
    const caso = TestBed.inject(DiceEnAlto);

    caso.ejecuta({ clave: 'avatar.greeting' }, 'es', traduce);
    caso.ejecuta({ clave: 'avatar.greeting' }, 'es', traduce, true);

    expect(voz.habla).toHaveBeenCalledTimes(2);
  });

  it('sin nada que decir, no habla', () => {
    TestBed.inject(DiceEnAlto).ejecuta(null, 'es', traduce);
    expect(voz.habla).not.toHaveBeenCalled();
  });

  it('callar corta lo que estuviera diciendo', () => {
    TestBed.inject(DiceEnAlto).calla();
    expect(voz.calla).toHaveBeenCalled();
  });

  it('olvidar lo dicho permite volver a decirlo', () => {
    const caso = TestBed.inject(DiceEnAlto);
    caso.ejecuta({ clave: 'avatar.greeting' }, 'es', traduce);
    caso.olvida();
    caso.ejecuta({ clave: 'avatar.greeting' }, 'es', traduce);

    expect(voz.habla).toHaveBeenCalledTimes(2);
  });
});
