import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Rol } from '@features/auth/domain/model/usuario';
import { Pagina, ResultadoMasivo } from '../../domain/gestion/model/pagina';
import {
  CambiosDeUsuario, FiltroDeUsuarios, UsuarioGestionado,
} from '../../domain/gestion/model/usuarios';
import { UsuariosEnLotePort, UsuariosPort } from '../../domain/gestion/port/usuarios.port';
import { PaginaDto, ResultadoMasivoDto, aPagina, aResultadoMasivo } from './pagina.dto';
import { sinCuerpo } from './sin-cuerpo';

interface UsuarioDto {
  id: string;
  email: string;
  role: string;
  active: boolean;
  displayName?: string;
  companyName?: string;
  country?: string;
  language?: string;
  lockedUntil?: string | null;
  failedLoginCount?: number;
  lastLogin?: string | null;
  createdAt?: string | null;
}

/** Un papel desconocido se trata como el más bajo: nunca se asciende a nadie por un dato raro. */
function aRol(crudo: string): Rol {
  return crudo === 'ADMIN' || crudo === 'OPERATOR' || crudo === 'PARTNER' ? crudo : 'USER';
}

function aUsuario(dto: UsuarioDto): UsuarioGestionado {
  return {
    id: dto.id,
    email: dto.email,
    rol: aRol(dto.role),
    activo: dto.active,
    accesosFallidos: dto.failedLoginCount ?? 0,
    ...(dto.displayName ? { nombreVisible: dto.displayName } : {}),
    ...(dto.companyName ? { empresa: dto.companyName } : {}),
    ...(dto.country ? { pais: dto.country } : {}),
    ...(dto.language ? { idioma: dto.language } : {}),
    bloqueadoHasta: dto.lockedUntil ?? null,
    ultimoAcceso: dto.lastLogin ?? null,
    creadoEl: dto.createdAt ?? null,
  };
}

@Injectable()
export class UsuariosHttpAdapter implements UsuariosPort {
  private readonly api = inject(ApiService);

  async busca(filtro: FiltroDeUsuarios): Promise<Result<Pagina<UsuarioGestionado>, AppError>> {
    const respuesta = await this.api.get<PaginaDto<UsuarioDto>>('/admin/users', {
      role: filtro.rol ?? '',
      country: filtro.pais ?? '',
      q: filtro.texto ?? '',
      page: filtro.pagina,
      size: filtro.tamano,
    });
    return mapea(respuesta, (dto) => aPagina(dto, aUsuario));
  }

  cambiaRol(id: string, rol: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.put(`/admin/users/${id}/role`, { role: rol }));
  }

  bloquea(id: string, minutos: number): Promise<Result<void, AppError>> {
    // Los minutos viajan en la consulta y no en el cuerpo: es como los espera el backend.
    return sinCuerpo(this.api.post(`/admin/users/${id}/lock?minutes=${minutos}`));
  }

  desbloquea(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post(`/admin/users/${id}/unlock`));
  }

  activa(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post(`/admin/users/${id}/activate`));
  }

  edita(id: string, cambios: CambiosDeUsuario): Promise<Result<void, AppError>> {
    return sinCuerpo(
      this.api.put(`/admin/users/${id}`, {
        displayName: cambios.nombreVisible ?? null,
        companyName: cambios.empresa ?? null,
        country: cambios.pais ?? null,
        language: cambios.idioma ?? null,
        active: cambios.activo ?? false,
      }),
    );
  }

  reiniciaContrasena(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post(`/admin/users/${id}/reset-password`));
  }

  /**
   * Anonimiza la cuenta y le pone marca de fecha.
   *
   * <p>El verbo del backend es un borrado, pero el efecto NO lo es: los pedidos y los apuntes contables
   * que la referencian tienen que seguir existiendo. Se deja escrito aquí porque desde la pantalla se
   * lee «eliminar» y quien mantenga esto tiene que saber qué ocurre de verdad.
   */
  borra(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.delete(`/admin/users/${id}`));
  }

  invita(email: string, rol?: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post('/admin/users/invite', { email, role: rol }));
  }
}

/**
 * Las acciones sobre muchas cuentas.
 *
 * <p>Van en OTRA clase y no como métodos más del adaptador anterior porque las dos interfaces comparten
 * nombres —`activa`, `bloquea`, `borra`— con firmas distintas: una sola clase no puede cumplir las dos.
 * Que el lenguaje lo impida es una señal de que también son dos capacidades distintas.
 */
@Injectable()
export class UsuariosEnLoteHttpAdapter implements UsuariosEnLotePort {
  private readonly api = inject(ApiService);

  activa(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    return this.lote(this.api.post<ResultadoMasivoDto>('/admin/users/bulk-activate', ids));
  }

  bloquea(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    return this.lote(this.api.post<ResultadoMasivoDto>('/admin/users/bulk-lock', ids));
  }

  desbloquea(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    return this.lote(this.api.post<ResultadoMasivoDto>('/admin/users/bulk-unlock', ids));
  }

  cambiaRol(ids: readonly string[], rol: string): Promise<Result<ResultadoMasivo, AppError>> {
    return this.lote(this.api.put<ResultadoMasivoDto>('/admin/users/bulk-role', { ids, role: rol }));
  }

  borra(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    return this.lote(this.api.post<ResultadoMasivoDto>('/admin/users/bulk-delete', ids));
  }

  private async lote(
    promesa: Promise<Result<ResultadoMasivoDto, AppError>>,
  ): Promise<Result<ResultadoMasivo, AppError>> {
    return mapea(await promesa, aResultadoMasivo);
  }
}
