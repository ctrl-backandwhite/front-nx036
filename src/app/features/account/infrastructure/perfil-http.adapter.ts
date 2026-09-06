import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { TokenStore } from '@core/auth/token-store';
import { Result, exito, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CambioDeContrasena, DatosDePerfil } from '../domain/model/perfil';
import {
  BajaDeCuentaPort,
  FinDeSesionPort,
  PerfilPort,
  PortabilidadPort,
} from '../domain/port/perfil.port';
import { FicheroDescargable } from '../domain/port/descarga.port';
import { descargaBinaria } from './descarga-binaria';

/** La forma en que habla el backend. Vive aquí y no sale de este fichero. */
interface CambioDePerfilDto {
  firstName: string;
  lastName1: string;
  lastName2: string;
  companyName: string;
  country: string;
  language: string;
  phone: string;
}

/**
 * El perfil contra nuestro backend.
 *
 * <p>Implementa cuatro puertos porque los cuatro se resuelven contra el mismo servicio; partirlos en
 * cuatro clases idénticas solo añadiría ficheros. Lo que importa es que quien los consume vea cuatro
 * contratos pequeños y no uno grande.
 */
@Injectable()
export class PerfilHttpAdapter
  implements PerfilPort, BajaDeCuentaPort, PortabilidadPort, FinDeSesionPort
{
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly tokens = inject(TokenStore);

  async actualiza(datos: DatosDePerfil): Promise<Result<void, AppError>> {
    // El PAÍS viaja porque el formulario lo manda tal cual lo tenía: es el de REGISTRO, el que fija el
    // margen. Solo quien administra puede cambiarlo, y esa decisión la toma la pantalla.
    const cuerpo: CambioDePerfilDto = {
      firstName: datos.nombre,
      lastName1: datos.primerApellido,
      lastName2: datos.segundoApellido,
      companyName: datos.empresa,
      country: datos.pais,
      language: datos.idioma,
      phone: datos.telefono,
    };
    return mapea(await this.api.put<unknown>('/me', cuerpo), () => undefined);
  }

  async cambiaContrasena(cambio: CambioDeContrasena): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>('/me/password', {
      currentPassword: cambio.actual,
      newPassword: cambio.nueva,
    });
    return mapea(respuesta, () => undefined);
  }

  async solicita(): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<unknown>('/me/delete/request'), () => undefined);
  }

  async confirma(codigo: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<unknown>('/me/delete/confirm', { code: codigo }), () => undefined);
  }

  async exporta(): Promise<Result<FicheroDescargable, AppError>> {
    const contenido = await descargaBinaria(this.http, this.config.apiBase, '/me/data-export');
    return contenido.ok ? exito({ nombre: 'mis-datos.json', contenido: contenido.valor }) : contenido;
  }

  /**
   * Cierra la sesión de este equipo.
   *
   * <p>Avisa al servidor y borra las credenciales PASE LO QUE PASE: si la red falla al avisar, dejar a
   * alguien dentro sería lo contrario de lo que pidió, y en un ordenador compartido es un problema de
   * verdad.
   */
  async termina(): Promise<void> {
    await this.api.post<unknown>('/auth/logout');
    this.tokens.limpia();
  }
}
