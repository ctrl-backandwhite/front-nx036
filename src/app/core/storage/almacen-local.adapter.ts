import { Injectable } from '@angular/core';
import { AlmacenPort } from './almacen.port';
import { esNavegador } from '../platform/plataforma';

/**
 * El almacenamiento del navegador, envuelto para que no pueda tumbar nada.
 *
 * <p>Cada acceso va dentro de un `try`: en modo privado, o con el almacenamiento bloqueado en los
 * ajustes, tanto leer como escribir LANZAN. Y al prerenderizar no existe siquiera.
 *
 * <p>No lleva `providedIn: 'root'`: se registra en la raíz de composición, que es donde se decide qué
 * implementación entra. Una prueba pone la suya sin tocar el navegador simulado.
 */
@Injectable()
export class AlmacenLocalAdapter implements AlmacenPort {
  private readonly disponible = esNavegador();

  lee(clave: string): string | null {
    if (!this.disponible) {
      return null;
    }
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  guarda(clave: string, valor: string): void {
    if (!this.disponible) {
      return;
    }
    try {
      localStorage.setItem(clave, valor);
    } catch {
      /* Almacenamiento bloqueado: el valor vive solo en memoria durante esta sesión. */
    }
  }

  borra(clave: string): void {
    if (!this.disponible) {
      return;
    }
    try {
      localStorage.removeItem(clave);
    } catch {
      /* Nada que hacer: si no se puede escribir, tampoco se puede borrar. */
    }
  }
}
