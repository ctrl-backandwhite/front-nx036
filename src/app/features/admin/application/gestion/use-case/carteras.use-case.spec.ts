import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { paginaVacia } from '../../../domain/gestion/model/pagina';
import { CARTERAS_PORT, CarterasPort } from '../../../domain/gestion/port/carteras.port';
import { AjustaLaCartera, IngresaEnLaCartera, ReindexaCarteras } from './carteras.use-case';

function doble(sobrescribe: Partial<CarterasPort> = {}): CarterasPort & { llamadas: string[] } {
  const llamadas: string[] = [];
  return {
    llamadas,
    busca: async () => exito(paginaVacia()),
    detalle: async () => fallo(creaError('no-encontrado')),
    movimientos: async () => exito(paginaVacia()),
    deposita: async (d) => (llamadas.push(`deposita:${d.importeCentimos}`), exito(undefined)),
    ajusta: async (a) => (llamadas.push(`ajusta:${a.importeCentimos}`), exito(undefined)),
    reindexa: async () => exito(42),
    ...sobrescribe,
  };
}

describe('casos de uso de carteras', () => {
  let puerto: ReturnType<typeof doble>;

  beforeEach(() => {
    puerto = doble();
    TestBed.configureTestingModule({
      providers: [
        { provide: CARTERAS_PORT, useValue: puerto },
        IngresaEnLaCartera, AjustaLaCartera, ReindexaCarteras,
      ],
    });
  });

  it('ingresa cuando el importe suma', async () => {
    const resultado = await TestBed.inject(IngresaEnLaCartera)
      .ejecuta({ idUsuario: 'u1', importeCentimos: 2500 });

    expect(resultado.ok).toBe(true);
    expect(puerto.llamadas).toEqual(['deposita:2500']);
  });

  /**
   * La comprobación vive AQUÍ y no solo en el formulario: un botón deshabilitado es una comodidad, no
   * una regla. Un apunte de cero ensuciaría el libro mayor sin mover saldo.
   */
  it('no deja ingresar cero ni importes negativos, y no llega a llamar al puerto', async () => {
    const caso = TestBed.inject(IngresaEnLaCartera);

    const cero = await caso.ejecuta({ idUsuario: 'u1', importeCentimos: 0 });
    const negativo = await caso.ejecuta({ idUsuario: 'u1', importeCentimos: -100 });

    expect(cero.ok).toBe(false);
    expect(negativo.ok).toBe(false);
    expect(puerto.llamadas).toEqual([]);
  });

  it('ajusta en las dos direcciones cuando hay motivo', async () => {
    const resultado = await TestBed.inject(AjustaLaCartera)
      .ejecuta({ idUsuario: 'u1', importeCentimos: -1000, descripcion: 'cobro duplicado' });

    expect(resultado.ok).toBe(true);
    expect(puerto.llamadas).toEqual(['ajusta:-1000']);
  });

  /** El apunte queda en el libro mayor: alguien tendrá que explicarlo cuando el cliente pregunte. */
  it('rechaza un ajuste sin motivo o de importe cero', async () => {
    const caso = TestBed.inject(AjustaLaCartera);

    const sinMotivo = await caso.ejecuta({ idUsuario: 'u1', importeCentimos: -1000, descripcion: '  ' });
    const aCero = await caso.ejecuta({ idUsuario: 'u1', importeCentimos: 0, descripcion: 'algo' });

    expect(sinMotivo.ok).toBe(false);
    expect(aCero.ok).toBe(false);
    expect(puerto.llamadas).toEqual([]);
  });

  it('reindexa devolviendo cuántas carteras se indexaron', async () => {
    const resultado = await TestBed.inject(ReindexaCarteras).ejecuta();

    expect(resultado).toEqual({ ok: true, valor: 42 });
  });

  it('propaga el fallo del puerto al ingresar', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: CARTERAS_PORT, useValue: doble({ deposita: async () => fallo(creaError('conflicto')) }) },
        IngresaEnLaCartera,
      ],
    });

    const resultado = await TestBed.inject(IngresaEnLaCartera)
      .ejecuta({ idUsuario: 'u1', importeCentimos: 100 });

    expect(resultado.ok).toBe(false);
  });
});
