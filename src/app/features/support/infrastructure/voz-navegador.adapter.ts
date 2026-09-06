import { Injectable } from '@angular/core';
import { esNavegador } from '@core/platform/plataforma';
import { VozPort } from '../domain/port/voz.port';

/** El idioma de la tienda traducido al código que esperan las voces del sistema. */
const VOCES: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  pt: 'pt-PT',
  zh: 'zh-CN',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  nl: 'nl-NL',
};

/**
 * La voz del asistente, con la síntesis del PROPIO navegador.
 *
 * <p>Ni servicio de pago ni audio viajando a ningún servidor: la genera el dispositivo. Dado lo que el
 * asistente cuenta —pedidos, importes—, que no salga de ahí no es un detalle menor.
 *
 * <p>Todo va dentro de un `try`: al prerenderizar no existe `speechSynthesis`, y un navegador que se
 * niegue a hablar no puede tumbar la página. Sin voz el asistente sigue funcionando — es un extra, no
 * el canal principal.
 */
@Injectable()
export class VozNavegadorAdapter implements VozPort {
  private readonly enElNavegador = esNavegador();

  disponible(): boolean {
    return this.enElNavegador && typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  habla(texto: string, idioma: string): void {
    if (!this.disponible() || !texto.trim()) {
      return;
    }
    try {
      // Antes de hablar calla lo anterior: encadenar locuciones deja al asistente contando algo que ya
      // no está en pantalla, que es peor que no hablar.
      this.calla();
      const frase = new SpeechSynthesisUtterance(texto);
      frase.lang = VOCES[idioma] ?? 'es-ES';
      frase.rate = 1.02;
      frase.pitch = 1.15; // Ligeramente agudo: suena a ayudante, no a locutor de aeropuerto.
      const propia = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang.startsWith(frase.lang.slice(0, 2)));
      if (propia) {
        frase.voice = propia;
      }
      window.speechSynthesis.speak(frase);
    } catch {
      /* Sin voz el asistente sigue funcionando. */
    }
  }

  calla(): void {
    if (!this.disponible()) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* Un navegador que se niegue a callar no puede tumbar la página. */
    }
  }
}
