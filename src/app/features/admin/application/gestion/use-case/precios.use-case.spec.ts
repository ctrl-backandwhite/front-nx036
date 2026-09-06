import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { BorradorDeRegla } from '../../../domain/gestion/model/precios';
import {
  AMBITOS_DE_REGLA_PORT, AmbitosDeReglaPort, PRECIOS_PORT, PreciosPort,
} from '../../../domain/gestion/port/precios.port';
import { CargaLosAmbitos, GuardaLaRegla } from './precios.use-case';

function doblePrecios(): PreciosPort & { llamadas: string[] } {
  const llamadas: string[] = [];
  return {
    llamadas,
    reglas: async () => exito([]),
    crea: async () => (llamadas.push('crea'), exito(undefined)),
    actualiza: async (id) => (llamadas.push(`actualiza:${id}`), exito(undefined)),
    alterna: async () => exito(undefined),
    borra: async () => exito(undefined),
    alternaEnLote: async () => exito({ correctos: 0, fallidos: 0, errores: [] }),
    borraEnLote: async () => exito({ correctos: 0, fallidos: 0, errores: [] }),
    ajusteDeMoq: async () => exito({ activo: false, factorPorcentaje: 100 }),
    guardaAjusteDeMoq: async (a) => exito(a),
  };
}

describe('GuardaLaRegla', () => {
  let puerto: ReturnType<typeof doblePrecios>;

  beforeEach(() => {
    puerto = doblePrecios();
    TestBed.configureTestingModule({
      providers: [{ provide: PRECIOS_PORT, useValue: puerto }, GuardaLaRegla],
    });
  });

  /**
   * Guardar es UN gesto: quien administra pulsa «guardar» y no decide si crea o actualiza. Lo decide
   * el dato, y por eso lo decide el caso de uso y no la pantalla.
   */
  it('crea cuando la regla no tiene identificador', async () => {
    const borrador: BorradorDeRegla = { ambito: 'GLOBAL', tipo: 'PERCENTAGE', valor: 30 };

    await TestBed.inject(GuardaLaRegla).ejecuta(borrador);

    expect(puerto.llamadas).toEqual(['crea']);
  });

  it('actualiza cuando ya lo tiene', async () => {
    await TestBed.inject(GuardaLaRegla).ejecuta({ id: 'r1', ambito: 'GLOBAL' });

    expect(puerto.llamadas).toEqual(['actualiza:r1']);
  });

  it('propaga el fallo del puerto', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PRECIOS_PORT, useValue: { ...doblePrecios(), crea: async () => fallo(creaError('conflicto')) } },
        GuardaLaRegla,
      ],
    });

    const resultado = await TestBed.inject(GuardaLaRegla).ejecuta({ ambito: 'GLOBAL' });

    expect(resultado.ok).toBe(false);
  });
});

describe('CargaLosAmbitos', () => {
  function dobleAmbitos(sobrescribe: Partial<AmbitosDeReglaPort> = {}): AmbitosDeReglaPort {
    return {
      categorias: async () => exito([{ id: 'c1', nombre: 'Moda' }]),
      proveedores: async () => exito([{ id: 'p1', nombre: 'Acme' }]),
      productos: async () => exito([{ id: 'x1', nombre: 'Gorro' }]),
      grupos: async () => exito([{ id: 'g1', nombre: 'Invierno (3)' }]),
      ...sobrescribe,
    };
  }

  it('trae las cuatro listas', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AMBITOS_DE_REGLA_PORT, useValue: dobleAmbitos() }, CargaLosAmbitos],
    });

    const ambitos = await TestBed.inject(CargaLosAmbitos).ejecuta();

    expect(ambitos.categorias).toHaveLength(1);
    expect(ambitos.grupos[0].nombre).toBe('Invierno (3)');
  });

  /**
   * Ninguna lista es imprescindible: la que falle deja su desplegable vacío, pero el editor tiene que
   * seguir abriéndose. Encadenarlas habría hecho que un catálogo lento retrasara todo lo demás.
   */
  it('una lista que falla deja su desplegable vacío sin tumbar las otras', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AMBITOS_DE_REGLA_PORT,
          useValue: dobleAmbitos({ productos: async () => fallo(creaError('sin-conexion')) }),
        },
        CargaLosAmbitos,
      ],
    });

    const ambitos = await TestBed.inject(CargaLosAmbitos).ejecuta();

    expect(ambitos.productos).toEqual([]);
    expect(ambitos.categorias).toHaveLength(1);
  });
});
