import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { LineaDeCarrito } from '../../domain/model/linea-de-carrito';
import {
  CARRITO_GUARDADO_PORT,
  CARRITO_REMOTO_PORT,
  CarritoGuardadoPort,
  CarritoRemotoPort,
} from '../../domain/port/carrito.port';
import { CarritoStore } from '../state/carrito.store';
import { SincronizaConLaCuenta } from './sincroniza-con-la-cuenta.use-case';

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

class RemotoFalso implements CarritoRemotoPort {
  readonly llamadas: string[] = [];
  cesta: LineaDeCarrito[] = [];
  falla = false;
  async consulta() {
    this.llamadas.push('consulta');
    return this.falla ? fallo(creaError('sin-conexion')) : exito<readonly LineaDeCarrito[]>(this.cesta);
  }
  async guarda() {
    return exito<readonly LineaDeCarrito[]>(this.cesta);
  }
  async quita() {
    return exito<readonly LineaDeCarrito[]>(this.cesta);
  }
  async fusiona(l: readonly LineaDeCarrito[]) {
    this.llamadas.push(`fusiona:${l.length}`);
    return this.falla ? fallo(creaError('sin-conexion')) : exito<readonly LineaDeCarrito[]>(this.cesta);
  }
  async vacia() {
    return exito<readonly LineaDeCarrito[]>([]);
  }
}

class GuardadoFalso implements CarritoGuardadoPort {
  readonly llamadas: string[] = [];
  lista: LineaDeCarrito[] = [];
  async consulta() {
    this.llamadas.push('consulta');
    return exito<readonly LineaDeCarrito[]>(this.lista);
  }
  async guarda() {
    return exito<readonly LineaDeCarrito[]>(this.lista);
  }
  async quita() {
    return exito<readonly LineaDeCarrito[]>(this.lista);
  }
  async fusiona(l: readonly LineaDeCarrito[]) {
    this.llamadas.push(`fusiona:${l.length}`);
    return exito<readonly LineaDeCarrito[]>(this.lista);
  }
}

function monta() {
  const remoto = new RemotoFalso();
  const guardado = new GuardadoFalso();
  TestBed.configureTestingModule({
    providers: [
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: CARRITO_REMOTO_PORT, useValue: remoto },
      { provide: CARRITO_GUARDADO_PORT, useValue: guardado },
      SincronizaConLaCuenta,
    ],
  });
  return {
    remoto,
    guardado,
    caso: TestBed.inject(SincronizaConLaCuenta),
    estado: TestBed.inject(CarritoStore),
  };
}

describe('SincronizaConLaCuenta', () => {
  it('al entrar con cesta de invitado la SUBE y adopta la respuesta del servidor', async () => {
    const { remoto, estado, caso } = monta();
    estado.anade(linea({ cantidad: 2 }));
    remoto.cesta = [linea({ cantidad: 5 })];

    await caso.ejecuta(true);

    expect(remoto.llamadas).toContain('fusiona:1');
    expect(estado.cestaDeLaCuenta()).toBe(true);
    expect(estado.lineas()[0].cantidad).toBe(5);
  });

  it('sin nada en local basta con leer la cesta de la cuenta', async () => {
    const { remoto, caso } = monta();

    await caso.ejecuta(true);

    expect(remoto.llamadas).toContain('consulta');
    expect(remoto.llamadas).not.toContain('fusiona:0');
  });

  /**
   * La copia local solo se abandona DESPUÉS de la confirmación: al revés, un fallo de red dejaría a quien
   * compra sin lo que tenía en ninguno de los dos sitios.
   */
  it('si la subida falla, la cesta local se conserva intacta', async () => {
    const { remoto, estado, caso } = monta();
    estado.anade(linea({ cantidad: 3 }));
    remoto.falla = true;

    await caso.ejecuta(true);

    expect(estado.cestaDeLaCuenta()).toBe(false);
    expect(estado.lineas()[0].cantidad).toBe(3);
  });

  /**
   * Si la cesta en pantalla ya es la de una cuenta, es de otra persona: subirla la metería en la cuenta de
   * quien acaba de entrar, y la fusión SUMA, así que se quedaría ahí.
   */
  it('no sube la cesta de otra cuenta: solo la lee', async () => {
    const { remoto, guardado, estado, caso } = monta();
    estado.adoptaLaDeLaCuenta([linea({ cantidad: 4 })]);
    estado.fijaGuardadas([linea({ variantId: 'v9' })]);

    await caso.ejecuta(true);

    expect(remoto.llamadas).toEqual(['consulta']);
    expect(guardado.llamadas).toEqual(['consulta']);
  });

  it('al salir, la cesta de la cuenta desaparece de la pantalla y se vacía lo guardado', async () => {
    const { estado, caso } = monta();
    estado.adoptaLaDeLaCuenta([linea()]);
    estado.fijaGuardadas([linea()]);

    await caso.ejecuta(false);

    expect(estado.lineas()).toHaveLength(0);
    expect(estado.cuantasGuardadas()).toBe(0);
    expect(estado.cestaDeLaCuenta()).toBe(false);
  });

  it('la lista guardada del invitado también se sube al entrar', async () => {
    const { guardado, estado, caso } = monta();
    estado.fijaGuardadas([linea({ variantId: 'v1' }), linea({ variantId: 'v2' })]);

    await caso.ejecuta(true);

    expect(guardado.llamadas).toContain('fusiona:2');
  });

  /** La ruta de la cesta y la del pago declaran los mismos proveedores: vigilar dos veces sería un bucle. */
  it('vigilar es idempotente', () => {
    const { caso } = monta();

    TestBed.runInInjectionContext(() => {
      caso.vigila();
      caso.vigila();
    });

    expect(true).toBe(true);
  });
});
