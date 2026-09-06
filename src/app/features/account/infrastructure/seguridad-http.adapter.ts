import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AltaDeDobleFactor, SesionActiva } from '../domain/model/seguridad';
import { DobleFactorPort, SesionesActivasPort } from '../domain/port/seguridad.port';

interface SesionDto {
  id: string;
  device: string;
  ip?: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

@Injectable()
export class SeguridadHttpAdapter implements DobleFactorPort, SesionesActivasPort {
  private readonly api = inject(ApiService);

  async estaActivo(): Promise<Result<boolean, AppError>> {
    return mapea(await this.api.get<{ enabled: boolean }>('/me/2fa/status'), (dto) => !!dto.enabled);
  }

  async inicia(): Promise<Result<AltaDeDobleFactor, AppError>> {
    const respuesta = await this.api.post<{ base32Secret: string; otpauthUrl: string }>(
      '/me/2fa/setup',
    );
    return mapea(respuesta, (dto) => ({ secreto: dto.base32Secret, urlOtpauth: dto.otpauthUrl }));
  }

  async verifica(codigo: string): Promise<Result<readonly string[], AppError>> {
    const respuesta = await this.api.post<{ backupCodes?: string[] }>('/me/2fa/verify', {
      otp: codigo,
    });
    return mapea(respuesta, (dto) => dto.backupCodes ?? []);
  }

  async desactiva(contrasena: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>('/me/2fa/disable', { password: contrasena });
    return mapea(respuesta, () => undefined);
  }

  async lista(): Promise<Result<readonly SesionActiva[], AppError>> {
    return mapea(await this.api.get<SesionDto[]>('/me/sessions'), (sesiones) =>
      (sesiones ?? []).map((dto) => ({
        id: dto.id,
        dispositivo: dto.device,
        ip: dto.ip,
        creadaEl: dto.createdAt,
        ultimoUsoEl: dto.lastSeenAt,
        actual: dto.current,
      })),
    );
  }

  async revoca(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<unknown>(`/me/sessions/${id}/revoke`), () => undefined);
  }
}
