import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ResultadoMasivo } from '../../../domain/gestion/model/pagina';
import { AjusteDeMoq, BorradorDeRegla, ReglaDePrecio } from '../../../domain/gestion/model/precios';
import {
  AMBITOS_DE_REGLA_PORT, OpcionDeAmbito, PRECIOS_PORT,
} from '../../../domain/gestion/port/precios.port';

@Injectable()
export class ConsultaReglas {
  private readonly precios = inject(PRECIOS_PORT);

  ejecuta(): Promise<Result<readonly ReglaDePrecio[], AppError>> {
    return this.precios.reglas();
  }
}

/**
 * Guarda una regla, sea nueva o existente.
 *
 * <p>Es UN caso de uso y no dos porque desde la pantalla es un solo gesto —pulsar «guardar»— y lo que
 * decide si crea o actualiza es un dato, no una decisión de quien administra. Partirlo obligaría a la
 * pantalla a preguntarse por el identificador, que es exactamente lo que no tiene que hacer.
 */
@Injectable()
export class GuardaLaRegla {
  private readonly precios = inject(PRECIOS_PORT);

  ejecuta(regla: BorradorDeRegla): Promise<Result<void, AppError>> {
    return regla.id ? this.precios.actualiza(regla.id, regla) : this.precios.crea(regla);
  }
}

@Injectable()
export class AlternaLaRegla {
  private readonly precios = inject(PRECIOS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.precios.alterna(id);
  }
}

@Injectable()
export class BorraLaRegla {
  private readonly precios = inject(PRECIOS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.precios.borra(id);
  }
}

@Injectable()
export class AlternaReglasEnLote {
  private readonly precios = inject(PRECIOS_PORT);

  ejecuta(ids: readonly string[], activa: boolean): Promise<Result<ResultadoMasivo, AppError>> {
    return this.precios.alternaEnLote(ids, activa);
  }
}

@Injectable()
export class BorraReglasEnLote {
  private readonly precios = inject(PRECIOS_PORT);

  ejecuta(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    return this.precios.borraEnLote(ids);
  }
}

@Injectable()
export class ConsultaElAjusteDeMoq {
  private readonly precios = inject(PRECIOS_PORT);

  ejecuta(): Promise<Result<AjusteDeMoq, AppError>> {
    return this.precios.ajusteDeMoq();
  }
}

/** El margen se reduce al porcentaje indicado para los productos con pedido mínimo mayor que uno. */
@Injectable()
export class GuardaElAjusteDeMoq {
  private readonly precios = inject(PRECIOS_PORT);

  ejecuta(ajuste: AjusteDeMoq): Promise<Result<AjusteDeMoq, AppError>> {
    return this.precios.guardaAjusteDeMoq(ajuste);
  }
}

/** Las cuatro listas de nombres con las que se elige el ámbito, pedidas de una vez. */
export interface AmbitosDisponibles {
  readonly categorias: readonly OpcionDeAmbito[];
  readonly proveedores: readonly OpcionDeAmbito[];
  readonly productos: readonly OpcionDeAmbito[];
  readonly grupos: readonly OpcionDeAmbito[];
}

/**
 * Carga los desplegables del editor de reglas.
 *
 * <p>Las cuatro lecturas van EN PARALELO y ninguna es imprescindible: la que falle deja su desplegable
 * vacío, pero el editor sigue abriéndose. Encadenarlas habría hecho que un catálogo lento retrasara
 * también la lista de proveedores.
 */
@Injectable()
export class CargaLosAmbitos {
  private readonly ambitos = inject(AMBITOS_DE_REGLA_PORT);

  async ejecuta(): Promise<AmbitosDisponibles> {
    const [categorias, proveedores, productos, grupos] = await Promise.all([
      this.ambitos.categorias(),
      this.ambitos.proveedores(),
      this.ambitos.productos(),
      this.ambitos.grupos(),
    ]);
    return {
      categorias: categorias.ok ? categorias.valor : [],
      proveedores: proveedores.ok ? proveedores.valor : [],
      productos: productos.ok ? productos.valor : [],
      grupos: grupos.ok ? grupos.valor : [],
    };
  }
}
