import { Service, computed, inject, signal } from '@angular/core';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import {
  EstadoDelAsistente,
  POSICION_INICIAL,
  PosicionDelAsistente,
} from '../../domain/model/asistente';

const CLAVE_ESTADO = 'nx036.avatar.state';
const CLAVE_POSICION = 'nx036.avatar.pos';
const CLAVE_VOZ = 'nx036.avatar.voice';
/** La misma marca que usaba la guía cuando se abría sola: quien ya la vio no la vuelve a ver. */
const CLAVE_GUIA = 'nx036.welcome.v1';
/** Se presenta una sola vez, la primera. Un acompañante que se presenta cada visita cansa. */
const CLAVE_SALUDO = 'nx036.avatar.greeted';

/** Los valores guardados llegan del equipo de quien mira: se comprueban antes de usarlos. */
function esEstado(valor: unknown): valor is EstadoDelAsistente {
  return valor === 'activo' || valor === 'mini' || valor === 'oculto';
}

function esPosicion(valor: unknown): valor is PosicionDelAsistente {
  return typeof valor === 'object' && valor !== null && 'derecha' in valor && 'abajo' in valor;
}

/**
 * Cómo está el asistente: activo, encogido u oculto, dónde vive y si habla.
 *
 * <p>Vive en un almacén y no dentro del componente porque el menú de la cuenta necesita saber si está
 * oculto para ofrecer «mostrar el asistente». Sin eso, ocultarlo sería una puerta sin retorno.
 *
 * <p>Solo GUARDA, con una excepción deliberada: escribe en el equipo de quien mira, porque estas
 * preferencias tienen que sobrevivir a la recarga y no hay ningún backend detrás. Lo hace a través del
 * puerto de almacenamiento, que nunca lanza.
 *
 * <p>Lo guardado se lee con `hidrata()`, que se llama DESPUÉS del primer pintado y nunca durante: al
 * prerenderizar no hay almacenamiento, y lo que se pinte allí tiene que coincidir con lo que pinta el
 * navegador o Angular tira el HTML recibido y vuelve a montar la página.
 */
@Service()
export class AvatarStore {
  private readonly almacen = inject(ALMACEN_LOCAL);

  private readonly _estado = signal<EstadoDelAsistente>('activo');
  private readonly _posicion = signal<PosicionDelAsistente>(POSICION_INICIAL);
  private readonly _voz = signal(false);
  private readonly _guiaPendiente = signal(false);
  private readonly _guiaAbierta = signal(false);
  private readonly _saludando = signal(false);

  readonly estado = this._estado.asReadonly();
  readonly posicion = this._posicion.asReadonly();
  /** Si lee en alto. Apagada por defecto: nadie quiere que una tienda le hable sin pedirlo. */
  readonly voz = this._voz.asReadonly();
  readonly guiaPendiente = this._guiaPendiente.asReadonly();
  readonly guiaAbierta = this._guiaAbierta.asReadonly();
  readonly saludando = this._saludando.asReadonly();

  readonly visible = computed(() => this._estado() !== 'oculto');

  hidrata(): void {
    this._estado.set(this.leeValidado(CLAVE_ESTADO, esEstado) ?? 'activo');
    this._posicion.set(this.leeValidado(CLAVE_POSICION, esPosicion) ?? POSICION_INICIAL);
    this._voz.set(this.leeValidado(CLAVE_VOZ, (v): v is boolean => typeof v === 'boolean') ?? false);
    // Sin almacenamiento no se ofrece la guía ni se saluda: mejor callar que repetirlo en cada página.
    this._guiaPendiente.set(this.almacen.lee(CLAVE_GUIA) === null);
    if (this.almacen.lee(CLAVE_SALUDO) === null) {
      this._saludando.set(true);
      this.almacen.guarda(CLAVE_SALUDO, '1');
    }
  }

  cambiaEstado(estado: EstadoDelAsistente): void {
    this._estado.set(estado);
    this.almacen.guarda(CLAVE_ESTADO, JSON.stringify(estado));
  }

  /** Mientras se arrastra NO se guarda: serían decenas de escrituras por gesto. */
  mueve(posicion: PosicionDelAsistente): void {
    this._posicion.set(posicion);
  }

  guardaLaPosicion(): void {
    this.almacen.guarda(CLAVE_POSICION, JSON.stringify(this._posicion()));
  }

  /** @returns si la voz queda encendida, que es lo que decide si se dice la frase de prueba. */
  alternaLaVoz(): boolean {
    const voz = !this._voz();
    this._voz.set(voz);
    this.almacen.guarda(CLAVE_VOZ, JSON.stringify(voz));
    return voz;
  }

  dejaDeSaludar(): void {
    this._saludando.set(false);
  }

  abreLaGuia(): void {
    this._guiaAbierta.set(true);
  }

  /** Al cerrarla queda vista: la propia guía escribe la marca, aquí solo se refleja. */
  cierraLaGuia(): void {
    this._guiaAbierta.set(false);
    this._guiaPendiente.set(false);
  }

  /** «Ahora no»: no se abre, pero tampoco se vuelve a ofrecer en esta visita. */
  descartaLaGuia(): void {
    this._guiaPendiente.set(false);
  }

  private leeValidado<T>(clave: string, valido: (valor: unknown) => valor is T): T | null {
    const crudo = this.almacen.lee(clave);
    if (!crudo) {
      return null;
    }
    try {
      const valor: unknown = JSON.parse(crudo);
      return valido(valor) ? valor : null;
    } catch {
      // Un valor manipulado a mano no puede tumbar el asistente: se descarta y se usa el de partida.
      return null;
    }
  }
}
