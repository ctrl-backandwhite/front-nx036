/**
 * Un observador de visibilidad para el banco de pruebas.
 *
 * <p>`@defer (on viewport)` pregunta al navegador cuándo un elemento asoma en pantalla, y para eso usa
 * `IntersectionObserver`. El DOM simulado con el que corren las pruebas NO lo implementa: en cuanto una
 * pantalla difiere algo, montarla revienta con «IntersectionObserver is not defined» y el fallo aparece
 * como si el componente estuviera roto, no como lo que es —una pieza que le falta al entorno—.
 *
 * <p>Este doble dice que TODO está a la vista en cuanto se le pregunta, que es el estado que interesa
 * cuando la prueba quiere comprobar el contenido ya cargado. Va acompañado de
 * `DeferBlockBehavior.Playthrough`: uno dispara y el otro deja que el disparo ocurra de verdad.
 *
 * <p>Para lo contrario —comprobar que algo NO se ha cargado todavía— no se instala nada: sin este doble
 * y con el comportamiento por defecto del banco, los bloques diferidos se quedan en su hueco.
 *
 * <p>PROVISIONAL EN ESTA CARPETA. Su sitio es la preparación común de las pruebas (`src/test-setup.ts`),
 * porque desde que las normas exigen diferir lo que queda bajo el pliegue lo necesita cualquier área
 * que lo cumpla. No se toca ahí porque es un fichero compartido entre equipos.
 */
export function instalaObservadorDeVisibilidad(): void {
  // No se declara `implements IntersectionObserver`: la interfaz del navegador ha ido creciendo y
  // cumplirla entera obligaría a inventar miembros que este doble no usa. Lo que importa es que tenga
  // los tres métodos que Angular llama, y eso lo comprueba la conversión de abajo.
  class ObservadorQueVeTodo {
    readonly root: Element | null = null;
    readonly rootMargin = '0px';
    readonly thresholds: readonly number[] = [0];

    constructor(private readonly avisa: IntersectionObserverCallback) {}

    observe(objetivo: Element): void {
      // Se avisa en la siguiente microtarea, no en el acto: hacerlo dentro de `observe` deja a Angular
      // reaccionando a un cambio en mitad del render que lo provocó.
      queueMicrotask(() =>
        this.avisa(
          [{ isIntersecting: true, target: objetivo } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        ),
      );
    }

    unobserve(): void {
      // Nada que deshacer: este doble no guarda a quién observa.
    }

    disconnect(): void {
      // Igual que arriba.
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.IntersectionObserver = ObservadorQueVeTodo as unknown as typeof IntersectionObserver;
}
