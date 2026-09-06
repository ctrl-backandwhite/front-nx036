import { Injectable } from '@angular/core';
import { DescargaPort, FicheroDescargable } from '../domain/port/descarga.port';

/**
 * Entrega un fichero al navegador de quien está mirando.
 *
 * <p>Se crea un enlace temporal en memoria porque el contenido ya está descargado: se pidió con la
 * credencial de la sesión, cosa que un `<a href>` normal no puede hacer.
 */
@Injectable()
export class DescargaNavegadorAdapter implements DescargaPort {
  entrega(fichero: FicheroDescargable): void {
    const url = URL.createObjectURL(fichero.contenido);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = fichero.nombre;
    // Hay que colgarlo del documento: algunos navegadores ignoran el clic sobre un nodo suelto.
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    // Se libera enseguida: cada objeto creado así se queda en memoria hasta que se suelta o se cierra la
    // pestaña, y quien descarga dos veces deja dos copias del fichero colgadas.
    URL.revokeObjectURL(url);
  }
}
