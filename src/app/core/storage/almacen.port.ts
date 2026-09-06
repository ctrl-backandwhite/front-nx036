import { InjectionToken } from '@angular/core';

/**
 * Guardar algo en el equipo de quien mira. Es un PUERTO: quien lo usa no sabe si detrás hay
 * almacenamiento del navegador, una cookie o nada en absoluto.
 *
 * <p>Nunca lanza. Un navegador en modo privado —o con «bloquear todas las cookies»— hace que hasta LEER
 * lance una excepción, y eso, en un módulo que se carga al arrancar, deja la aplicación entera sin
 * montar. Ya pasó en el front de React y está documentado allí. Aquí el contrato lo impide: si no se
 * puede guardar, se devuelve `null` y la aplicación sigue, con la preferencia viva solo en esta sesión.
 */
export interface AlmacenPort {
  lee(clave: string): string | null;
  guarda(clave: string, valor: string): void;
  borra(clave: string): void;
}

export const ALMACEN_LOCAL = new InjectionToken<AlmacenPort>('AlmacenLocal');
