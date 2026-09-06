import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Pagina, ResultadoMasivo } from '../../../domain/gestion/model/pagina';
import {
  CambiosDeUsuario, FiltroDeUsuarios, UsuarioGestionado,
} from '../../../domain/gestion/model/usuarios';
import {
  USUARIOS_EN_LOTE_PORT, USUARIOS_PORT,
} from '../../../domain/gestion/port/usuarios.port';

/**
 * Los casos de uso de la administración de cuentas.
 *
 * <p>Uno por ACCIÓN, cada uno con su `ejecuta`. Comparten fichero porque son la misma capacidad y
 * ninguno pasa de diez líneas: repartirlos en nueve ficheros de ocho líneas escondería que son un
 * conjunto y obligaría a nueve importes en la pantalla.
 */
@Injectable()
export class BuscaUsuarios {
  private readonly usuarios = inject(USUARIOS_PORT);

  ejecuta(filtro: FiltroDeUsuarios): Promise<Result<Pagina<UsuarioGestionado>, AppError>> {
    return this.usuarios.busca(filtro);
  }
}

@Injectable()
export class CambiaElRol {
  private readonly usuarios = inject(USUARIOS_PORT);

  ejecuta(id: string, rol: string): Promise<Result<void, AppError>> {
    return this.usuarios.cambiaRol(id, rol);
  }
}

/** Cuánto dura un bloqueo desde el panel. Una hora: es una medida de contención, no una expulsión. */
const MINUTOS_DE_BLOQUEO = 60;

@Injectable()
export class BloqueaUsuario {
  private readonly usuarios = inject(USUARIOS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.usuarios.bloquea(id, MINUTOS_DE_BLOQUEO);
  }
}

@Injectable()
export class DesbloqueaUsuario {
  private readonly usuarios = inject(USUARIOS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.usuarios.desbloquea(id);
  }
}

@Injectable()
export class ActivaUsuario {
  private readonly usuarios = inject(USUARIOS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.usuarios.activa(id);
  }
}

@Injectable()
export class EditaUsuario {
  private readonly usuarios = inject(USUARIOS_PORT);

  ejecuta(id: string, cambios: CambiosDeUsuario): Promise<Result<void, AppError>> {
    return this.usuarios.edita(id, cambios);
  }
}

@Injectable()
export class ReiniciaLaContrasena {
  private readonly usuarios = inject(USUARIOS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.usuarios.reiniciaContrasena(id);
  }
}

/**
 * Da de baja una cuenta.
 *
 * <p>NO la borra: el backend la ANONIMIZA y le pone marca de fecha, porque los pedidos y los apuntes
 * contables que la referencian tienen que seguir existiendo. Se llama «da de baja» y no «borra» para
 * que quien lea el código no espere que desaparezca nada.
 */
@Injectable()
export class DaDeBajaUsuario {
  private readonly usuarios = inject(USUARIOS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.usuarios.borra(id);
  }
}

@Injectable()
export class InvitaUsuario {
  private readonly usuarios = inject(USUARIOS_PORT);

  ejecuta(email: string, rol?: string): Promise<Result<void, AppError>> {
    return this.usuarios.invita(email, rol);
  }
}

/** Qué se puede hacer con muchas cuentas a la vez. */
export type AccionEnLote = 'activa' | 'bloquea' | 'desbloquea' | 'borra';

/**
 * Una acción sobre la selección.
 *
 * <p>Es UN caso de uso con la acción por parámetro y no cuatro: lo que ocurre —mandar los
 * identificadores y contar aciertos y fallos— es idéntico, y cuatro clases iguales salvo el nombre del
 * método no cuentan nada que el parámetro no diga ya.
 */
@Injectable()
export class ActuaSobreUsuarios {
  private readonly lote = inject(USUARIOS_EN_LOTE_PORT);

  ejecuta(accion: AccionEnLote, ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    switch (accion) {
      case 'activa':
        return this.lote.activa(ids);
      case 'bloquea':
        return this.lote.bloquea(ids);
      case 'desbloquea':
        return this.lote.desbloquea(ids);
      case 'borra':
        return this.lote.borra(ids);
    }
  }
}

@Injectable()
export class CambiaElRolEnLote {
  private readonly lote = inject(USUARIOS_EN_LOTE_PORT);

  ejecuta(ids: readonly string[], rol: string): Promise<Result<ResultadoMasivo, AppError>> {
    return this.lote.cambiaRol(ids, rol);
  }
}
