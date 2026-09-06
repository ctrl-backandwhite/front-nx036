import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { Divisa } from '../../../domain/gestion/model/dinero';
import { IdiomaDeTienda } from '../../../domain/gestion/model/sistema';
import {
  IDIOMAS_PORT, IdiomasPort, MONEDAS_PORT, MonedasPort,
} from '../../../domain/gestion/port/sistema.port';
import { ActivaIdiomasEnLote, GuardaElIdioma, PublicaDivisas } from './sistema.use-case';

function idioma(codigo: string, cambios: Partial<IdiomaDeTienda> = {}): IdiomaDeTienda {
  return { id: codigo, codigo, etiqueta: codigo, posicion: 0, activo: false, porDefecto: false, ...cambios };
}

function divisa(codigo: string, tasa: number): Divisa {
  return { codigo, nombre: codigo, simbolo: '', tasaVsUsd: tasa, activa: false };
}

describe('GuardaElIdioma', () => {
  let guardados: { codigo: string; etiqueta?: string }[];
  let puerto: IdiomasPort;

  beforeEach(() => {
    guardados = [];
    puerto = {
      lista: async () => exito([]),
      guarda: async (i) => (guardados.push({ codigo: i.codigo, etiqueta: i.etiqueta }), exito(undefined)),
      borra: async () => exito(undefined),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: IDIOMAS_PORT, useValue: puerto }, GuardaElIdioma],
    });
  });

  it('normaliza el código a minúsculas y sin espacios', async () => {
    await TestBed.inject(GuardaElIdioma).ejecuta({ codigo: '  JA  ' });

    expect(guardados[0].codigo).toBe('ja');
  });

  /** Sin rótulo, el idioma aparecería en blanco en el selector y nadie sabría qué está eligiendo. */
  it('sin nombre usa el código en mayúsculas', async () => {
    await TestBed.inject(GuardaElIdioma).ejecuta({ codigo: 'ja', etiqueta: '   ' });

    expect(guardados[0].etiqueta).toBe('JA');
  });

  it('sin código no llega a llamar al puerto', async () => {
    const resultado = await TestBed.inject(GuardaElIdioma).ejecuta({ codigo: '   ' });

    expect(resultado.ok).toBe(false);
    expect(guardados).toEqual([]);
  });
});

describe('ActivaIdiomasEnLote', () => {
  /**
   * No hay endpoint masivo: se repite el guardado uno a uno. Un fallo suelto NO aborta el resto, y el
   * resumen dice cuántos quedaron sin cambiar y por qué.
   */
  it('cuenta aciertos y fallos sin abortar el lote', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: IDIOMAS_PORT,
          useValue: {
            lista: async () => exito([]),
            guarda: async (i: IdiomaDeTienda) =>
              i.codigo === 'ar' ? fallo(creaError('conflicto', 'no se puede')) : exito(undefined),
            borra: async () => exito(undefined),
          },
        },
        ActivaIdiomasEnLote,
      ],
    });

    const resumen = await TestBed.inject(ActivaIdiomasEnLote)
      .ejecuta([idioma('ja'), idioma('ar'), idioma('ko')], true);

    expect(resumen.correctos).toBe(2);
    expect(resumen.fallidos).toBe(1);
    expect(resumen.errores[0]).toContain('ar');
  });
});

describe('PublicaDivisas', () => {
  let llamadas: string[];
  let puerto: MonedasPort;
  const registro = [divisa('EUR', 0.92), divisa('COP', 0)];

  beforeEach(() => {
    llamadas = [];
    puerto = {
      lista: async () => exito(registro),
      sincroniza: async () => exito(0),
      activa: async (c, a) => (llamadas.push(`una:${c}:${a}`), exito(undefined)),
      activaEnLote: async (c, a) => (llamadas.push(`lote:${c.join(',')}:${a}`), exito(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: MONEDAS_PORT, useValue: puerto }, PublicaDivisas],
    });
  });

  it('usa el endpoint de una sola divisa cuando solo hay una', async () => {
    await TestBed.inject(PublicaDivisas).ejecuta(['EUR'], true, registro);

    expect(llamadas).toEqual(['una:EUR:true']);
  });

  it('usa el masivo cuando hay varias', async () => {
    await TestBed.inject(PublicaDivisas).ejecuta(['EUR', 'USD'], false, registro);

    expect(llamadas).toEqual(['lote:EUR,USD:false']);
  });

  /**
   * Sin tasa, el escaparate enseñaría el precio en dólares con el símbolo de otra moneda: estaría
   * anunciando un importe que no es el que se cobra.
   */
  it('no deja activar una divisa sin tipo de cambio y dice cuál', async () => {
    const resultado = await TestBed.inject(PublicaDivisas).ejecuta(['EUR', 'COP'], true, registro);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.porCampo?.['divisas']).toBe('COP');
    }
    expect(llamadas).toEqual([]);
  });

  /** Desactivar NUNCA se bloquea: es la salida de emergencia si alguna llegó a publicarse. */
  it('sí deja desactivar una divisa sin tasa', async () => {
    const resultado = await TestBed.inject(PublicaDivisas).ejecuta(['COP'], false, registro);

    expect(resultado.ok).toBe(true);
    expect(llamadas).toEqual(['una:COP:false']);
  });
});
