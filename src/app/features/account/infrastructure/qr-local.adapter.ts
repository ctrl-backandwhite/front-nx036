import { Injectable } from '@angular/core';
import { toDataURL } from 'qrcode';
import { CodigoQrPort } from '../domain/port/seguridad.port';

/**
 * Dibuja el código QR EN EL PROPIO NAVEGADOR.
 *
 * <p>Es la razón de existir de este adaptador. Lo que se dibuja lleva dentro la semilla del segundo
 * factor, así que no puede salir del dispositivo: la versión anterior se lo pedía a un servicio externo
 * de códigos QR y con ello regalaba el secreto a un tercero.
 */
@Injectable()
export class QrLocalAdapter implements CodigoQrPort {
  async dibuja(texto: string): Promise<string | null> {
    try {
      return await toDataURL(texto, { width: 240, margin: 2 });
    } catch {
      // Sin QR se enseña el secreto en texto para teclearlo a mano: el alta no se queda bloqueada.
      return null;
    }
  }
}
