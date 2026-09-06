import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, exito, fallo, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  Credenciales,
  Rol,
  SesionIniciada,
  SolicitudDeAlta,
  Usuario,
} from '../domain/model/usuario';
import {
  AltaDeCuentaPort,
  AutenticacionPort,
  UsuarioActualPort,
} from '../domain/port/autenticacion.port';

/** La forma en que el BACKEND habla. Vive aquí y no sale de este fichero. */
interface UsuarioDto {
  id: string;
  email: string;
  role: Rol;
  active: boolean;
  displayName?: string;
  firstName?: string;
  lastName1?: string;
  lastName2?: string;
  fullName?: string;
  companyName?: string;
  country?: string;
  language?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
  authorities: string[];
}

interface RespuestaDeEntrada {
  token: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UsuarioDto;
}

/**
 * Traduce del vocabulario del backend al del dominio.
 *
 * <p>Esta función es la razón de ser del adaptador. Mientras exista, el día que el servidor renombre un
 * campo se cambia una línea aquí y no ciento y pico plantillas.
 */
function aUsuario(dto: UsuarioDto): Usuario {
  return {
    id: dto.id,
    email: dto.email,
    rol: dto.role,
    activo: dto.active,
    nombreVisible: dto.displayName,
    nombre: dto.firstName,
    primerApellido: dto.lastName1,
    segundoApellido: dto.lastName2,
    nombreCompleto: dto.fullName,
    empresa: dto.companyName,
    pais: dto.country,
    idioma: dto.language,
    telefono: dto.phone,
    avatarUrl: dto.avatarUrl,
    creadoEl: dto.createdAt,
    ultimoAccesoEl: dto.lastLogin,
    permisos: dto.authorities ?? [],
  };
}

/**
 * El adaptador de autenticación contra nuestro backend.
 *
 * <p>Implementa TRES puertos porque los tres se resuelven contra el mismo servicio; separarlos en tres
 * clases idénticas solo añadiría ficheros. Lo que importa es que quien los consume vea tres contratos
 * pequeños y no uno grande: puede sustituir el que necesite sin cargar con el resto.
 *
 * <p>No lleva `providedIn: 'root'`: se registra en `auth.providers.ts`, que es donde se decide qué
 * implementación cumple cada puerto.
 */
@Injectable()
export class AutenticacionHttpAdapter
  implements AutenticacionPort, AltaDeCuentaPort, UsuarioActualPort
{
  private readonly api = inject(ApiService);

  async entra(credenciales: Credenciales): Promise<Result<SesionIniciada, AppError>> {
    const respuesta = await this.api.post<RespuestaDeEntrada>('/auth/login', {
      email: credenciales.email,
      password: credenciales.contrasena,
      linkSocial: !!credenciales.vinculaAccesoSocial,
      otp: credenciales.codigoDeUnSoloUso || undefined,
    });
    return mapea(respuesta, (r) => ({
      usuario: aUsuario(r.user),
      token: r.token,
      tokenDeRefresco: r.refreshToken,
    }));
  }

  async sal(): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<void>('/auth/logout'), () => undefined);
  }

  async registra(
    solicitud: SolicitudDeAlta,
    captcha?: string,
  ): Promise<Result<{ idUsuario: string; mensaje: string }, AppError>> {
    // Si el formulario ya resolvió el reto con su widget visible, viaja en la cabecera y el interceptor
    // no lo vuelve a calcular. El resto de formularios lo resuelven de forma invisible.
    const respuesta = await this.api.post<{ userId: string; message: string }>(
      '/auth/register',
      { ...aSolicitudDto(solicitud), ...(captcha ? { captcha } : {}) },
    );
    return mapea(respuesta, (r) => ({ idUsuario: r.userId, mensaje: r.message }));
  }

  async activa(codigo: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<void>('/auth/activate', { code: codigo }), () => undefined);
  }

  async reenviaActivacion(email: string): Promise<Result<void, AppError>> {
    // El backend responde siempre lo mismo, exista o no la cuenta: si distinguiera, sería una forma de
    // averiguar qué direcciones están registradas.
    return mapea(await this.api.post<void>('/auth/activate/resend', { email }), () => undefined);
  }

  async consulta(): Promise<Result<Usuario | null, AppError>> {
    const respuesta = await this.api.get<UsuarioDto | null>('/me');
    return respuesta.ok
      ? exito(respuesta.valor ? aUsuario(respuesta.valor) : null)
      : fallo(respuesta.error);
  }

  async actualiza(
    cambios: Partial<Pick<Usuario, 'nombreVisible' | 'empresa' | 'pais' | 'idioma'>>,
  ): Promise<Result<Usuario, AppError>> {
    const respuesta = await this.api.put<UsuarioDto>('/me', {
      displayName: cambios.nombreVisible ?? '',
      companyName: cambios.empresa ?? '',
      country: cambios.pais ?? '',
      language: cambios.idioma,
    });
    return mapea(respuesta, aUsuario);
  }
}

function aSolicitudDto(s: SolicitudDeAlta): Record<string, unknown> {
  return {
    email: s.email,
    password: s.contrasena,
    firstName: s.nombre,
    lastName1: s.primerApellido,
    lastName2: s.segundoApellido,
    displayName: s.nombreVisible,
    companyName: s.empresa,
    country: s.pais,
    language: s.idioma,
    acceptedTerms: s.aceptaCondiciones,
    acceptedTermsVersion: s.versionDeCondiciones,
    marketingOptIn: s.aceptaComunicaciones,
  };
}
