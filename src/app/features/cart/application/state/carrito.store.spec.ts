import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL, AlmacenPort } from '@core/storage/almacen.port';
import { LineaDeCarrito } from '../../domain/model/linea-de-carrito';
import { CarritoStore } from './carrito.store';

class AlmacenDePrueba implements AlmacenPort {
  readonly datos = new Map<string, string>();
  lee(clave: string): string | null {
    return this.datos.get(clave) ?? null;
  }
  guarda(clave: string, valor: string): void {
    this.datos.set(clave, valor);
  }
  borra(clave: string): void {
    this.datos.delete(clave);
  }
}

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

function monta(almacen = new AlmacenDePrueba()) {
  TestBed.configureTestingModule({
    providers: [{ provide: ALMACEN_LOCAL, useValue: almacen }],
  });
  return { almacen, estado: TestBed.inject(CarritoStore) };
}

describe('CarritoStore', () => {
  it('añade fusionando y devuelve la línea ya consolidada', () => {
    const { estado } = monta();

    estado.anade(linea({ cantidad: 2 }));
    const consolidada = estado.anade(linea({ cantidad: 3 }));

    expect(estado.lineas()).toHaveLength(1);
    expect(consolidada?.cantidad).toBe(5);
    expect(estado.unidades()).toBe(5);
  });

  it('fijar la cantidad a cero borra la línea', () => {
    const { estado } = monta();
    estado.anade(linea({ cantidad: 3 }));

    estado.fijaCantidad({ productId: 'p1' }, 0);

    expect(estado.lineas()).toHaveLength(0);
    expect(estado.estaVacia()).toBe(true);
  });

  it('apartar saca de la cesta y mete en guardados', () => {
    const { estado } = monta();
    estado.anade(linea({ cantidad: 2 }));

    const apartada = estado.aparta({ productId: 'p1' });

    expect(apartada?.cantidad).toBe(2);
    expect(estado.lineas()).toHaveLength(0);
    expect(estado.cuantasGuardadas()).toBe(1);
  });

  it('apartar algo que ya no está no rompe nada', () => {
    const { estado } = monta();

    expect(estado.aparta({ productId: 'fantasma' })).toBeUndefined();
  });

  it('devolver a la cesta la quita de guardados', () => {
    const { estado } = monta();
    estado.anade(linea({ cantidad: 2 }));
    estado.aparta({ productId: 'p1' });

    const devuelta = estado.devuelveALaCesta({ productId: 'p1' });

    expect(devuelta?.cantidad).toBe(2);
    expect(estado.cuantasGuardadas()).toBe(0);
    expect(estado.lineas()).toHaveLength(1);
  });

  it('devolver algo que no estaba guardado no hace nada', () => {
    const { estado } = monta();

    expect(estado.devuelveALaCesta({ productId: 'p1' })).toBeUndefined();
  });

  it('la cesta que manda el servidor llega ya sin duplicados', () => {
    const { estado } = monta();

    estado.reemplaza([linea({ cantidad: 1 }), linea({ cantidad: 2 })]);

    expect(estado.lineas()).toHaveLength(1);
    expect(estado.lineas()[0].cantidad).toBe(3);
  });

  /**
   * La cesta de la CUENTA no se copia al equipo. Copiarla la volvía a subir a la fusión —que SUMA— al
   * reabrir el navegador, doblando cantidades, y la dejaba a la vista de quien entrara después.
   */
  it('con cesta de la cuenta no se guarda nada en el equipo', () => {
    const { almacen, estado } = monta();

    estado.adoptaLaDeLaCuenta([linea({ cantidad: 4 })]);

    expect(JSON.parse(almacen.lee('nx036-cart-v2') ?? '{}')).toEqual({
      lineas: [],
      guardadas: [],
    });
  });

  it('la cesta del invitado sí se copia, y se recupera al volver', () => {
    const almacen = new AlmacenDePrueba();
    monta(almacen).estado.anade(linea({ cantidad: 2 }));

    TestBed.resetTestingModule();
    const { estado } = monta(almacen);

    expect(estado.lineas()).toHaveLength(1);
    expect(estado.lineas()[0].cantidad).toBe(2);
  });

  it('al soltar la cesta de la cuenta la pantalla se queda vacía y vuelve el modo invitado', () => {
    const { estado } = monta();
    estado.adoptaLaDeLaCuenta([linea()]);

    estado.sueltaLaDeLaCuenta();

    expect(estado.cestaDeLaCuenta()).toBe(false);
    expect(estado.lineas()).toHaveLength(0);
  });

  /** Lo guardado lo escribe el navegador: una copia corrupta no puede tumbar el arranque. */
  it('una copia ilegible se descarta en vez de reventar', () => {
    const almacen = new AlmacenDePrueba();
    almacen.guarda('nx036-cart-v2', '{esto no es json');

    const { estado } = monta(almacen);

    expect(estado.lineas()).toHaveLength(0);
    expect(almacen.lee('nx036-cart-v2')).toBeNull();
  });

  it('una copia con forma inesperada tampoco rompe', () => {
    const almacen = new AlmacenDePrueba();
    almacen.guarda('nx036-cart-v2', '{"lineas":"no soy una lista"}');

    expect(monta(almacen).estado.lineas()).toHaveLength(0);
  });

  it('el cajón se abre y se cierra', () => {
    const { estado } = monta();

    estado.abreCajon();
    expect(estado.cajonAbierto()).toBe(true);

    estado.cierraCajon();
    expect(estado.cajonAbierto()).toBe(false);
  });

  it('eliminar y vaciar guardados', () => {
    const { estado } = monta();
    estado.fijaGuardadas([linea({ variantId: 'v1' }), linea({ variantId: 'v2' })]);

    estado.eliminaGuardada({ productId: 'p1', variantId: 'v1' });
    expect(estado.cuantasGuardadas()).toBe(1);

    estado.vaciaGuardadas();
    expect(estado.cuantasGuardadas()).toBe(0);
  });

  it('quitar y vaciar la cesta', () => {
    const { estado } = monta();
    estado.anade(linea({ variantId: 'v1' }));
    estado.anade(linea({ variantId: 'v2' }));

    estado.quita({ productId: 'p1', variantId: 'v1' });
    expect(estado.lineas()).toHaveLength(1);

    estado.vacia();
    expect(estado.lineas()).toHaveLength(0);
  });
});
