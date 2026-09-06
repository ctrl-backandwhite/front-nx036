import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { analizaCuerpo } from '../../../domain/gestion/model/legal';
import { LEGAL_PORT, LegalPort } from '../../../domain/gestion/port/legal.port';
import { GuardaElBorradorLegal, PublicaLosTextosLegales } from './legal.use-case';

function doble(sobrescribe: Partial<LegalPort> = {}): LegalPort & { guardados: string[] } {
  const guardados: string[] = [];
  return {
    guardados,
    lista: async () => exito([]),
    documento: async () => fallo(creaError('no-encontrado')),
    guarda: async (clase, idioma, titulo, cuerpo) => (
      guardados.push(`${clase}/${idioma}/${titulo}/${cuerpo}`), exito(undefined)
    ),
    publica: async (version) => exito({ version, avisados: 1500 }),
    ...sobrescribe,
  };
}

describe('GuardaElBorradorLegal', () => {
  it('serializa el cuerpo con los nombres que espera el backend', async () => {
    const puerto = doble();
    TestBed.configureTestingModule({
      providers: [{ provide: LEGAL_PORT, useValue: puerto }, GuardaElBorradorLegal],
    });

    await TestBed.inject(GuardaElBorradorLegal).ejecuta('privacy', 'es', 'Privacidad', {
      intro: 'Hola',
      secciones: [{ h: 'Uno', p: ['a'] }],
    });

    const [guardado] = puerto.guardados;
    expect(guardado.startsWith('privacy/es/Privacidad/')).toBe(true);
    // Y se puede volver a leer: el ida y vuelta no pierde nada.
    expect(analizaCuerpo(guardado.split('/').slice(3).join('/')).intro).toBe('Hola');
  });
});

describe('PublicaLosTextosLegales', () => {
  /** Publicar hace visible el texto Y manda un correo a todas las cuentas activas. No se puede retirar. */
  it('devuelve la versión publicada y a cuántas cuentas se avisó', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LEGAL_PORT, useValue: doble() }, PublicaLosTextosLegales],
    });

    const resultado = await TestBed.inject(PublicaLosTextosLegales).ejecuta('2026-03-05');

    expect(resultado).toEqual({ ok: true, valor: { version: '2026-03-05', avisados: 1500 } });
  });

  it('propaga el fallo sin dar por publicado nada', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: LEGAL_PORT, useValue: doble({ publica: async () => fallo(creaError('error-del-servidor')) }) },
        PublicaLosTextosLegales,
      ],
    });

    expect((await TestBed.inject(PublicaLosTextosLegales).ejecuta('2026-03-05')).ok).toBe(false);
  });
});
