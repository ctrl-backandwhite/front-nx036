import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  HILO_DE_TICKET_PORT,
  MIS_TICKETS_PORT,
  TICKETS_DE_SOPORTE_PORT,
} from './domain/port/tickets.port';
import { TicketsHttpAdapter } from './infrastructure/tickets-http.adapter';
import { ASISTENTE_PORT, SUGERENCIAS_DE_CESTA_PORT } from './domain/port/asistente.port';
import { AsistenteHttpAdapter } from './infrastructure/asistente-http.adapter';
import { CONTACTO_PORT } from './domain/port/contacto.port';
import { ContactoHttpAdapter } from './infrastructure/contacto-http.adapter';
import { VOZ_PORT } from './domain/port/voz.port';
import { VozNavegadorAdapter } from './infrastructure/voz-navegador.adapter';
import { MEMORIA_DE_SESION_PORT } from './domain/port/memoria-de-sesion.port';
import { MemoriaDeSesionAdapter } from './infrastructure/memoria-de-sesion.adapter';
import { QUIEN_ESCRIBE_PORT } from './domain/port/quien-escribe.port';
import { QuienEscribeHttpAdapter } from './infrastructure/quien-escribe-http.adapter';

/**
 * Ata los puertos de «support» con sus adaptadores.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura. Todo lo demás —casos de
 * uso, estado, pantallas— solo conoce las interfaces, así que cambiar el motor del asistente, o poner
 * una voz de mentira en una prueba, es cambiar estas líneas y nada más.
 */
export function proveeSupport(): EnvironmentProviders {
  return makeEnvironmentProviders([
    TicketsHttpAdapter,
    { provide: MIS_TICKETS_PORT, useFactory: () => inject(TicketsHttpAdapter) },
    { provide: TICKETS_DE_SOPORTE_PORT, useFactory: () => inject(TicketsHttpAdapter) },
    { provide: HILO_DE_TICKET_PORT, useFactory: () => inject(TicketsHttpAdapter) },

    AsistenteHttpAdapter,
    { provide: ASISTENTE_PORT, useFactory: () => inject(AsistenteHttpAdapter) },
    { provide: SUGERENCIAS_DE_CESTA_PORT, useFactory: () => inject(AsistenteHttpAdapter) },

    ContactoHttpAdapter,
    { provide: CONTACTO_PORT, useFactory: () => inject(ContactoHttpAdapter) },

    VozNavegadorAdapter,
    { provide: VOZ_PORT, useFactory: () => inject(VozNavegadorAdapter) },

    MemoriaDeSesionAdapter,
    { provide: MEMORIA_DE_SESION_PORT, useFactory: () => inject(MemoriaDeSesionAdapter) },

    QuienEscribeHttpAdapter,
    { provide: QUIEN_ESCRIBE_PORT, useFactory: () => inject(QuienEscribeHttpAdapter) },
  ]);
}
