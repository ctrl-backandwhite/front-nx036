import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  DivisasActivasPort,
  GeolocalizacionPort,
  PaisDeEnvio,
  PaisesDeEnvioPort,
} from '../domain/port/datos-del-alta.port';

/** La forma en que habla el backend. Vive aquí y no sale de este fichero. */
interface PaisDeEnvioDto {
  countryCode: string;
  countryName: string;
}

interface DivisaDto {
  code: string;
}

interface GeoDto {
  country: string | null;
}

/**
 * Los tres datos de apoyo del formulario de alta, resueltos contra el backend.
 *
 * <p>Implementa TRES puertos porque los tres son consultas de una sola llamada: partirlo en tres clases
 * idénticas solo añadiría ficheros. Lo que importa es que quien los consume vea tres contratos pequeños
 * y no uno grande.
 */
@Injectable()
export class DatosDelAltaHttpAdapter
  implements PaisesDeEnvioPort, DivisasActivasPort, GeolocalizacionPort
{
  private readonly api = inject(ApiService);

  /**
   * Los países que se pueden elegir al registrarse son EXACTAMENTE aquellos a los que se envía. Misma
   * fuente que el rótulo de la portada: así el desplegable no puede ofrecer un destino al que luego no
   * se despacha.
   */
  async consulta(): Promise<Result<readonly PaisDeEnvio[], AppError>> {
    const respuesta = await this.api.get<PaisDeEnvioDto[]>('/shipping/countries');
    return mapea(respuesta, (paises) =>
      (paises ?? []).map((p) => ({ codigo: p.countryCode, nombre: p.countryName })),
    );
  }

  /** Las divisas ACTIVAS varían al encenderlas y apagarlas en el panel: no es un número fijo. */
  async cuantas(): Promise<Result<number, AppError>> {
    return mapea(await this.api.get<DivisaDto[]>('/currency/rates'), (r) => (r ?? []).length);
  }

  /**
   * El país del visitante sale de la cabecera que pone el CDN, no de un servicio externo: misma fuente
   * que la divisa y que el margen por país, y una dependencia menos que pueda caerse.
   */
  async paisDelVisitante(): Promise<Result<string | null, AppError>> {
    return mapea(await this.api.get<GeoDto>('/geo'), (geo) => {
      const codigo = (geo?.country ?? '').toUpperCase();
      return codigo.length === 2 ? codigo : null;
    });
  }
}
