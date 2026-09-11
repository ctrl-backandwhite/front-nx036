import { Injectable, computed, signal } from '@angular/core';
import {
  CategoriasAceptadas,
  NADA_ACEPTADO,
  RegimenDeCookies,
  claveDelAviso,
} from './regimen-de-cookies';

/**
 * Lo que se sabe del consentimiento de cookies, como estado reactivo.
 *
 * <p>El almacén SOLO GUARDA: no lee el navegador, no persiste nada y no decide nada que no sea derivar
 * de lo que ya tiene. Quien provoca efectos —leer lo guardado, escribirlo, borrarlo— es el caso de uso.
 * Esa separación es la que permite probar las reglas del consentimiento sin tocar el almacenamiento.
 */
@Injectable()
export class ConsentimientoDeCookiesStore {
  /** ¿Ya se ha decidido? Mientras sea falso, el aviso está en pantalla y no hay nada encendido. */
  private readonly _decidido = signal(false);
  /**
   * ¿Se ha MIRADO ya lo que había guardado?
   *
   * <p>Es distinto de «no ha decidido». Al arrancar no se sabe ni una cosa ni la otra, y dar por hecho
   * que no hay decisión hacía que el aviso se pintara en TODAS las cargas para desaparecer un instante
   * después, cuando la lectura del navegador llegaba. Quien navega lo veía aparecer y desaparecer
   * página tras página aunque lo hubiera aceptado hace días.
   *
   * <p>En las páginas prerenderizadas es peor todavía: su HTML se genera sin poder leer nada, así que
   * el aviso viene incrustado en el fichero y se queda a la vista hasta que hidrata.
   */
  private readonly _resuelto = signal(false);
  private readonly _categorias = signal<CategoriasAceptadas>(NADA_ACEPTADO);
  private readonly _regimen = signal<RegimenDeCookies>('default');
  private readonly _pais = signal('');
  /** El panel de «personalizar» está abierto. */
  private readonly _panelAbierto = signal(false);

  readonly decidido = this._decidido.asReadonly();
  readonly resuelto = this._resuelto.asReadonly();
  readonly categorias = this._categorias.asReadonly();
  readonly regimen = this._regimen.asReadonly();
  readonly pais = this._pais.asReadonly();
  readonly panelAbierto = this._panelAbierto.asReadonly();

  /** El texto del aviso depende del régimen, y solo de él. */
  readonly claveDelTexto = computed(() => claveDelAviso(this._regimen()));

  /**
   * Se enseña algo mientras no se haya decidido, o mientras el panel esté abierto.
   *
   * <p>Pero NUNCA antes de haber mirado lo guardado: enseñar el aviso mientras se averigua si hace
   * falta es lo que lo hacía parpadear en cada página. El panel abierto sí manda siempre, porque a ese
   * lo abre quien navega a propósito.
   */
  readonly visible = computed(
    () => this._panelAbierto() || (this._resuelto() && !this._decidido()),
  );

  fijaRegimen(pais: string, regimen: RegimenDeCookies): void {
    this._pais.set(pais);
    this._regimen.set(regimen);
  }

  /** Guarda la decisión tomada. Cerrar el panel es parte de haber decidido. */
  decide(categorias: CategoriasAceptadas): void {
    this._categorias.set(categorias);
    this._decidido.set(true);
    this._resuelto.set(true);
    this._panelAbierto.set(false);
  }

  /** Vuelve al estado de «sin decidir»: ni una categoría encendida, ni el panel abierto. */
  /**
   * No hay nada guardado: hay que preguntar.
   *
   * <p>Marca el asunto como RESUELTO aunque no haya decisión, que es justo lo que faltaba: se ha
   * mirado y no había nada. Sin esto, distinguir «todavía no lo sé» de «sé que no hay» sería imposible
   * y el aviso no llegaría a salir nunca para quien entra por primera vez.
   */
  olvida(): void {
    this._categorias.set(NADA_ACEPTADO);
    this._decidido.set(false);
    this._panelAbierto.set(false);
    this._resuelto.set(true);
  }

  abrePanel(): void {
    this._panelAbierto.set(true);
  }

  cierraPanel(): void {
    this._panelAbierto.set(false);
  }

  /**
   * ¿Se puede cargar algo de esta categoría?
   *
   * <p>Es la pregunta que tiene que hacerse cualquier script de terceros ANTES de cargarse. Devuelve
   * falso mientras no se haya decidido, viva quien viva donde viva: la versión anterior encendía la
   * analítica de entrada en los regímenes de oposición, y bastaba una detección de país fallida —que
   * es lo habitual— para cargarla sin consentimiento a alguien en Europa.
   */
  permite(categoria: keyof CategoriasAceptadas): boolean {
    return this._decidido() && this._categorias()[categoria];
  }
}
