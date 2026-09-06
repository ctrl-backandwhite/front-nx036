import { Injectable, computed, inject, signal } from '@angular/core';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { MEMORIA_DE_SESION_PORT } from '../../domain/port/memoria-de-sesion.port';
import { Turno } from '../../domain/model/conversacion';

/** La conversación sobrevive a cambiar de página y a recargar, pero no a cerrar la pestaña. */
const CLAVE_CONVERSACION = 'nx036.chat.conversation';
/** El tamaño elegido sí se recuerda entre visitas: es una preferencia, no un dato de la charla. */
const CLAVE_TAMANO = 'nx036.chat.size';

export type TamanoDelChat = 'sm' | 'md' | 'lg';

/**
 * Alto y ancho de cada tamaño. El ancho nunca supera el hueco de la ventana —eso lo pone la clase
 * `max-w` de la plantilla—, para que en un móvil el panel no se salga ni tape el catálogo entero. De
 * hecho, en el móvil el ancho lo manda la pantalla: los tres tamaños se notan sobre todo en el ALTO,
 * que es lo que de verdad cambia cuánto se lee de una vez.
 */
export const MEDIDAS: Record<TamanoDelChat, string> = {
  sm: 'h-[22rem] w-[18rem]',
  md: 'h-[30rem] w-[22rem]',
  lg: 'h-[38rem] w-[28rem]',
};

const SIGUIENTE: Record<TamanoDelChat, TamanoDelChat> = { sm: 'md', md: 'lg', lg: 'sm' };

/**
 * La conversación con el asistente y el tamaño del panel.
 *
 * <p>Solo GUARDA. Preguntar es cosa del caso de uso; aquí solo se apunta lo dicho.
 *
 * <p>Lo guardado se lee con `hidrata()`, DESPUÉS del primer pintado: al prerenderizar no hay
 * almacenamiento, y en navegación privada tocarlo lanza.
 */
@Injectable({ providedIn: 'root' })
export class ConversacionStore {
  private readonly sesion = inject(MEMORIA_DE_SESION_PORT);
  private readonly almacen = inject(ALMACEN_LOCAL);

  private readonly _turnos = signal<readonly Turno[]>([]);
  private readonly _tamano = signal<TamanoDelChat>('md');
  private readonly _enviando = signal(false);
  private readonly _id = signal<string | null>(null);
  /** Contador para el identificador de cada turno: solo tiene que ser estable dentro de la charla. */
  private siguienteTurno = 1;

  readonly turnos = this._turnos.asReadonly();
  readonly tamano = this._tamano.asReadonly();
  readonly enviando = this._enviando.asReadonly();
  readonly idConversacion = this._id.asReadonly();

  readonly medida = computed(() => MEDIDAS[this._tamano()]);

  hidrata(): void {
    const guardado = this.almacen.lee(CLAVE_TAMANO);
    if (guardado === 'sm' || guardado === 'md' || guardado === 'lg') {
      this._tamano.set(guardado);
    }
    this._id.set(this.sesion.lee(CLAVE_CONVERSACION));
  }

  anade(turno: Omit<Turno, 'id'>): Turno {
    const conId: Turno = { ...turno, id: `t${this.siguienteTurno++}` };
    this._turnos.update((lista) => [...lista, conId]);
    return conId;
  }

  marcaEnviando(enviando: boolean): void {
    this._enviando.set(enviando);
  }

  recuerdaLaConversacion(id: string): void {
    this._id.set(id);
    this.sesion.guarda(CLAVE_CONVERSACION, id);
  }

  /** Un solo botón que rota entre los tres tamaños: tres botones para esto serían dos de más. */
  cambiaDeTamano(): void {
    const nuevo = SIGUIENTE[this._tamano()];
    this._tamano.set(nuevo);
    this.almacen.guarda(CLAVE_TAMANO, nuevo);
  }
}
