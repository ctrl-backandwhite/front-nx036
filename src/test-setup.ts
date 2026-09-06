import '@testing-library/jest-dom/vitest';

/**
 * Preparación común de las pruebas.
 *
 * <p>`jest-dom` añade las comprobaciones que se leen como una frase (`toBeVisible`, `toHaveTextContent`)
 * en vez de obligar a comparar propiedades del DOM a mano.
 */

/**
 * Doble de `IntersectionObserver`.
 *
 * <p>El DOM simulado que usan las pruebas no lo trae, y sin él **cualquier componente con un bloque
 * `@defer (on viewport)` revienta al montarse**: no falla la comprobación, falla el montaje, con un
 * error que no menciona el diferido por ninguna parte. Como la norma de rendimiento del proyecto pide
 * diferir todo lo que queda bajo el pliegue, esto afecta a casi cada pantalla, y por eso vive aquí y no
 * repetido en cada fichero de prueba.
 *
 * <p>El doble avisa INMEDIATAMENTE de que lo observado está a la vista. Es la decisión correcta para una
 * prueba: lo que se quiere comprobar es qué se pinta cuando el bloque llega, no la mecánica del
 * navegador para decidir cuándo llega. Quien necesite comprobar el estado ANTES de que aparezca puede
 * sustituirlo en su propio fichero.
 */
class ObservadorDeVisibilidadFalso implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: readonly number[] = [0];

  constructor(private readonly avisa: IntersectionObserverCallback) {}

  observe(objetivo: Element): void {
    this.avisa(
      [
        {
          isIntersecting: true,
          intersectionRatio: 1,
          target: objetivo,
          time: 0,
          boundingClientRect: objetivo.getBoundingClientRect(),
          intersectionRect: objetivo.getBoundingClientRect(),
          rootBounds: null,
        } as IntersectionObserverEntry,
      ],
      this,
    );
  }

  unobserve(): void {
    /* No hay nada que dejar de observar: el doble avisa una vez y termina. */
  }

  disconnect(): void {
    /* Igual que arriba. */
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = ObservadorDeVisibilidadFalso as unknown as typeof IntersectionObserver;
}

/**
 * Doble de `matchMedia`, por el mismo motivo: el DOM simulado no lo trae y lo consultan las piezas que
 * respetan «reducir el movimiento», que en este proyecto son todas las que animan.
 */
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = ((consulta: string) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.matchMedia;
}
