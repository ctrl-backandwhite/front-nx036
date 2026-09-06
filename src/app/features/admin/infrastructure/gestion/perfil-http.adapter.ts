import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Rol, Usuario } from '@features/auth/domain/model/usuario';
import { AltaDeSegundoFactor, CambiosDePerfil, SesionAbierta } from '../../domain/gestion/model/perfil';
import {
  PerfilPort, SegundoFactorPort, SesionesPort,
} from '../../domain/gestion/port/perfil.port';
import { sinCuerpo } from './sin-cuerpo';

interface PerfilDto {
  id: string;
  email: string;
  role?: string;
  active?: boolean;
  displayName?: string;
  companyName?: string;
  country?: string;
  language?: string;
  avatarUrl?: string;
  createdAt?: string;
  permissions?: string[];
}

function aUsuario(dto: PerfilDto): Usuario {
  return {
    id: dto.id,
    email: dto.email,
    rol: (dto.role ?? 'USER') as Rol,
    activo: dto.active ?? true,
    creadoEl: dto.createdAt ?? '',
    permisos: dto.permissions ?? [],
    ...(dto.displayName ? { nombreVisible: dto.displayName } : {}),
    ...(dto.companyName ? { empresa: dto.companyName } : {}),
    ...(dto.country ? { pais: dto.country } : {}),
    ...(dto.language ? { idioma: dto.language } : {}),
    ...(dto.avatarUrl ? { avatarUrl: dto.avatarUrl } : {}),
  };
}

@Injectable()
export class PerfilHttpAdapter implements PerfilPort {
  private readonly api = inject(ApiService);

  async lee(): Promise<Result<Usuario, AppError>> {
    const respuesta = await this.api.get<PerfilDto>('/me');
    return mapea(respuesta, aUsuario);
  }

  async actualiza(cambios: CambiosDePerfil): Promise<Result<Usuario, AppError>> {
    const respuesta = await this.api.put<PerfilDto>('/me', {
      displayName: cambios.nombreVisible || undefined,
      companyName: cambios.empresa || undefined,
      country: cambios.pais || undefined,
    });
    return mapea(respuesta, aUsuario);
  }

  cambiaContrasena(actual: string, nueva: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post('/me/password', { currentPassword: actual, newPassword: nueva }));
  }
}

/**
 * El segundo factor de la propia cuenta.
 *
 * <p>El secreto y la dirección `otpauth` NO salen de aquí hacia ningún tercero: el código QR se dibuja
 * en el propio navegador. Mandarlos a un servicio de imágenes —como se hacía antes— entrega la semilla
 * del segundo factor a quien sirva esa imagen.
 */
@Injectable()
export class SegundoFactorHttpAdapter implements SegundoFactorPort {
  private readonly api = inject(ApiService);

  async estado(): Promise<Result<boolean, AppError>> {
    const respuesta = await this.api.get<{ enabled?: boolean }>('/me/2fa/status');
    return mapea(respuesta, (dto) => !!dto?.enabled);
  }

  async inicia(): Promise<Result<AltaDeSegundoFactor, AppError>> {
    const respuesta = await this.api.post<{ base32Secret: string; otpauthUrl: string }>('/me/2fa/setup');
    return mapea(respuesta, (dto) => ({ secreto: dto.base32Secret, urlOtpauth: dto.otpauthUrl }));
  }

  async verifica(codigo: string): Promise<Result<readonly string[], AppError>> {
    const respuesta = await this.api.post<{ backupCodes?: string[] }>('/me/2fa/verify', { otp: codigo });
    return mapea(respuesta, (dto) => dto?.backupCodes ?? []);
  }

  desactiva(contrasena: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post('/me/2fa/disable', { password: contrasena }));
  }
}

interface SesionDto {
  id: string;
  device?: string;
  ip?: string;
  createdAt: string;
  lastSeenAt: string;
  current?: boolean;
}

@Injectable()
export class SesionesHttpAdapter implements SesionesPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly SesionAbierta[], AppError>> {
    const respuesta = await this.api.get<SesionDto[]>('/me/sessions');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        dispositivo: dto.device ?? '',
        creadaEl: dto.createdAt,
        vistaEl: dto.lastSeenAt,
        actual: dto.current ?? false,
        ...(dto.ip ? { ip: dto.ip } : {}),
      })),
    );
  }

  revoca(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post(`/me/sessions/${id}/revoke`));
  }
}
