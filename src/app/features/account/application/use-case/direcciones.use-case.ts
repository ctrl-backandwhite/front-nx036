import { Injectable, inject } from '@angular/core';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DatosDeDireccion } from '../../domain/model/direccion';
import { DIRECCIONES_PORT } from '../../domain/port/direcciones.port';
import { DireccionesStore } from '../state/direcciones.store';

/** Trae el libro de direcciones y lo deja en el almacén compartido. */
@Injectable()
export class CargaDirecciones {
  private readonly direcciones = inject(DIRECCIONES_PORT);
  private readonly almacen = inject(DireccionesStore);

  async ejecuta(): Promise<Result<void, AppError>> {
    this.almacen.marcaCargando(true);
    try {
      const resultado = await this.direcciones.lista();
      if (!resultado.ok) {
        return resultado;
      }
      this.almacen.fija(resultado.valor);
      return exito(undefined);
    } finally {
      this.almacen.marcaCargando(false);
    }
  }
}

/**
 * Crea o actualiza una dirección, y refresca la lista.
 *
 * <p>Es UN caso de uso y no dos porque quien lo llama hace lo mismo: el formulario es el mismo, la
 * validación es la misma y lo único que cambia es si venía con identificador. Partirlo obligaría a cada
 * pantalla a elegir, que es la decisión que se quería quitar de en medio.
 *
 * <p>Refrescar después es parte de la operación: sin ello la pantalla enseña la lista de antes y parece
 * que el guardado no ha hecho nada.
 */
@Injectable()
export class GuardaDireccion {
  private readonly direcciones = inject(DIRECCIONES_PORT);
  private readonly carga = inject(CargaDirecciones);

  async ejecuta(datos: DatosDeDireccion, id?: string): Promise<Result<void, AppError>> {
    const resultado = id
      ? await this.direcciones.actualiza(id, datos)
      : await this.direcciones.crea(datos);
    if (!resultado.ok) {
      return resultado;
    }
    await this.carga.ejecuta();
    return exito(undefined);
  }
}

/**
 * Borra una dirección.
 *
 * <p>Los pedidos anteriores NO se ven afectados: cada uno guarda su propia copia de la dirección a la
 * que se envió. Lo que se pierde es la comodidad de tenerla apuntada.
 */
@Injectable()
export class EliminaDireccion {
  private readonly direcciones = inject(DIRECCIONES_PORT);
  private readonly carga = inject(CargaDirecciones);

  async ejecuta(id: string): Promise<Result<void, AppError>> {
    const resultado = await this.direcciones.elimina(id);
    if (!resultado.ok) {
      return resultado;
    }
    await this.carga.ejecuta();
    return exito(undefined);
  }
}
