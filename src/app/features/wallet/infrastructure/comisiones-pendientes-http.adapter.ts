import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ComisionesPendientes } from '../domain/model/comisiones-pendientes';
import { ComisionesPendientesPort } from '../domain/port/comisiones-pendientes.port';

interface ComisionDto {
  id: string;
  amountCents: number;
  status: string;
  createdAt?: string;
  approvesAt?: string | null;
}

interface PanelDto {
  joined: boolean;
  stats: { pendingCents: number; currency: string };
  recentCommissions: ComisionDto[];
}

/**
 * Las comisiones pendientes, leídas del mismo sitio que el panel de afiliados.
 *
 * <p>Aquí se da FORMA a los céntimos, no se convierten: el endpoint de afiliados manda el importe en la
 * divisa que él mismo declara y sin cadena formateada, así que la única opción es escribir ese número
 * con las convenciones del idioma activo. No interviene ningún tipo de cambio, que es lo que la norma
 * del proyecto prohíbe hacer en el navegador.
 *
 * <p>Es candidato a `shared/`: el contexto de afiliados hace exactamente lo mismo con los mismos datos.
 * Se deja duplicado a propósito mientras haya varios equipos tocando las capas comunes.
 */
@Injectable()
export class ComisionesPendientesHttpAdapter implements ComisionesPendientesPort {
  private readonly api = inject(ApiService);
  private readonly traduccion = inject(TraduccionService);

  async consulta(): Promise<Result<ComisionesPendientes, AppError>> {
    const respuesta = await this.api.get<PanelDto>('/me/affiliate');
    return mapea(respuesta, (dto) => {
      const divisa = dto.stats?.currency ?? 'EUR';
      const pendientes = (dto.recentCommissions ?? []).filter((c) => c.status === 'PENDING');
      return {
        esAfiliado: !!dto.joined,
        totalFormateado: this.formatea(dto.stats?.pendingCents ?? 0, divisa),
        comisiones: pendientes.map((c) => ({
          id: c.id,
          importeFormateado: this.formatea(c.amountCents, divisa),
          creadaEl: c.createdAt,
          apruebaEl: c.approvesAt,
        })),
      };
    });
  }

  private formatea(centimos: number, divisa: string): string {
    try {
      return new Intl.NumberFormat(this.traduccion.idioma(), {
        style: 'currency',
        currency: divisa,
      }).format(centimos / 100);
    } catch {
      // Un código de moneda que `Intl` no conozca hace que lance. Antes que dejar la lista sin importes,
      // se escribe la cifra con el código detrás.
      return `${(centimos / 100).toFixed(2)} ${divisa}`;
    }
  }
}
