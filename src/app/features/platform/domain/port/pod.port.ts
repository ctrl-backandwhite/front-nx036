import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DisenoPod, MaquetaGenerada, NuevoDiseno, ProductoEnBlanco } from '../model/diseno-pod';

/**
 * El catálogo de prendas y objetos sin estampar.
 *
 * <p>Lectura pública y en el idioma activo: los títulos vienen ya traducidos del backend. Va aparte de
 * los diseños porque se puede mirar el catálogo sin tener cuenta ni haber creado nada.
 */
export interface ProductosEnBlancoPort {
  lista(idioma: string): Promise<Result<readonly ProductoEnBlanco[], AppError>>;
}

export const PRODUCTOS_EN_BLANCO_PORT = new InjectionToken<ProductosEnBlancoPort>(
  'ProductosEnBlancoPort',
);

/** Mis diseños: crearlos, renombrarlos y borrarlos. */
export interface DisenosPort {
  mios(): Promise<Result<readonly DisenoPod[], AppError>>;
  crea(diseno: NuevoDiseno): Promise<Result<DisenoPod, AppError>>;
  renombra(id: string, nombre: string): Promise<Result<DisenoPod, AppError>>;
  elimina(id: string): Promise<Result<void, AppError>>;
}

export const DISENOS_PORT = new InjectionToken<DisenosPort>('DisenosPort');

/**
 * Generar una maqueta con inteligencia artificial.
 *
 * <p>Es su propio puerto porque es un servicio EXTERNO con su propia forma de fallar —tarda, se satura,
 * rechaza instrucciones— y porque el día que se cambie de proveedor no debería tocarse nada de lo que
 * guarda diseños. Con un puerto único, cambiar de generador obligaba a tocar la clase que también
 * borra.
 */
export interface GeneracionDeDisenoPort {
  genera(instruccion: string): Promise<Result<MaquetaGenerada, AppError>>;
}

export const GENERACION_DE_DISENO_PORT = new InjectionToken<GeneracionDeDisenoPort>(
  'GeneracionDeDisenoPort',
);
