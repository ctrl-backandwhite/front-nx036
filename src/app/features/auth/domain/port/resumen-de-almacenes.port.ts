import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Cuántos almacenes hay y en qué países. Lo enseña el panel de marca de la pantalla de acceso.
 *
 * <p>¿Por qué un puerto propio de «auth» para un dato que también sabe el contexto de plataforma? Porque
 * lo que «auth» necesita son DOS números para una frase, no el catálogo de almacenes con sus direcciones
 * y sus horarios. Depender del puerto grande de otro contexto ataría esta pantalla a cada cambio de
 * aquel, y obligaría a cualquier doble de prueba a fingir un almacén entero para pintar un rótulo.
 *
 * <p>Es el principio de segregación de interfaces aplicado literalmente: cada contexto declara lo que
 * necesita, y la infraestructura resuelve los dos contra el mismo sitio.
 */
export interface ResumenDeAlmacenes {
  readonly cuantos: number;
  readonly paises: readonly string[];
}

export interface ResumenDeAlmacenesPort {
  consulta(): Promise<Result<ResumenDeAlmacenes, AppError>>;
}

export const RESUMEN_DE_ALMACENES_PORT = new InjectionToken<ResumenDeAlmacenesPort>(
  'ResumenDeAlmacenesPort',
);
