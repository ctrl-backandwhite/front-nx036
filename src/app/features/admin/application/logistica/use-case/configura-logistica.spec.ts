import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  ALMACENES_ADMIN_PORT,
  CUMPLIMIENTO_PORT,
  IMPUESTOS_PORT,
  LIMITES_DE_TRANSPORTISTA_PORT,
} from '../../../domain/logistica/port/configuracion-logistica.port';
import { MIS_GANANCIAS_PORT, REPORTE_DE_OPERADORES_PORT } from '../../../domain/logistica/port/operadores.port';
import { limiteEnBlanco } from '../../../domain/logistica/model/limite-transportista';
import { operadorEnBlanco } from '../../../domain/logistica/model/cumplimiento';
import { Almacen } from '../../../domain/logistica/model/almacen';
import {
  AlternaLimiteDeTransportista,
  AplicaLoteDeAlmacenes,
  BorraAlmacen,
  BorraLimiteDeTransportista,
  ConsultaAlmacenes,
  ConsultaLimitesDeTransportista,
  GuardaAlmacen,
  GuardaLimiteDeTransportista,
} from './configura-logistica.use-case';
import {
  AlternaImpuestoDePais,
  AlternaRegionFiscal,
  BorraImpuestoDePais,
  BorraRegionFiscal,
  ConsultaImpuestos,
  GuardaImpuestoDePais,
  GuardaRegionFiscal,
} from './gestiona-impuestos.use-case';
import { ConsultaCumplimiento, GuardaOperadorEconomico } from './gestiona-cumplimiento.use-case';
import { ConsultaMisGanancias, ConsultaReporteDeOperadores, ReindexaOperaciones } from './consulta-ganancias.use-case';

function dobleDeLimites() {
  return {
    lista: vi.fn().mockResolvedValue(exito([])),
    guarda: vi.fn().mockResolvedValue(exito(undefined)),
    borra: vi.fn().mockResolvedValue(exito(undefined)),
  };
}

describe('límites del transportista', () => {
  function monta(puerto: ReturnType<typeof dobleDeLimites>) {
    TestBed.configureTestingModule({
      providers: [
        ConsultaLimitesDeTransportista,
        GuardaLimiteDeTransportista,
        AlternaLimiteDeTransportista,
        BorraLimiteDeTransportista,
        { provide: LIMITES_DE_TRANSPORTISTA_PORT, useValue: puerto },
      ],
    });
  }

  it('guarda un límite con clave completa', async () => {
    const puerto = dobleDeLimites();
    monta(puerto);
    const limite = { ...limiteEnBlanco(), canal: 'FZZXR' };

    const resultado = await TestBed.inject(GuardaLimiteDeTransportista).ejecuta(limite);

    expect(resultado.ok).toBe(true);
    expect(puerto.guarda).toHaveBeenCalledWith(limite);
  });

  /** Sin canal no hay clave: guardarlo crearía una fila que no se puede volver a encontrar. */
  it('rechaza sin llamar al backend un límite sin canal', async () => {
    const puerto = dobleDeLimites();
    monta(puerto);

    const resultado = await TestBed.inject(GuardaLimiteDeTransportista).ejecuta(limiteEnBlanco());

    expect(resultado.ok || resultado.error).toBe('sin-clave');
    expect(puerto.guarda).not.toHaveBeenCalled();
  });

  it('alternar la vigencia conserva el resto de la fila', async () => {
    const puerto = dobleDeLimites();
    monta(puerto);
    const limite = { ...limiteEnBlanco(), canal: 'FZZXR', pesoMaximoGramos: 2000, activo: true };

    await TestBed.inject(AlternaLimiteDeTransportista).ejecuta(limite);

    expect(puerto.guarda).toHaveBeenCalledWith({ ...limite, activo: false });
  });

  it('borrar usa el par canal más país, que es la clave', async () => {
    const puerto = dobleDeLimites();
    monta(puerto);

    await TestBed.inject(BorraLimiteDeTransportista).ejecuta({
      ...limiteEnBlanco(),
      canal: 'FZZXR',
      pais: 'ES',
    });

    expect(puerto.borra).toHaveBeenCalledWith('FZZXR', 'ES');
  });

  it('la lista propaga el fallo del backend', async () => {
    const puerto = dobleDeLimites();
    puerto.lista.mockResolvedValue(fallo(creaError('sin-conexion')));
    monta(puerto);

    expect((await TestBed.inject(ConsultaLimitesDeTransportista).ejecuta()).ok).toBe(false);
  });
});

describe('almacenes', () => {
  const madrid: Almacen = { id: 'a1', codigo: 'ES-MAD', nombre: 'Madrid', activo: true };

  function dobleDeAlmacenes() {
    return {
      lista: vi.fn().mockResolvedValue(exito([madrid])),
      crea: vi.fn().mockResolvedValue(exito(undefined)),
      actualiza: vi.fn().mockResolvedValue(exito(undefined)),
      borra: vi.fn().mockResolvedValue(exito(undefined)),
    };
  }

  function monta(puerto: ReturnType<typeof dobleDeAlmacenes>) {
    TestBed.configureTestingModule({
      providers: [
        ConsultaAlmacenes,
        GuardaAlmacen,
        BorraAlmacen,
        AplicaLoteDeAlmacenes,
        { provide: ALMACENES_ADMIN_PORT, useValue: puerto },
      ],
    });
  }

  it('sin identificador CREA; con identificador ACTUALIZA', async () => {
    const puerto = dobleDeAlmacenes();
    monta(puerto);
    const datos = { codigo: 'ES-BCN', nombre: 'Barcelona', activo: true };

    await TestBed.inject(GuardaAlmacen).ejecuta(null, datos);
    await TestBed.inject(GuardaAlmacen).ejecuta('a1', datos);

    expect(puerto.crea).toHaveBeenCalledWith(datos);
    expect(puerto.actualiza).toHaveBeenCalledWith('a1', datos);
  });

  it('rechaza sin llamar al backend un almacén sin código', async () => {
    const puerto = dobleDeAlmacenes();
    monta(puerto);

    const resultado = await TestBed.inject(GuardaAlmacen).ejecuta(null, {
      codigo: '',
      nombre: 'Barcelona',
      activo: true,
    });

    expect(resultado.ok || resultado.error).toBe('sin-clave');
    expect(puerto.crea).not.toHaveBeenCalled();
  });

  it('la consulta y el borrado llegan al puerto', async () => {
    const puerto = dobleDeAlmacenes();
    monta(puerto);

    expect((await TestBed.inject(ConsultaAlmacenes).ejecuta()).ok).toBe(true);
    await TestBed.inject(BorraAlmacen).ejecuta('a1');
    expect(puerto.borra).toHaveBeenCalledWith('a1');
  });

  it('el lote de activación escribe fila a fila conservando el resto de datos', async () => {
    const puerto = dobleDeAlmacenes();
    monta(puerto);

    const parte = await TestBed.inject(AplicaLoteDeAlmacenes).activa([madrid], false);

    expect(puerto.actualiza).toHaveBeenCalledWith('a1', {
      codigo: 'ES-MAD',
      nombre: 'Madrid',
      pais: '',
      ciudad: '',
      activo: false,
    });
    expect(parte).toEqual({ correctas: 1, errores: [] });
  });

  /**
   * Un lote a medias sin decir cuáles fallaron obliga a repetirlo entero, y repetir un borrado ya hecho
   * da otro error encima.
   */
  it('un lote a medias cuenta lo que salió y nombra lo que no', async () => {
    const puerto = dobleDeAlmacenes();
    const barcelona: Almacen = { id: 'a2', codigo: 'ES-BCN', nombre: 'Barcelona', activo: true };
    puerto.borra
      .mockResolvedValueOnce(exito(undefined))
      .mockResolvedValueOnce(fallo(creaError('conflicto', 'tiene pedidos')));
    monta(puerto);

    const parte = await TestBed.inject(AplicaLoteDeAlmacenes).borra([madrid, barcelona]);

    expect(parte.correctas).toBe(1);
    expect(parte.errores).toEqual(['ES-BCN: tiene pedidos']);
  });

  it('un lote vacío no llama a nadie', async () => {
    const puerto = dobleDeAlmacenes();
    monta(puerto);

    expect(await TestBed.inject(AplicaLoteDeAlmacenes).borra([])).toEqual({
      correctas: 0,
      errores: [],
    });
    expect(puerto.borra).not.toHaveBeenCalled();
  });
});

describe('impuestos', () => {
  function dobleDeImpuestos() {
    return {
      lista: vi.fn().mockResolvedValue(exito([])),
      guarda: vi.fn().mockResolvedValue(exito(undefined)),
      borra: vi.fn().mockResolvedValue(exito(undefined)),
      regiones: vi.fn().mockResolvedValue(exito([])),
      guardaRegion: vi.fn().mockResolvedValue(exito(undefined)),
      borraRegion: vi.fn().mockResolvedValue(exito(undefined)),
    };
  }

  function monta(puerto: ReturnType<typeof dobleDeImpuestos>) {
    TestBed.configureTestingModule({
      providers: [
        ConsultaImpuestos,
        GuardaImpuestoDePais,
        AlternaImpuestoDePais,
        BorraImpuestoDePais,
        GuardaRegionFiscal,
        AlternaRegionFiscal,
        BorraRegionFiscal,
        { provide: IMPUESTOS_PORT, useValue: puerto },
      ],
    });
  }

  it('sin país no se guarda nada', async () => {
    const puerto = dobleDeImpuestos();
    monta(puerto);

    const resultado = await TestBed.inject(GuardaImpuestoDePais).ejecuta({
      pais: '',
      etiqueta: 'IVA',
      porcentaje: 21,
      activo: true,
    });

    expect(resultado.ok || resultado.error).toBe('sin-clave');
    expect(puerto.guarda).not.toHaveBeenCalled();
  });

  it('alternar un país conserva su etiqueta y su tasa', async () => {
    const puerto = dobleDeImpuestos();
    monta(puerto);

    await TestBed.inject(AlternaImpuestoDePais).ejecuta({
      pais: 'ES',
      etiqueta: 'IVA',
      puntosBasicos: 2100,
      porcentaje: 21,
      activo: true,
    });

    expect(puerto.guarda).toHaveBeenCalledWith({
      pais: 'ES',
      etiqueta: 'IVA',
      porcentaje: 21,
      activo: false,
    });
  });

  /**
   * El vacío significa «usa la nacional». Convertirlo en cero al alternar la marca dejaría el estado
   * exento sin que nadie lo hubiera pedido.
   */
  it('alternar una región sin tasa propia NO le inventa un cero', async () => {
    const puerto = dobleDeImpuestos();
    monta(puerto);

    await TestBed.inject(AlternaRegionFiscal).ejecuta({
      pais: 'US',
      codigo: 'CA',
      nombre: 'California',
      puntosBasicos: null,
      porcentaje: null,
      activo: true,
      posicion: 0,
    });

    expect(puerto.guardaRegion).toHaveBeenCalledWith('US', {
      codigo: 'CA',
      nombre: 'California',
      porcentaje: '',
      activo: false,
    });
  });

  it('una región sin código o sin nombre no se guarda', async () => {
    const puerto = dobleDeImpuestos();
    monta(puerto);

    const resultado = await TestBed.inject(GuardaRegionFiscal).ejecuta('US', {
      codigo: 'CA',
      nombre: '',
      porcentaje: '',
      activo: true,
    });

    expect(resultado.ok || resultado.error).toBe('sin-clave');
    expect(puerto.guardaRegion).not.toHaveBeenCalled();
  });

  it('las consultas y los borrados llegan al puerto', async () => {
    const puerto = dobleDeImpuestos();
    monta(puerto);
    const consulta = TestBed.inject(ConsultaImpuestos);

    await consulta.paises();
    await consulta.regiones('US');
    await TestBed.inject(BorraImpuestoDePais).ejecuta('ES');
    await TestBed.inject(BorraRegionFiscal).ejecuta('US', 'CA');

    expect(puerto.lista).toHaveBeenCalled();
    expect(puerto.regiones).toHaveBeenCalledWith('US');
    expect(puerto.borra).toHaveBeenCalledWith('ES');
    expect(puerto.borraRegion).toHaveBeenCalledWith('US', 'CA');
  });
});

describe('cumplimiento', () => {
  function dobleDeCumplimiento() {
    return {
      operador: vi.fn().mockResolvedValue(exito(null)),
      guardaOperador: vi.fn().mockResolvedValue(exito(undefined)),
      papeles: vi.fn().mockResolvedValue(exito([{ codigo: 'IMPORTER', etiqueta: 'Importador' }])),
      estado: vi.fn().mockResolvedValue(
        exito({ operadorPublicado: false, productosActivos: 10, sinFabricante: 2 }),
      ),
    };
  }

  function monta(puerto: ReturnType<typeof dobleDeCumplimiento>) {
    TestBed.configureTestingModule({
      providers: [
        ConsultaCumplimiento,
        GuardaOperadorEconomico,
        { provide: CUMPLIMIENTO_PORT, useValue: puerto },
      ],
    });
  }

  /** El formulario existe igual sin operador declarado: es donde se declara el primero. */
  it('sin operador declarado devuelve uno EN BLANCO, no un nulo', async () => {
    const puerto = dobleDeCumplimiento();
    monta(puerto);

    const resultado = await TestBed.inject(ConsultaCumplimiento).ejecuta('es');

    expect(resultado.ok && resultado.valor.operador).toEqual(operadorEnBlanco());
    expect(resultado.ok && resultado.valor.papeles).toHaveLength(1);
  });

  it('el idioma viaja en las tres lecturas: el backend traduce la figura del artículo 4.2', async () => {
    const puerto = dobleDeCumplimiento();
    monta(puerto);

    await TestBed.inject(ConsultaCumplimiento).ejecuta('fr');

    expect(puerto.operador).toHaveBeenCalledWith('fr');
    expect(puerto.papeles).toHaveBeenCalledWith('fr');
    expect(puerto.estado).toHaveBeenCalledWith('fr');
  });

  it.each(['operador', 'papeles', 'estado'] as const)(
    'si falla la lectura de %s, la vista entera falla',
    async (cual) => {
      const puerto = dobleDeCumplimiento();
      puerto[cual].mockResolvedValue(fallo(creaError('error-del-servidor')));
      monta(puerto);

      expect((await TestBed.inject(ConsultaCumplimiento).ejecuta('es')).ok).toBe(false);
    },
  );

  /** Publicar un bloque a medias incumple el art. 19: es peor que no publicarlo. */
  it('no deja PUBLICAR un operador incompleto', async () => {
    const puerto = dobleDeCumplimiento();
    monta(puerto);

    const resultado = await TestBed.inject(GuardaOperadorEconomico).ejecuta(
      { ...operadorEnBlanco(), publicado: true },
      'es',
    );

    expect(resultado.ok || resultado.error).toBe('incompleto');
    expect(puerto.guardaOperador).not.toHaveBeenCalled();
  });

  /** Guardar sin publicar sí se permite a medias: así se puede ir rellenando. */
  it('sí deja GUARDAR sin publicar aunque falten datos', async () => {
    const puerto = dobleDeCumplimiento();
    monta(puerto);

    const resultado = await TestBed.inject(GuardaOperadorEconomico).ejecuta(
      operadorEnBlanco(),
      'es',
    );

    expect(resultado.ok).toBe(true);
    expect(puerto.guardaOperador).toHaveBeenCalled();
  });
});

describe('ganancias', () => {
  function dobleDeGanancias() {
    return {
      resumen: vi.fn().mockResolvedValue(
        exito({
          operador: 's1',
          operaciones: 4,
          comisionCentimosCny: 1200,
          desde: '2026-08-07',
          hasta: '2026-09-06',
        }),
      ),
      historico: vi
        .fn()
        .mockResolvedValue(exito({ operaciones: [], total: 0, pagina: 0, tamano: 20 })),
    };
  }

  function monta(puerto: ReturnType<typeof dobleDeGanancias>) {
    TestBed.configureTestingModule({
      providers: [ConsultaMisGanancias, { provide: MIS_GANANCIAS_PORT, useValue: puerto }],
    });
    return TestBed.inject(ConsultaMisGanancias);
  }

  const RANGO = { desde: '2026-08-07', hasta: '2026-09-06' };

  it('reúne resumen e histórico en una sola respuesta', async () => {
    const resultado = await monta(dobleDeGanancias()).ejecuta(RANGO, 0, 20);

    expect(resultado.ok && resultado.valor.resumen.operaciones).toBe(4);
  });

  /**
   * Para quien cobra por producción, «¥ 0,00» significa «no has ganado nada», que es lo contrario de
   * «no se ha podido consultar».
   */
  it('un fallo NO se convierte en un resumen a cero', async () => {
    const puerto = dobleDeGanancias();
    puerto.resumen.mockResolvedValue(fallo(creaError('sin-conexion')));

    expect((await monta(puerto).ejecuta(RANGO, 0, 20)).ok).toBe(false);
  });

  it('también falla si lo que se cae es el histórico', async () => {
    const puerto = dobleDeGanancias();
    puerto.historico.mockResolvedValue(fallo(creaError('sin-conexion')));

    expect((await monta(puerto).ejecuta(RANGO, 0, 20)).ok).toBe(false);
  });

  it('el reporte de administración y el reindexado llegan a su puerto', async () => {
    const puerto = {
      reporte: vi.fn().mockResolvedValue(exito([])),
      reindexa: vi.fn().mockResolvedValue(exito(12)),
    };
    TestBed.configureTestingModule({
      providers: [
        ConsultaReporteDeOperadores,
        ReindexaOperaciones,
        { provide: REPORTE_DE_OPERADORES_PORT, useValue: puerto },
      ],
    });

    await TestBed.inject(ConsultaReporteDeOperadores).ejecuta(RANGO);
    const reindexado = await TestBed.inject(ReindexaOperaciones).ejecuta();

    expect(puerto.reporte).toHaveBeenCalledWith(RANGO);
    expect(reindexado.ok && reindexado.valor).toBe(12);
  });
});
