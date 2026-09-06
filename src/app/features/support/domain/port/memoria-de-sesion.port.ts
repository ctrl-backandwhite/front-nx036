import { InjectionToken } from '@angular/core';

/**
 * Memoria que dura lo que la PESTAÑA.
 *
 * <p>La conversación con el asistente sobrevive a cambiar de página y a recargar, pero no a cerrar la
 * pestaña: es una charla, no una preferencia. El almacén transversal del proyecto es permanente, así
 * que este contexto declara el suyo con el alcance que necesita.
 *
 * <p>El contrato es que NUNCA lanza. En navegación privada, o con «bloquear todas las cookies», hasta
 * LEER lanza; y al prerenderizar no existe. Sin esa protección, un fallo al recuperar el hilo tumbaba la
 * pantalla entera antes de pintar nada.
 */
export interface MemoriaDeSesionPort {
  lee(clave: string): string | null;
  guarda(clave: string, valor: string): void;
}

export const MEMORIA_DE_SESION_PORT = new InjectionToken<MemoriaDeSesionPort>(
  'MemoriaDeSesionPort',
);
