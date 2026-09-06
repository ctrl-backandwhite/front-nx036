import { Injectable, inject } from '@angular/core';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import {
  CLAVE_DEL_CONSENTIMIENTO,
  CategoriasAceptadas,
  NADA_ACEPTADO,
  TODO_ACEPTADO,
  escribeDecision,
  leeDecision,
  regimenPara,
} from '../../domain/model/consentimiento-de-cookies';
import { PAIS_DEL_DISPOSITIVO_PORT } from '../../domain/port/pais-del-dispositivo.port';
import { ConsentimientoDeCookiesStore } from '../state/consentimiento-de-cookies.store';

/**
 * Decidir sobre las cookies: arrancar, aceptar, rechazar, ajustar y retirar.
 *
 * <p>Aquí es donde se producen los EFECTOS —leer lo guardado y volver a escribirlo— para que el almacén
 * se limite a guardar y las reglas se limiten a decidir. La pantalla llama a estos métodos y no sabe
 * que detrás hay almacenamiento del navegador.
 */
@Injectable()
export class DecideSobreCookies {
  private readonly almacen = inject(ALMACEN_LOCAL);
  private readonly paisDelDispositivo = inject(PAIS_DEL_DISPOSITIVO_PORT);
  private readonly estado = inject(ConsentimientoDeCookiesStore);

  /**
   * Arranque: qué régimen aplica y si ya había una decisión tomada.
   *
   * <p>El país del PERFIL manda sobre el del equipo. Quien tiene cuenta ya nos ha dicho dónde está, y
   * ese dato es más fiable que deducirlo del idioma del navegador.
   *
   * <p>Si no hay decisión guardada NO se enciende nada. Es el punto del que se aprendió: el régimen
   * decide el texto, nunca las categorías.
   */
  arranca(paisDelPerfil?: string | null): void {
    const pais = (paisDelPerfil || this.paisDelDispositivo.codigo() || '').toUpperCase();
    this.estado.fijaRegimen(pais, regimenPara(pais));

    const guardada = leeDecision(this.almacen.lee(CLAVE_DEL_CONSENTIMIENTO));
    if (guardada) {
      this.estado.decide(guardada);
    } else {
      this.estado.olvida();
    }
  }

  aceptaTodo(): void {
    this.guarda(TODO_ACEPTADO);
  }

  rechazaTodo(): void {
    this.guarda(NADA_ACEPTADO);
  }

  guarda(categorias: CategoriasAceptadas): void {
    this.almacen.guarda(CLAVE_DEL_CONSENTIMIENTO, escribeDecision(categorias, new Date()));
    this.estado.decide(categorias);
  }

  /**
   * Retirar el consentimiento.
   *
   * <p>Retirarlo tiene que ser tan fácil como darlo (art. 7.3 del RGPD), así que esto BORRA de verdad la
   * decisión guardada en lugar de limitarse a reabrir el panel. Si quien lo abre lo cierra sin elegir,
   * no puede quedarse en pie el «acepto todo» de antes: se vuelve a preguntar.
   */
  retira(): void {
    this.almacen.borra(CLAVE_DEL_CONSENTIMIENTO);
    this.estado.olvida();
  }
}
