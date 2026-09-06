import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { ASISTENTE_PORT, AsistentePort } from '../../domain/port/asistente.port';
import {
  MEMORIA_DE_SESION_PORT,
  MemoriaDeSesionPort,
} from '../../domain/port/memoria-de-sesion.port';
import { ConversacionStore } from '../state/conversacion.store';
import { PreguntaAlAsistente } from './pregunta-al-asistente.use-case';

/** Traducción de mentira: devuelve la clave, que es justo lo que hace la de verdad si falta el texto. */
const traduce = (clave: string): string => clave;

function memoriaDeMentira(): MemoriaDeSesionPort {
  const datos = new Map<string, string>();
  return {
    lee: (clave) => datos.get(clave) ?? null,
    guarda: (clave, valor) => void datos.set(clave, valor),
  };
}

describe('PreguntaAlAsistente', () => {
  let puerto: AsistentePort;
  let conversacion: ConversacionStore;

  beforeEach(() => {
    puerto = {
      pregunta: vi.fn().mockResolvedValue(
        exito({
          idConversacion: 'c-1',
          texto: 'Aquí tienes.',
          productos: [],
          degradada: false,
        }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        AlmacenMemoriaAdapter,
        { provide: ALMACEN_LOCAL, useExisting: AlmacenMemoriaAdapter },
        { provide: MEMORIA_DE_SESION_PORT, useValue: memoriaDeMentira() },
        { provide: ASISTENTE_PORT, useValue: puerto },
      ],
    });
    conversacion = TestBed.inject(ConversacionStore);
  });

  it('apunta los dos turnos y recuerda la conversación', async () => {
    await TestBed.inject(PreguntaAlAsistente).ejecuta('¿tenéis calcetines?', 'es', traduce);

    expect(conversacion.turnos()).toEqual([
      // Cada turno lleva identificador propio: seguir la lista por su posición obliga a repintar
      // todas las burbujas —y sus imágenes— con cada respuesta.
      { id: 't1', de: 'yo', texto: '¿tenéis calcetines?' },
      { id: 't2', de: 'asistente', texto: 'Aquí tienes.', productos: [] },
    ]);
    expect(conversacion.idConversacion()).toBe('c-1');
  });

  it('el turno de quien pregunta se apunta ANTES de llamar: la espera se entiende', async () => {
    let turnosDurante = 0;
    vi.mocked(puerto.pregunta).mockImplementation(async () => {
      turnosDurante = conversacion.turnos().length;
      return exito({ idConversacion: 'c-1', texto: 'ya', productos: [], degradada: false });
    });

    await TestBed.inject(PreguntaAlAsistente).ejecuta('hola', 'es', traduce);

    expect(turnosDurante).toBe(1);
  });

  it('distingue el cupo agotado del motor apagado', async () => {
    vi.mocked(puerto.pregunta).mockResolvedValue(
      exito({
        idConversacion: 'c-1',
        texto: null,
        productos: [],
        degradada: false,
        motivo: 'QUOTA',
      }),
    );

    await TestBed.inject(PreguntaAlAsistente).ejecuta('hola', 'es', traduce);

    expect(conversacion.turnos()[1].texto).toBe('chat.quota');
  });

  it('un fallo de red se cuenta como que el asistente no está', async () => {
    vi.mocked(puerto.pregunta).mockResolvedValue(fallo(creaError('sin-conexion')));

    const resultado = await TestBed.inject(PreguntaAlAsistente).ejecuta('hola', 'es', traduce);

    expect(conversacion.turnos()[1].texto).toBe('chat.unavailable');
    expect(resultado.busqueda).toBeNull();
    expect(conversacion.enviando()).toBe(false);
  });

  it('devuelve la búsqueda para que la pantalla decida si actualiza el catálogo', async () => {
    vi.mocked(puerto.pregunta).mockResolvedValue(
      exito({
        idConversacion: 'c-1',
        texto: 'Mira',
        productos: [],
        degradada: false,
        busqueda: { consulta: 'calcetines', total: 12 },
      }),
    );

    const resultado = await TestBed.inject(PreguntaAlAsistente).ejecuta('calcetines', 'es', traduce);

    expect(resultado.busqueda).toEqual({ consulta: 'calcetines', total: 12 });
  });

  it('un mensaje en blanco no llega al backend', async () => {
    await TestBed.inject(PreguntaAlAsistente).ejecuta('   ', 'es', traduce);

    expect(puerto.pregunta).not.toHaveBeenCalled();
    expect(conversacion.turnos()).toHaveLength(0);
  });
});
