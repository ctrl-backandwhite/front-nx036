import { InjectionToken } from '@angular/core';

/**
 * Guardar un fichero en el disco de quien mira.
 *
 * <p>Es un puerto porque es un EFECTO del navegador, no una regla: crear un enlace invisible, pulsarlo y
 * liberar la dirección temporal es fontanería del DOM que no tiene por qué conocer un caso de uso. Con
 * el puerto, la prueba comprueba que se pidió guardar «tal fichero» sin montar medio documento.
 */
export interface DescargaDeFicherosPort {
  guarda(nombre: string, contenido: Blob): void;
}

export const DESCARGA_DE_FICHEROS_PORT = new InjectionToken<DescargaDeFicherosPort>(
  'DescargaDeFicherosPort',
);

/**
 * Copiar al portapapeles.
 *
 * <p>Mismo motivo: `navigator.clipboard` no existe fuera del navegador —al prerenderizar reventaría— y
 * puede fallar por permisos. El puerto devuelve si se pudo, para que la pantalla no cante un «copiado»
 * que no ocurrió.
 */
export interface PortapapelesPort {
  copia(texto: string): Promise<boolean>;
}

export const PORTAPAPELES_PORT = new InjectionToken<PortapapelesPort>('PortapapelesPort');
