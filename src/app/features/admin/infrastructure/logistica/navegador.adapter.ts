import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  DescargaDeFicherosPort,
  PortapapelesPort,
} from '../../domain/logistica/port/navegador.port';

/**
 * Guarda un fichero en el disco de quien mira.
 *
 * <p>Es el truco de siempre —enlace invisible, pulsación y liberación de la dirección temporal—, pero
 * encerrado aquí: si viviera en un caso de uso, probar «se descargó la hoja» exigiría montar medio
 * documento, y al prerenderizar no habría `document` que tocar.
 */
@Injectable()
export class DescargaDeFicherosAdapter implements DescargaDeFicherosPort {
  private readonly documento = inject(DOCUMENT);
  private readonly enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  guarda(nombre: string, contenido: Blob): void {
    if (!this.enNavegador) {
      return;
    }
    const direccion = URL.createObjectURL(contenido);
    const enlace = this.documento.createElement('a');
    enlace.href = direccion;
    enlace.download = nombre;
    this.documento.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    // Liberar la dirección temporal: sin esto el navegador mantiene el fichero entero en memoria hasta
    // que se recarga la página, y esta pantalla se usa descargando una hoja detrás de otra.
    URL.revokeObjectURL(direccion);
  }
}

/**
 * Copia al portapapeles.
 *
 * <p>Devuelve si se pudo. El permiso se puede denegar y la interfaz segura no existe fuera de HTTPS, así
 * que cantar «copiado» sin comprobarlo dejaba a quien compra pegando una dirección que no estaba.
 */
@Injectable()
export class PortapapelesAdapter implements PortapapelesPort {
  private readonly enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  async copia(texto: string): Promise<boolean> {
    if (!this.enNavegador || !texto || !navigator.clipboard) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      return false;
    }
  }
}
