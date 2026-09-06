import { InjectionToken, Signal } from '@angular/core';
import { LineaDeCarrito, ReferenciaDeLinea } from '../model/linea-de-carrito';
import { ProductoAnadible, ResultadoAlAnadir } from '../model/producto-anadible';

/**
 * La cesta vista desde FUERA del contexto: el contrato público de «cart».
 *
 * <p>Existe por la frontera entre la cesta y el pago. El pago necesita las líneas para componer el
 * pedido, ajustar cantidades cuando el destino no admite el importe, y vaciar la cesta cuando el cobro se
 * confirma. Lo que NO puede es entrar en las tripas de «cart»: sus casos de uso, su almacén y sus
 * adaptadores son privados, y el lint lo impide.
 *
 * <p>La salida es esta: un PUERTO en el dominio de «cart», que sí es contrato público. Se declara aquí
 * con lo mínimo —leer, ajustar, quitar y vaciar—, no la treintena de operaciones que la cesta hace por
 * dentro; y como es un puerto, «checkout» puede sustituirlo por un doble en sus pruebas sin montar el
 * contexto entero.
 *
 * <p>Quien lo implementa es «cart», en su capa de aplicación, y lo registra en `cart.providers.ts`.
 */
export interface CarritoCompartidoPort {
  /** Las líneas de la cesta, ya sin duplicados. Reactivo: cambia solo al tocar la cesta. */
  readonly lineas: Signal<readonly LineaDeCarrito[]>;

  /** Fija la cantidad de una línea. A cero, la línea desaparece. */
  cambiaCantidad(referencia: ReferenciaDeLinea, cantidad: number): void;

  quita(referencia: ReferenciaDeLinea): void;

  /**
   * Vacía la cesta. Se llama SOLO cuando el cobro está confirmado: al redirigir a la pasarela no, porque
   * volver atrás sin pagar dejaría a quien compra sin lo que había elegido.
   */
  vacia(): void;
}

export const CARRITO_COMPARTIDO_PORT = new InjectionToken<CarritoCompartidoPort>(
  'CarritoCompartidoPort',
);

/**
 * Meter cosas en la cesta desde fuera del contexto.
 *
 * <p>Capacidad SEPARADA de la anterior, y no un método más: quien añade —la tarjeta del catálogo, la
 * ficha, el asistente— no tiene por qué poder vaciar la cesta, y quien cobra no añade nada. Juntarlas en
 * un puerto obligaría a cualquier doble de prueba a fingir las dos.
 */
export interface AnadirAlCarritoPort {
  /** Cuántas unidades hay en total. Es lo que enseña la insignia del icono. */
  readonly unidades: Signal<number>;

  anade(producto: ProductoAnadible): Promise<ResultadoAlAnadir>;

  /** Abre el cajón lateral. Se usa tras añadir, para confirmar lo que acaba de pasar. */
  abreElCajon(): void;
}

export const ANADIR_AL_CARRITO_PORT = new InjectionToken<AnadirAlCarritoPort>('AnadirAlCarritoPort');
