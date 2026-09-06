import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { NuevoProyecto, ProyectoOdm } from '../domain/model/proyecto-odm';
import { EstadoDeProyectoOdmPort, ProyectosOdmPort } from '../domain/port/odm.port';

interface ProyectoDto {
  id: string;
  kind: string;
  title: string;
  brief?: string;
  budgetUsdCents?: number;
  slaDays?: number;
  status: string;
  createdAt: string;
}

function aProyecto(dto: ProyectoDto): ProyectoOdm {
  return {
    id: dto.id,
    clase: dto.kind,
    titulo: dto.title,
    resumen: dto.brief,
    presupuestoEnCentimosUsd: dto.budgetUsdCents,
    diasDeCompromiso: dto.slaDays,
    estado: dto.status,
    creadoEl: dto.createdAt,
  };
}

function aCuerpo(proyecto: NuevoProyecto): Record<string, unknown> {
  return {
    kind: proyecto.clase,
    title: proyecto.titulo,
    brief: proyecto.resumen,
    budgetUsdCents: proyecto.presupuestoEnCentimosUsd,
  };
}

/** Los proyectos a medida de quien ha entrado. */
@Injectable()
export class ProyectosOdmHttpAdapter implements ProyectosOdmPort {
  private readonly api = inject(ApiService);

  async mios(): Promise<Result<readonly ProyectoOdm[], AppError>> {
    return mapea(await this.api.get<ProyectoDto[]>('/me/odm/projects'), (filas) =>
      filas.map(aProyecto),
    );
  }

  async crea(proyecto: NuevoProyecto): Promise<Result<ProyectoOdm, AppError>> {
    return mapea(await this.api.post<ProyectoDto>('/me/odm/projects', aCuerpo(proyecto)), aProyecto);
  }

  async actualiza(id: string, proyecto: NuevoProyecto): Promise<Result<ProyectoOdm, AppError>> {
    return mapea(
      await this.api.put<ProyectoDto>(`/me/odm/projects/${id}`, aCuerpo(proyecto)),
      aProyecto,
    );
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<void>(`/me/odm/projects/${id}`), () => undefined);
  }
}

/**
 * Avanzar el estado de un proyecto.
 *
 * <p>Adaptador aparte —y no un método más en el anterior— porque su ruta es de ADMINISTRACIÓN. La
 * separación deja escrito en el código lo que de otro modo solo estaría en la cabeza de quien lo
 * escribió: llamar a esto sin ser operador devuelve un 403, y quien pinta el desplegable tiene que
 * saberlo.
 */
@Injectable()
export class EstadoDeProyectoOdmHttpAdapter implements EstadoDeProyectoOdmPort {
  private readonly api = inject(ApiService);

  async cambia(id: string, estado: string): Promise<Result<ProyectoOdm, AppError>> {
    return mapea(
      await this.api.put<ProyectoDto>(`/admin/odm/projects/${id}/status`, { status: estado }),
      aProyecto,
    );
  }
}
