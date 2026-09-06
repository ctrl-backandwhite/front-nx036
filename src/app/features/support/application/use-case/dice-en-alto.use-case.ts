import { Service, inject } from '@angular/core';
import { VOZ_PORT } from '../../domain/port/voz.port';
import { QueDecir } from '../../domain/model/asistente';

/**
 * Leer en alto lo que el asistente acaba de poner en pantalla.
 *
 * <p>Cada cosa se dice UNA vez. Sin esto, cualquier repintado —cambiar de página, mover el asistente—
 * volvía a soltar la misma frase, que es la forma más rápida de que alguien apague la voz para siempre.
 * Para volver a oírla está el botón de repetir, que fuerza la locución saltándose ese recuerdo.
 */
@Service()
export class DiceEnAlto {
  private readonly voz = inject(VOZ_PORT);

  /** Lo último que ya se dijo. */
  private ultimo: string | null = null;

  hayVoz(): boolean {
    return this.voz.disponible();
  }

  /**
   * @param traduce cómo convertir una clave en texto: el caso de uso no sabe de idiomas.
   * @param insiste `true` cuando lo pide quien mira (botón de repetir) y hay que decirlo aunque ya se
   *   haya dicho.
   */
  ejecuta(
    que: QueDecir | null,
    idioma: string,
    traduce: (clave: string) => string,
    insiste = false,
  ): void {
    if (!que) {
      return;
    }
    const titular = traduce(que.clave);
    const frase = que.productos?.length ? `${titular}. ${que.productos.join('. ')}` : titular;
    if (!insiste && frase === this.ultimo) {
      return;
    }
    this.ultimo = frase;
    this.voz.habla(frase, idioma);
  }

  /** Al apagar la voz o al irse de la página: una voz que sigue contando algo que ya no está molesta. */
  calla(): void {
    this.voz.calla();
  }

  /** Olvida lo dicho para que la misma frase se pueda volver a decir en otro contexto. */
  olvida(): void {
    this.ultimo = null;
  }
}
