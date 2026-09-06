import { Service, inject } from '@angular/core';
import { ASISTENTE_PORT } from '../../domain/port/asistente.port';
import { claveDelAviso, turnoDelAsistente } from '../../domain/model/conversacion';
import { ConversacionStore } from '../state/conversacion.store';

/** Lo que la pantalla necesita saber después de preguntar, para decidir si actualiza el catálogo. */
export interface ResultadoDeLaPregunta {
  readonly busqueda: { readonly consulta: string; readonly total: number } | null;
}

/**
 * Preguntarle algo al asistente y apuntar los dos turnos.
 *
 * <p>El turno de quien pregunta se apunta ANTES de llamar: ver lo escrito en pantalla mientras se
 * espera es lo que hace que la espera se entienda.
 *
 * <p>El aviso de «no puedo contestar» se resuelve con una función del dominio que elige la clave, y la
 * traduce quien llama. Distinguir «cupo agotado» de «apagado» importa: lo primero se arregla esperando
 * y lo segundo no.
 */
@Service()
export class PreguntaAlAsistente {
  private readonly asistente = inject(ASISTENTE_PORT);
  private readonly conversacion = inject(ConversacionStore);

  /**
   * @param traduce cómo convertir una clave en texto. Se pasa desde fuera para que este caso de uso no
   *   sepa de idiomas y se pueda probar sin montar el servicio de traducción.
   */
  async ejecuta(
    mensaje: string,
    idioma: string,
    traduce: (clave: string) => string,
  ): Promise<ResultadoDeLaPregunta> {
    const texto = mensaje.trim();
    if (!texto || this.conversacion.enviando()) {
      return { busqueda: null };
    }
    this.conversacion.anade({ de: 'yo', texto });
    this.conversacion.marcaEnviando(true);
    try {
      const resultado = await this.asistente.pregunta(
        texto,
        this.conversacion.idConversacion(),
        idioma,
      );
      if (!resultado.ok) {
        // Un fallo de red se cuenta como lo que es: el asistente no está, no que no sepa contestar.
        this.conversacion.anade({ de: 'asistente', texto: traduce('chat.unavailable') });
        return { busqueda: null };
      }
      const respuesta = resultado.valor;
      this.conversacion.recuerdaLaConversacion(respuesta.idConversacion);
      this.conversacion.anade(turnoDelAsistente(respuesta, traduce(claveDelAviso(respuesta.motivo))));
      return { busqueda: respuesta.busqueda ?? null };
    } finally {
      this.conversacion.marcaEnviando(false);
    }
  }
}
