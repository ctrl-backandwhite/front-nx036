import { Component, computed, input, model, signal } from '@angular/core';
import { DIAL_CODES } from '@shared/data/dial-codes';
import { banderaDePais, nombreDePais } from '../pais/paises';

/** Cuando el valor viene vacío o irreconocible se parte de España, que es el mercado principal. */
const PAIS_POR_DEFECTO = 'ES';

/** Los prefijos ordenados por nombre de país, que es como se buscan en un desplegable. */
const PREFIJOS_ORDENADOS = [...DIAL_CODES].sort((a, b) =>
  nombreDePais(a.code).localeCompare(nombreDePais(b.code)),
);

/**
 * Descompone un E.164 («+34600123456») en país y número nacional.
 *
 * <p>Varios países comparten prefijo —el «+1» lo usan una veintena—, así que se elige el prefijo MÁS
 * LARGO que encaje y, entre los que comparten ese prefijo, el primero del catálogo.
 */
export function partePrefijo(valor: string): { codigo: string; numero: string } {
  const limpio = (valor ?? '').replace(/[^\d+]/g, '');
  if (limpio.startsWith('+')) {
    const porLongitud = [...DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length);
    const encaja = porLongitud.find((d) => limpio.startsWith(d.dial));
    if (encaja) {
      return { codigo: encaja.code, numero: limpio.slice(encaja.dial.length) };
    }
  }
  return { codigo: PAIS_POR_DEFECTO, numero: limpio.replace(/^\+/, '') };
}

function prefijoDe(codigo: string): string {
  return DIAL_CODES.find((d) => d.code === codigo)?.dial ?? '';
}

/**
 * El teléfono: prefijo internacional con bandera, más el número nacional.
 *
 * <p>Lo que sale es siempre E.164 («+34600123456»), que es lo único que aceptan el transportista y la
 * pasarela de pago. Lo que se ve, en cambio, está partido en dos, porque nadie escribe su teléfono con
 * el prefijo pegado.
 */
@Component({
  selector: 'nx-telefono',
  template: `
    <div [class]="'flex items-stretch gap-2 ' + clase()">
      <!--
        Prefijo PEQUEÑO: lo justo para la bandera y el código («🇪🇸 +34»), que es lo único que hay que
        leer ahí. El ancho va en estilo directo porque las clases «.input» y «.select» fuerzan el ancho
        completo y taparían cualquier utilidad de anchura. El número se queda con el resto, que es donde
        se escribe.
      -->
      <select
        [value]="codigo()"
        (change)="cambiaPrefijo($event)"
        class="input shrink-0"
        [style.width.rem]="6.25"
        [attr.aria-label]="etiquetaPrefijo()"
      >
        @for (prefijo of prefijos; track prefijo.code) {
          <option [value]="prefijo.code" [selected]="prefijo.code === codigo()">
            {{ bandera(prefijo.code) }} {{ prefijo.dial }}
          </option>
        }
      </select>
      <!--
        El número solo llevaba «placeholder», que NO es un nombre accesible: un lector de pantalla
        anunciaba «cuadro de edición» sin decir de qué, y el texto de ayuda desaparece al escribir.
      -->
      <input
        type="tel"
        inputmode="tel"
        [value]="numero()"
        (input)="cambiaNumero($event)"
        class="input flex-1 min-w-0"
        [attr.aria-label]="etiquetaNumero()"
        placeholder="600123456"
      />
    </div>
  `,
})
export class Telefono {
  /** El valor completo en E.164. Vacío mientras no haya número: un prefijo suelto no es un teléfono. */
  readonly valor = model('');
  readonly clase = input('');
  /** Rótulo accesible del selector de prefijo. Quien monta el formulario puede traducirlo. */
  readonly etiquetaPrefijo = input('Prefijo');
  /** Rótulo accesible del número nacional. */
  readonly etiquetaNumero = input('Teléfono');

  protected readonly prefijos = PREFIJOS_ORDENADOS;
  protected readonly bandera = banderaDePais;

  /**
   * El país elegido se deriva del valor, pero se guarda aparte: si dependiera solo del E.164, al
   * quedarse el número vacío el prefijo elegido se perdería y volvería al de por defecto delante de
   * quien está escribiendo.
   */
  private readonly codigoElegido = signal<string | null>(null);

  protected readonly codigo = computed(
    () => this.codigoElegido() ?? partePrefijo(this.valor()).codigo,
  );
  protected readonly numero = computed(() => partePrefijo(this.valor()).numero);

  protected cambiaPrefijo(evento: Event): void {
    this.actualiza((evento.target as HTMLSelectElement).value, this.numero());
  }

  protected cambiaNumero(evento: Event): void {
    this.actualiza(this.codigo(), (evento.target as HTMLInputElement).value);
  }

  private actualiza(codigo: string, numero: string): void {
    const digitos = numero.replace(/\D/g, '');
    this.codigoElegido.set(codigo);
    this.valor.set(digitos ? `${prefijoDe(codigo)}${digitos}` : '');
  }
}
