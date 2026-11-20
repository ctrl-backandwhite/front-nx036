import { Injectable, inject } from '@angular/core';
import { Plataforma } from '@core/platform/plataforma';
import { ReductorDeFotosPort } from '../domain/port/reductor-de-fotos.port';
import { CALIDAD_DE_FOTO, medidasReducidas } from '../domain/model/fotos-de-resena';

/**
 * Reduce la foto con el propio navegador: decodifica, escala a 1600 px de lado mayor y la vuelve a
 * codificar como JPEG. Una foto de móvil pasa de varios MB a cientos de kB antes de salir.
 *
 * <p>Solo corre en el navegador (en el prerenderizado no hay lienzo) y cualquier fallo devuelve el
 * original, que el servidor valida y recomprime de todos modos.
 */
@Injectable()
export class ReductorDeFotosNavegadorAdapter implements ReductorDeFotosPort {
  private readonly plataforma = inject(Plataforma);

  async reduce(fichero: File): Promise<File> {
    const documento = this.plataforma.documentoSiLoHay;
    if (!documento || typeof createImageBitmap !== 'function') {
      return fichero;
    }
    try {
      const imagen = await createImageBitmap(fichero, { imageOrientation: 'from-image' });
      const { ancho, alto } = medidasReducidas(imagen.width, imagen.height);
      const lienzo = documento.createElement('canvas');
      lienzo.width = ancho;
      lienzo.height = alto;
      const contexto = lienzo.getContext('2d');
      if (!contexto) {
        imagen.close();
        return fichero;
      }
      // El JPEG no tiene transparencia: sobre fondo blanco, no negro.
      contexto.fillStyle = '#ffffff';
      contexto.fillRect(0, 0, ancho, alto);
      contexto.drawImage(imagen, 0, 0, ancho, alto);
      const escalada = ancho !== imagen.width || alto !== imagen.height;
      imagen.close();
      const blob = await new Promise<Blob | null>((resuelve) =>
        lienzo.toBlob(resuelve, 'image/jpeg', CALIDAD_DE_FOTO),
      );
      // Si no se ha escalado y no ha adelgazado, no se gana nada con cambiarla.
      if (!blob || (!escalada && blob.size >= fichero.size)) {
        return fichero;
      }
      return new File([blob], nombreJpeg(fichero.name), { type: 'image/jpeg' });
    } catch {
      return fichero;
    }
  }
}

function nombreJpeg(nombre: string): string {
  const base = nombre.replace(/\.[^.]+$/, '') || 'foto';
  return base + '.jpg';
}
