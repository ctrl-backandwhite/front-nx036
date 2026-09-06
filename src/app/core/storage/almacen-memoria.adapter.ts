import { Injectable } from '@angular/core';
import { AlmacenPort } from './almacen.port';

/**
 * Almacén en memoria. Es lo que se registra al PRERENDERIZAR —donde no hay navegador— y lo que usan las
 * pruebas para no arrastrar estado de un caso al siguiente.
 */
@Injectable()
export class AlmacenMemoriaAdapter implements AlmacenPort {
  private readonly datos = new Map<string, string>();

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
