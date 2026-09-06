import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { NuevoProyecto, ProyectoOdm } from '../model/proyecto-odm';

/** Mis proyectos a medida: abrirlos, editarlos y borrarlos. */
export interface ProyectosOdmPort {
  mios(): Promise<Result<readonly ProyectoOdm[], AppError>>;
  crea(proyecto: NuevoProyecto): Promise<Result<ProyectoOdm, AppError>>;
  actualiza(id: string, proyecto: NuevoProyecto): Promise<Result<ProyectoOdm, AppError>>;
  elimina(id: string): Promise<Result<void, AppError>>;
}

export const PROYECTOS_ODM_PORT = new InjectionToken<ProyectosOdmPort>('ProyectosOdmPort');

/**
 * Avanzar el estado de un proyecto.
 *
 * <p>Puerto aparte porque detrás hay otro PERMISO: mover un proyecto a «en producción» es una decisión
 * del operador, no del cliente que lo abrió, y el backend lo sirve por una ruta de administración.
 * Mezclarlo con el puerto anterior escondía esa diferencia justo donde importa, y dejaba la puerta
 * abierta a que una pantalla de cliente ofreciera un botón que iba a devolver un 403.
 */
export interface EstadoDeProyectoOdmPort {
  cambia(id: string, estado: string): Promise<Result<ProyectoOdm, AppError>>;
}

export const ESTADO_DE_PROYECTO_ODM_PORT = new InjectionToken<EstadoDeProyectoOdmPort>(
  'EstadoDeProyectoOdmPort',
);
