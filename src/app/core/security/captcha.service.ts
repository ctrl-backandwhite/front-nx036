import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';

interface Reto {
  algorithm: string;
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}

/**
 * CAPTCHA por prueba de trabajo (protocolo ALTCHA).
 *
 * <p>Pide un reto al backend y busca por fuerza bruta el número cuyo SHA-256(sal + n) reproduce el reto.
 * Es INVISIBLE: el coste está en el cálculo, no en molestar a quien rellena el formulario. Se resuelve
 * por lotes para no dejar la interfaz congelada — cien mil resúmenes tardan menos de un segundo en un
 * equipo normal, y ese tiempo se absorbe en el propio botón de enviar.
 *
 * <p>Usa `HttpClient` SIN pasar por los interceptores de la aplicación (`HttpBackend` no, aquí basta con
 * que el interceptor de captcha se salte esta ruta): pedir el reto no puede exigir a su vez un reto.
 */
@Injectable({ providedIn: 'root' })
export class CaptchaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  async resuelve(): Promise<string> {
    const reto = await firstValueFrom(
      this.http.get<Reto>(`${this.config.apiBase}/api/captcha/challenge`),
    );
    const codificador = new TextEncoder();
    const LOTE = 500;

    for (let inicio = 0; inicio <= reto.maxnumber; inicio += LOTE) {
      const numeros: number[] = [];
      for (let n = inicio; n <= Math.min(inicio + LOTE - 1, reto.maxnumber); n++) {
        numeros.push(n);
      }
      const resumenes = await Promise.all(
        numeros.map((n) => this.sha256Hex(codificador, reto.salt + n)),
      );
      const encontrado = resumenes.findIndex((h) => h === reto.challenge);
      if (encontrado >= 0) {
        return btoa(
          JSON.stringify({
            algorithm: reto.algorithm,
            challenge: reto.challenge,
            number: numeros[encontrado],
            salt: reto.salt,
            signature: reto.signature,
          }),
        );
      }
    }
    throw new Error('captcha sin resolver');
  }

  private async sha256Hex(codificador: TextEncoder, entrada: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', codificador.encode(entrada));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
