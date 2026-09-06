import { Injectable, Signal, inject, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { LineaDeCarrito, ReferenciaDeLinea } from '../domain/model/linea-de-carrito';
import {
  lineasDelProducto,
  puedeBajarUnaUnidad,
  puedeSacarLaLinea,
} from '../domain/model/pedido-minimo';
import { CarritoStore } from '../application/state/carrito.store';
import { CambiaLaCantidad } from '../application/use-case/cambia-la-cantidad.use-case';
import { QuitaDelCarrito } from '../application/use-case/quita-del-carrito.use-case';
import { ApartaParaMasTarde } from '../application/use-case/aparta-para-mas-tarde.use-case';
import { DevuelveAlCarrito } from '../application/use-case/devuelve-al-carrito.use-case';
import { EliminaLoGuardado } from '../application/use-case/elimina-lo-guardado.use-case';

/** Sacar una línea puede ser quitarla o apartarla; el aviso tiene que ofrecer la misma que se pidió. */
export type ModoDeSacar = 'quitar' | 'apartar';

/**
 * Lo que hay que enseñar cuando el pedido mínimo impide la acción.
 *
 * <p>Guarda el PRODUCTO y la acción pendiente, no una función: al aceptar la salida se vuelven a leer las
 * líneas de ese momento, que pueden haber cambiado desde que se pintó el aviso.
 */
export interface AvisoDeMinimo {
  readonly texto: string;
  readonly productId?: string;
  readonly modo?: ModoDeSacar;
}

/**
 * Las acciones sobre una línea de la cesta, con su aviso de pedido mínimo.
 *
 * <p>Existe porque la página de la cesta y el cajón lateral hacen exactamente lo mismo con las líneas, y
 * en el front anterior estaban copiadas: cuarenta líneas idénticas en dos ficheros que había que corregir
 * a la vez. Aquí se escriben una vez.
 *
 * <p>NO va en la raíz: cada pantalla que lo declare en sus `providers` tiene su propio aviso. Compartirlo
 * haría que cerrar el aviso del cajón borrase el de la página que hay detrás.
 *
 * <p>Decidir si se puede o no es del DOMINIO (`pedido-minimo.ts`); aquí solo se traduce esa decisión a un
 * texto y se guarda qué salida ofrecer.
 */
@Injectable()
export class AccionesDeLinea {
  private readonly estado = inject(CarritoStore);
  private readonly cambiaLaCantidad = inject(CambiaLaCantidad);
  private readonly quitaDelCarrito = inject(QuitaDelCarrito);
  private readonly apartaParaMasTarde = inject(ApartaParaMasTarde);
  private readonly devuelveAlCarrito = inject(DevuelveAlCarrito);
  private readonly eliminaLoGuardado = inject(EliminaLoGuardado);
  private readonly traduccion = inject(TraduccionService);

  private readonly _aviso = signal<AvisoDeMinimo | null>(null);
  readonly aviso: Signal<AvisoDeMinimo | null> = this._aviso.asReadonly();

  /** Baja una unidad. Dejar el producto por debajo de su mínimo —sin llegar a cero— no se aplica: se explica. */
  bajaUna(linea: LineaDeCarrito): void {
    const veredicto = puedeBajarUnaUnidad(this.estado.lineas(), linea);
    if (!veredicto.permitido) {
      this._aviso.set({
        texto: this.traduccion.tCon('cart.moq.cannot_reduce', { moq: veredicto.minimo }),
      });
      return;
    }
    this._aviso.set(null);
    void this.cambiaLaCantidad.ejecuta(linea, linea.cantidad - 1);
  }

  subeUna(linea: LineaDeCarrito): void {
    this._aviso.set(null);
    void this.cambiaLaCantidad.ejecuta(linea, linea.cantidad + 1);
  }

  /**
   * Saca la línea de la cesta, quitándola o apartándola. Si el producto quedara por debajo del mínimo SIN
   * llegar a cero, avisa y ofrece hacerlo con el producto entero: quitarlo del todo siempre es válido, y
   * sin esa salida un producto con dos líneas quedaría atrapado en la cesta.
   */
  saca(linea: LineaDeCarrito, modo: ModoDeSacar): void {
    const veredicto = puedeSacarLaLinea(this.estado.lineas(), linea);
    if (!veredicto.permitido) {
      this._aviso.set({
        texto: this.traduccion.tCon('cart.moq.remove_rest', { moq: veredicto.minimo }),
        productId: linea.productId,
        modo,
      });
      return;
    }
    this._aviso.set(null);
    this.aplica(linea, modo);
  }

  /** La salida del aviso: aplica la acción a TODAS las líneas del producto, que sí es una cesta válida. */
  sacaElProductoEntero(): void {
    const aviso = this._aviso();
    if (!aviso?.productId) {
      return;
    }
    for (const linea of lineasDelProducto(this.estado.lineas(), aviso.productId)) {
      this.aplica(linea, aviso.modo ?? 'quitar');
    }
    this._aviso.set(null);
  }

  descartaElAviso(): void {
    this._aviso.set(null);
  }

  devuelveALaCesta(referencia: ReferenciaDeLinea): void {
    void this.devuelveAlCarrito.ejecuta(referencia);
  }

  eliminaGuardada(referencia: ReferenciaDeLinea): void {
    void this.eliminaLoGuardado.ejecuta(referencia);
  }

  private aplica(linea: LineaDeCarrito, modo: ModoDeSacar): void {
    if (modo === 'quitar') {
      void this.quitaDelCarrito.ejecuta(linea);
    } else {
      void this.apartaParaMasTarde.ejecuta(linea);
    }
  }
}
