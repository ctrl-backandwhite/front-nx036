import { Injectable, Signal, inject } from '@angular/core';
import { LineaDeCarrito, ReferenciaDeLinea } from '../../domain/model/linea-de-carrito';
import { ProductoAnadible, ResultadoAlAnadir } from '../../domain/model/producto-anadible';
import {
  AnadirAlCarritoPort,
  CarritoCompartidoPort,
} from '../../domain/port/carrito-compartido.port';
import { CarritoStore } from './carrito.store';
import { AnadeAlCarrito } from '../use-case/anade-al-carrito.use-case';
import { CambiaLaCantidad } from '../use-case/cambia-la-cantidad.use-case';
import { QuitaDelCarrito } from '../use-case/quita-del-carrito.use-case';
import { VaciaElCarrito } from '../use-case/vacia-el-carrito.use-case';

/**
 * Lo que «cart» le enseña al resto del mundo.
 *
 * <p>Implementa el puerto público del contexto delegando en sus casos de uso, de modo que el pago obtiene
 * exactamente el mismo comportamiento que la propia cesta —cola de escrituras, reparación ante fallo,
 * copia en el equipo— sin conocer nada de eso.
 *
 * <p>Vive en `application` y no en `infrastructure` a propósito: no traduce contra ningún sistema
 * externo, ORQUESTA el estado y los casos de uso del propio contexto. Un adaptador de infraestructura no
 * puede siquiera ver esta capa, y con razón.
 */
@Injectable()
export class CarritoCompartido implements CarritoCompartidoPort, AnadirAlCarritoPort {
  private readonly estado = inject(CarritoStore);
  private readonly anadeUso = inject(AnadeAlCarrito);
  private readonly cambiaCantidadUso = inject(CambiaLaCantidad);
  private readonly quitaUso = inject(QuitaDelCarrito);
  private readonly vaciaUso = inject(VaciaElCarrito);

  readonly lineas: Signal<readonly LineaDeCarrito[]> = this.estado.lineas;
  readonly unidades: Signal<number> = this.estado.unidades;

  anade(producto: ProductoAnadible): Promise<ResultadoAlAnadir> {
    return this.anadeUso.ejecuta(producto);
  }

  abreElCajon(): void {
    this.estado.abreCajon();
  }

  cambiaCantidad(referencia: ReferenciaDeLinea, cantidad: number): void {
    void this.cambiaCantidadUso.ejecuta(referencia, cantidad);
  }

  quita(referencia: ReferenciaDeLinea): void {
    void this.quitaUso.ejecuta(referencia);
  }

  vacia(): void {
    void this.vaciaUso.ejecuta();
  }
}
