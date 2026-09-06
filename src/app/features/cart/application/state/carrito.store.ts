import { Service, computed, inject, signal } from '@angular/core';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import {
  LineaDeCarrito,
  ReferenciaDeLinea,
  deduplica,
  esLaMismaLinea,
  insertaOFusiona,
  sinLinea,
  unidadesTotales,
} from '../../domain/model/linea-de-carrito';

/**
 * La clave del almacenamiento lleva versión: las cestas creadas antes de congelar el precio guardaban un
 * unitario incoherente que hacía divergir la cesta del pago. Al cambiar la clave, ninguna de aquellas se
 * lee y toda cesta nace limpia.
 */
const CLAVE = 'nx036-cart-v2';

interface Guardado {
  readonly lineas: readonly LineaDeCarrito[];
  readonly guardadas: readonly LineaDeCarrito[];
}

/**
 * Lo que hay en la cesta y en «guardado para más tarde».
 *
 * <p>SOLO GUARDA. No llama al backend, no decide nada y no conoce ningún puerto: quien provoca efectos es
 * un caso de uso. Si este almacén hiciera además las llamadas, cualquier pantalla podría disparar
 * escrituras desde cualquier sitio y no habría un único lugar donde leer qué ocurre al tocar la cesta.
 *
 * <p>La copia en el equipo sí es cosa suya, porque es el MISMO estado escrito en otro sitio, no una
 * fuente distinta. Y se copia SOLO la cesta del invitado: la de la cuenta vive en el servidor. Copiarla
 * tuvo dos consecuencias reales — al volver a entrar se subía otra vez a la fusión, que SUMA, y las
 * cantidades se doblaban; y quedaba a la vista de quien abriera el navegador después.
 */
@Service()
export class CarritoStore {
  private readonly almacen = inject(ALMACEN_LOCAL);

  private readonly _lineas = signal<readonly LineaDeCarrito[]>([]);
  private readonly _guardadas = signal<readonly LineaDeCarrito[]>([]);
  /**
   * Cierto cuando lo que se ve es la cesta DE LA CUENTA, ya confirmada por el servidor. Mientras sea
   * falso la cesta funciona como siempre —solo en este equipo— y es lo que decide si cada cambio viaja.
   */
  private readonly _cestaDeLaCuenta = signal(false);
  private readonly _cajonAbierto = signal(false);

  readonly lineas = this._lineas.asReadonly();
  readonly guardadas = this._guardadas.asReadonly();
  readonly cestaDeLaCuenta = this._cestaDeLaCuenta.asReadonly();
  readonly cajonAbierto = this._cajonAbierto.asReadonly();

  readonly unidades = computed(() => unidadesTotales(this._lineas()));
  readonly cuantasGuardadas = computed(() => this._guardadas().length);
  readonly estaVacia = computed(() => this._lineas().length === 0);

  constructor() {
    this.hidrata();
  }

  // ── Cajón lateral ────────────────────────────────────────────────────────────────────────────
  abreCajon(): void {
    this._cajonAbierto.set(true);
  }

  cierraCajon(): void {
    this._cajonAbierto.set(false);
  }

  // ── Cesta ────────────────────────────────────────────────────────────────────────────────────
  /** Mete la línea fusionándola con la que ya hubiera de la misma variante. Devuelve la ya consolidada. */
  anade(linea: LineaDeCarrito): LineaDeCarrito | undefined {
    const lineas = insertaOFusiona(this._lineas(), linea);
    this.fijaLineas(lineas);
    return lineas.find((l) => esLaMismaLinea(l, linea));
  }

  /** Fija la cantidad de una línea. A cero o menos, la línea desaparece. */
  fijaCantidad(referencia: ReferenciaDeLinea, cantidad: number): void {
    this.fijaLineas(
      this._lineas()
        .map((linea) =>
          esLaMismaLinea(linea, referencia) ? { ...linea, cantidad: Math.max(0, cantidad) } : linea,
        )
        .filter((linea) => linea.cantidad > 0),
    );
  }

  quita(referencia: ReferenciaDeLinea): void {
    this.fijaLineas(sinLinea(this._lineas(), referencia));
  }

  vacia(): void {
    this.fijaLineas([]);
  }

  /** Sustituye la cesta por la que manda el servidor. Es la fuente de verdad tras cada escritura. */
  reemplaza(lineas: readonly LineaDeCarrito[]): void {
    this.fijaLineas(deduplica([...lineas]));
  }

  /** Adopta la cesta de la cuenta: a partir de aquí cada cambio viaja al backend. */
  adoptaLaDeLaCuenta(lineas: readonly LineaDeCarrito[]): void {
    this._cestaDeLaCuenta.set(true);
    this.fijaLineas(deduplica([...lineas]));
  }

  /** Al cerrar sesión la cesta de la cuenta desaparece de la pantalla y se vuelve al modo invitado. */
  sueltaLaDeLaCuenta(): void {
    this._cestaDeLaCuenta.set(false);
    this.fijaLineas([]);
  }

  // ── Guardado para más tarde ──────────────────────────────────────────────────────────────────
  /** Aparta una línea de la cesta. Devuelve la línea apartada, o nada si ya no estaba. */
  aparta(referencia: ReferenciaDeLinea): LineaDeCarrito | undefined {
    const linea = this._lineas().find((l) => esLaMismaLinea(l, referencia));
    if (!linea) {
      return undefined;
    }
    this._guardadas.set(insertaOFusiona(this._guardadas(), linea));
    this.fijaLineas(sinLinea(this._lineas(), referencia));
    return linea;
  }

  /** Devuelve una línea guardada a la cesta. Devuelve la línea ya consolidada en la cesta. */
  devuelveALaCesta(referencia: ReferenciaDeLinea): LineaDeCarrito | undefined {
    const guardada = this._guardadas().find((l) => esLaMismaLinea(l, referencia));
    if (!guardada) {
      return undefined;
    }
    const lineas = insertaOFusiona(this._lineas(), guardada);
    this._guardadas.set(sinLinea(this._guardadas(), referencia));
    this.fijaLineas(lineas);
    return lineas.find((l) => esLaMismaLinea(l, guardada));
  }

  eliminaGuardada(referencia: ReferenciaDeLinea): void {
    this._guardadas.set(sinLinea(this._guardadas(), referencia));
    this.persiste();
  }

  fijaGuardadas(lineas: readonly LineaDeCarrito[]): void {
    this._guardadas.set(deduplica([...lineas]));
    this.persiste();
  }

  vaciaGuardadas(): void {
    this._guardadas.set([]);
    this.persiste();
  }

  // ── Copia en el equipo ───────────────────────────────────────────────────────────────────────
  private fijaLineas(lineas: readonly LineaDeCarrito[]): void {
    this._lineas.set(lineas);
    this.persiste();
  }

  /**
   * Con sesión abierta NO se copia nada: la cesta de la cuenta es del servidor. Se escribe el objeto
   * vacío en vez de borrar la clave para que la próxima lectura no encuentre una copia rancia de antes
   * de entrar.
   */
  private persiste(): void {
    const contenido: Guardado = this._cestaDeLaCuenta()
      ? { lineas: [], guardadas: [] }
      : { lineas: this._lineas(), guardadas: this._guardadas() };
    this.almacen.guarda(CLAVE, JSON.stringify(contenido));
  }

  /**
   * Lo guardado puede estar corrupto —lo escribe el navegador y lo edita cualquiera—, así que se lee
   * dentro de un `try` y con la forma comprobada. Una cesta ilegible se descarta; tumbar el arranque de
   * la aplicación por una copia rota sería mucho peor que empezar con la cesta vacía.
   */
  private hidrata(): void {
    const crudo = this.almacen.lee(CLAVE);
    if (!crudo) {
      return;
    }
    try {
      const guardado = JSON.parse(crudo) as Partial<Guardado>;
      this._lineas.set(deduplica(Array.isArray(guardado.lineas) ? guardado.lineas : []));
      this._guardadas.set(deduplica(Array.isArray(guardado.guardadas) ? guardado.guardadas : []));
    } catch {
      this.almacen.borra(CLAVE);
    }
  }
}
