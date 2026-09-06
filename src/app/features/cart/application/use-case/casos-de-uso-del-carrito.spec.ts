import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { LineaDeCarrito, ReferenciaDeLinea } from '../../domain/model/linea-de-carrito';
import {
  CARRITO_GUARDADO_PORT,
  CARRITO_REMOTO_PORT,
  CarritoGuardadoPort,
  CarritoRemotoPort,
} from '../../domain/port/carrito.port';
import { CarritoStore } from '../state/carrito.store';
import { SincronizadorDelCarrito } from '../state/sincronizador-del-carrito';
import { CambiaLaCantidad } from './cambia-la-cantidad.use-case';
import { QuitaDelCarrito } from './quita-del-carrito.use-case';
import { VaciaElCarrito } from './vacia-el-carrito.use-case';
import { ApartaParaMasTarde } from './aparta-para-mas-tarde.use-case';
import { DevuelveAlCarrito } from './devuelve-al-carrito.use-case';
import { EliminaLoGuardado } from './elimina-lo-guardado.use-case';

function linea(parcial: Partial<LineaDeCarrito> = {}): LineaDeCarrito {
  return {
    productId: 'p1',
    slug: 'gorro',
    titulo: 'Gorro',
    precioUnitarioOrigen: 10,
    divisaDeOrigen: 'CNY',
    cantidad: 1,
    ...parcial,
  };
}

/** Un doble del backend de la cesta: apunta lo que se le pide y devuelve lo que se le programe. */
class CarritoFalso implements CarritoRemotoPort {
  cesta: LineaDeCarrito[] = [];
  readonly llamadas: string[] = [];
  falla = false;
  fallaTambienAlReleer = false;

  private responde(): Result<readonly LineaDeCarrito[], AppError> {
    return this.falla ? fallo(creaError('sin-conexion')) : exito(this.cesta);
  }

  async consulta(): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    this.llamadas.push('consulta');
    return this.fallaTambienAlReleer ? fallo(creaError('sin-conexion')) : exito(this.cesta);
  }
  async guarda(l: LineaDeCarrito): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    this.llamadas.push(`guarda:${l.productId}:${l.cantidad}`);
    return this.responde();
  }
  async quita(r: ReferenciaDeLinea): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    this.llamadas.push(`quita:${r.productId}:${r.variantId ?? ''}`);
    return this.responde();
  }
  async fusiona(l: readonly LineaDeCarrito[]): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    this.llamadas.push(`fusiona:${l.length}`);
    return this.responde();
  }
  async vacia(): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    this.llamadas.push('vacia');
    return this.responde();
  }
}

class GuardadoFalso implements CarritoGuardadoPort {
  lista: LineaDeCarrito[] = [];
  readonly llamadas: string[] = [];
  async consulta() {
    this.llamadas.push('consulta');
    return exito<readonly LineaDeCarrito[]>(this.lista);
  }
  async guarda(l: LineaDeCarrito) {
    this.llamadas.push(`guarda:${l.productId}`);
    this.lista = [l];
    return exito<readonly LineaDeCarrito[]>(this.lista);
  }
  async quita(r: ReferenciaDeLinea) {
    this.llamadas.push(`quita:${r.productId}`);
    this.lista = [];
    return exito<readonly LineaDeCarrito[]>(this.lista);
  }
  async fusiona(l: readonly LineaDeCarrito[]) {
    this.llamadas.push(`fusiona:${l.length}`);
    return exito<readonly LineaDeCarrito[]>(this.lista);
  }
}

function monta() {
  const remoto = new CarritoFalso();
  const guardado = new GuardadoFalso();
  TestBed.configureTestingModule({
    providers: [
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: CARRITO_REMOTO_PORT, useValue: remoto },
      { provide: CARRITO_GUARDADO_PORT, useValue: guardado },
      SincronizadorDelCarrito,
      CambiaLaCantidad,
      QuitaDelCarrito,
      VaciaElCarrito,
      ApartaParaMasTarde,
      DevuelveAlCarrito,
      EliminaLoGuardado,
    ],
  });
  return { remoto, guardado, estado: TestBed.inject(CarritoStore) };
}

describe('sin sesión, la cesta no viaja', () => {
  it('cambiar la cantidad no llama al backend', async () => {
    const { remoto, estado } = monta();
    estado.anade(linea({ cantidad: 2 }));

    await TestBed.inject(CambiaLaCantidad).ejecuta({ productId: 'p1' }, 5);

    expect(estado.lineas()[0].cantidad).toBe(5);
    expect(remoto.llamadas).toHaveLength(0);
  });
});

describe('con la cesta de la cuenta', () => {
  it('cambiar la cantidad la fija en el servidor y adopta su respuesta', async () => {
    const { remoto, estado } = monta();
    estado.adoptaLaDeLaCuenta([linea({ cantidad: 2 })]);
    remoto.cesta = [linea({ cantidad: 5 })];

    await TestBed.inject(CambiaLaCantidad).ejecuta({ productId: 'p1' }, 5);

    expect(remoto.llamadas).toEqual(['guarda:p1:5']);
    expect(estado.lineas()[0].cantidad).toBe(5);
  });

  /** El backend no acepta cantidad cero: su mínimo es uno, y mandarle un cero devolvía un rechazo. */
  it('bajar a cero se manda como borrado, no como cantidad cero', async () => {
    const { remoto, estado } = monta();
    estado.adoptaLaDeLaCuenta([linea({ cantidad: 1, variantId: 'v1' })]);

    await TestBed.inject(CambiaLaCantidad).ejecuta({ productId: 'p1', variantId: 'v1' }, 0);

    expect(remoto.llamadas).toEqual(['quita:p1:v1']);
  });

  it('cambiar la cantidad de una línea que ya no está no escribe nada', async () => {
    const { remoto, estado } = monta();
    estado.adoptaLaDeLaCuenta([]);

    await TestBed.inject(CambiaLaCantidad).ejecuta({ productId: 'fantasma' }, 3);

    expect(remoto.llamadas).toHaveLength(0);
  });

  it('la variante vacía viaja como ausencia del campo', async () => {
    const { remoto, estado } = monta();
    estado.adoptaLaDeLaCuenta([linea({ variantId: '' })]);

    await TestBed.inject(QuitaDelCarrito).ejecuta({ productId: 'p1', variantId: '' });

    expect(remoto.llamadas).toEqual(['quita:p1:']);
  });

  it('vaciar la cesta se propaga', async () => {
    const { remoto, estado } = monta();
    estado.adoptaLaDeLaCuenta([linea()]);

    await TestBed.inject(VaciaElCarrito).ejecuta();

    expect(remoto.llamadas).toEqual(['vacia']);
    expect(estado.lineas()).toHaveLength(0);
  });
});

describe('cuando la escritura falla', () => {
  /**
   * Quitar de la cesta lo que se ve confirmado sería contradecir en pantalla lo que se acaba de anunciar,
   * y el pedido se envía con estas líneas: conservarlas es lo que permite terminar la compra.
   */
  it('relee la cesta del servidor y repara lo que la operación había prometido', async () => {
    const { remoto, guardado, estado } = monta();
    estado.adoptaLaDeLaCuenta([linea({ cantidad: 2 })]);
    guardado.lista = [linea({ cantidad: 2 })];
    estado.fijaGuardadas(guardado.lista);
    estado.aparta({ productId: 'p1' });
    // El servidor sigue devolviendo la línea: si no se descartara, quedaría a la vez en cesta y guardados.
    remoto.falla = true;
    remoto.cesta = [linea({ cantidad: 2 })];

    await TestBed.inject(ApartaParaMasTarde).ejecuta({ productId: 'p1' });

    expect(estado.lineas()).toHaveLength(0);
  });

  it('sin red tampoco para releer, vuelve a la foto previa', async () => {
    const { remoto, estado } = monta();
    estado.adoptaLaDeLaCuenta([linea({ cantidad: 2 })]);
    remoto.falla = true;
    remoto.fallaTambienAlReleer = true;

    await TestBed.inject(CambiaLaCantidad).ejecuta({ productId: 'p1' }, 7);

    expect(estado.lineas()[0].cantidad).toBe(2);
  });

  /** Si la escritura sí llegó y solo se perdió la respuesta, la línea ya viene: duplicarla doblaría el pedido. */
  it('al devolver a la cesta se ASEGURA la línea sin duplicarla', async () => {
    const { remoto, estado } = monta();
    estado.adoptaLaDeLaCuenta([]);
    estado.fijaGuardadas([linea({ cantidad: 3 })]);
    remoto.falla = true;
    remoto.cesta = [];

    await TestBed.inject(DevuelveAlCarrito).ejecuta({ productId: 'p1' });

    expect(estado.lineas()).toHaveLength(1);
    expect(estado.lineas()[0].cantidad).toBe(3);
  });
});

describe('guardado para más tarde', () => {
  it('apartar borra la línea de la cesta del servidor y la sube a guardados', async () => {
    const { remoto, guardado, estado } = monta();
    estado.adoptaLaDeLaCuenta([linea({ cantidad: 2 })]);

    await TestBed.inject(ApartaParaMasTarde).ejecuta({ productId: 'p1' });

    expect(remoto.llamadas).toContain('quita:p1:');
    expect(guardado.llamadas).toContain('guarda:p1');
    expect(estado.cuantasGuardadas()).toBe(1);
  });

  it('apartar una línea que ya no está no escribe nada', async () => {
    const { remoto, guardado, estado } = monta();
    estado.adoptaLaDeLaCuenta([]);

    await TestBed.inject(ApartaParaMasTarde).ejecuta({ productId: 'fantasma' });

    expect(remoto.llamadas).toHaveLength(0);
    expect(guardado.llamadas).toHaveLength(0);
  });

  it('devolver a la cesta la quita también de la lista guardada del servidor', async () => {
    const { remoto, guardado, estado } = monta();
    estado.adoptaLaDeLaCuenta([]);
    estado.fijaGuardadas([linea({ cantidad: 2 })]);
    // El servidor devuelve la cesta ya con la línea devuelta: es la fuente de verdad tras la escritura.
    remoto.cesta = [linea({ cantidad: 2 })];

    await TestBed.inject(DevuelveAlCarrito).ejecuta({ productId: 'p1' });

    expect(guardado.llamadas).toContain('quita:p1');
    expect(estado.lineas()).toHaveLength(1);
  });

  it('eliminar definitivamente no devuelve nada a la cesta', async () => {
    const { guardado, estado } = monta();
    estado.adoptaLaDeLaCuenta([]);
    estado.fijaGuardadas([linea()]);

    await TestBed.inject(EliminaLoGuardado).ejecuta({ productId: 'p1' });

    expect(estado.cuantasGuardadas()).toBe(0);
    expect(estado.lineas()).toHaveLength(0);
    expect(guardado.llamadas).toContain('quita:p1');
  });

  it('sin sesión, eliminar lo guardado se queda en este equipo', async () => {
    const { guardado, estado } = monta();
    estado.fijaGuardadas([linea()]);

    await TestBed.inject(EliminaLoGuardado).ejecuta({ productId: 'p1' });

    expect(guardado.llamadas).toHaveLength(0);
    expect(estado.cuantasGuardadas()).toBe(0);
  });

  it('devolver algo que no estaba guardado no escribe nada', async () => {
    const { guardado, estado } = monta();
    estado.adoptaLaDeLaCuenta([]);

    await TestBed.inject(DevuelveAlCarrito).ejecuta({ productId: 'fantasma' });

    expect(guardado.llamadas).toHaveLength(0);
  });
});

/**
 * Sin cola, tres pulsaciones seguidas en «+» lanzarían tres escrituras en paralelo y la última respuesta
 * en llegar —que puede ser la de una cantidad intermedia— dejaría en pantalla un número que ya nadie pidió.
 */
describe('la cola de escrituras', () => {
  it('manda las operaciones EN ORDEN', async () => {
    const { remoto, estado } = monta();
    estado.adoptaLaDeLaCuenta([linea({ cantidad: 1 })]);
    const caso = TestBed.inject(CambiaLaCantidad);

    await Promise.all([
      caso.ejecuta({ productId: 'p1' }, 2),
      caso.ejecuta({ productId: 'p1' }, 3),
      caso.ejecuta({ productId: 'p1' }, 4),
    ]);

    expect(remoto.llamadas).toEqual(['guarda:p1:2', 'guarda:p1:3', 'guarda:p1:4']);
  });

  /** Entre la petición y su respuesta puede haberse cerrado la sesión: la cesta no puede reaparecer. */
  it('si la sesión se cierra a mitad, la respuesta no se aplica', async () => {
    const { remoto, estado } = monta();
    estado.adoptaLaDeLaCuenta([linea({ cantidad: 1 })]);
    remoto.cesta = [linea({ cantidad: 9 })];

    const encurso = TestBed.inject(CambiaLaCantidad).ejecuta({ productId: 'p1' }, 2);
    estado.sueltaLaDeLaCuenta();
    await encurso;

    expect(estado.lineas()).toHaveLength(0);
  });
});
