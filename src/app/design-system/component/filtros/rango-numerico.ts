import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FieldTree, FormField, form, min, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';

/** Lo que sale del par de campos cuando se termina de escribir. Vacío quiere decir «sin poner». */
export interface RangoPublicado {
  readonly minimo: string;
  readonly maximo: string;
}

/**
 * Los dos extremos tal y como los maneja el formulario: dos números que SIEMPRE existen.
 *
 * <p>Quien monta este componente los guarda como texto —así viajan en la dirección del navegador y así
 * los espera el backend—, pero Signal Forms construye un campo por cada clave que EXISTE en el objeto:
 * si el extremo sin poner no tuviera clave, la plantilla se quedaría sin nada a lo que atarse. Aquí las
 * dos están siempre, con el nulo como «sin poner».
 */
interface Extremos {
  readonly minimo: number | null;
  readonly maximo: number | null;
}

/** El texto que llega, como número para el campo. Lo que no sea un número es «sin poner». */
function aNumero(texto: string): number | null {
  const valor = Number(texto);
  return texto ? (Number.isFinite(valor) ? valor : null) : null;
}

/** Y al revés, para devolverlo: sin valor se devuelve vacío, que es lo que significa «sin filtro». */
function aTexto(valor: number | null): string {
  return valor === null ? '' : String(valor);
}

/**
 * Un rango numérico con forma de pastilla: dos campos, un guión en medio y un solo rótulo.
 *
 * <p>Estaba escrito A MANO dentro de la barra de filtros del catálogo —la pastilla, los dos campos, las
 * dos etiquetas para lectores de pantalla, las reglas y el aviso—, y el panel resolvía lo mismo con dos
 * filtros numéricos sueltos rotulados «≥» y «≤», sin ninguna de las reglas. Así que una de las dos
 * pantallas avisaba de que el mínimo iba por encima del máximo y la otra devolvía la lista vacía sin
 * explicar por qué.
 *
 * <p>El valor sube al SALIR del campo, no en cada tecleada. No es estilo: quien lo monta lleva el
 * criterio a la dirección del navegador, así que publicarlo por dígito sería una navegación —y una
 * búsqueda entera— por cada tecla.
 */
@Component({
  selector: 'nx-rango-numerico',
  imports: [FormField],
  template: `
    <!-- El envoltorio solo existe para poder colgar el aviso DEBAJO de la pastilla: dentro de ella se
         metería entre el mínimo y el máximo. -->
    <div>
      <div
        class="inline-flex items-center gap-1.5 text-[12px] rounded-full border border-ink-200 bg-white px-2 py-0.5"
      >
        <span class="text-ink-500 pl-1">{{ etiqueta() }}:</span>
        <input
          type="number"
          inputmode="decimal"
          class="w-14 px-1 py-1 min-h-11 sm:min-h-0 text-[12px] focus:outline-none bg-transparent"
          [placeholder]="marcadorMinimo()"
          [attr.aria-label]="etiqueta() + ' ' + (marcadorMinimo() || t('filters.min'))"
          [formField]="formulario.minimo"
          (change)="publica()"
        />
        <span aria-hidden="true" class="text-ink-300">–</span>
        <input
          type="number"
          inputmode="decimal"
          class="w-14 px-1 py-1 min-h-11 sm:min-h-0 text-[12px] focus:outline-none bg-transparent"
          [placeholder]="marcadorMaximo()"
          [attr.aria-label]="etiqueta() + ' ' + (marcadorMaximo() || t('filters.max'))"
          [formField]="formulario.maximo"
          (change)="publica()"
        />
      </div>
      @if (fallo(); as mensaje) {
        <span role="alert" class="text-xs text-error mt-1 block">{{ mensaje }}</span>
      }
    </div>
  `,
})
export class RangoNumerico {
  readonly etiqueta = input.required<string>();
  readonly minimo = input('');
  readonly maximo = input('');
  readonly marcadorMinimo = input('');
  readonly marcadorMaximo = input('');

  readonly cambiado = output<RangoPublicado>();

  protected readonly t = inject(TraduccionService).t;

  /**
   * Se DERIVA de lo que llega, así que «limpiar filtros» o un enlace compartido vacían los campos
   * solos, sin sincronizar nada a mano.
   */
  private readonly extremos = linkedSignal<Extremos>(() => ({
    minimo: aNumero(this.minimo()),
    maximo: aNumero(this.maximo()),
  }));

  /**
   * Las dos reglas del rango, declaradas en vez de repartidas.
   *
   * <p>Un número negativo no existe en ninguno de los dos usos —precios y recuentos— y solo devolvería
   * la lista entera. Y un mínimo por encima del máximo no devuelve NADA: la lista se queda en blanco y
   * quien busca no entiende por qué.
   */
  protected readonly formulario = form(this.extremos, (ruta) => {
    min(ruta.minimo, 0, { message: () => this.t('dialog.field.min') });
    min(ruta.maximo, 0, { message: () => this.t('dialog.field.min') });
    validate(ruta, ({ value }) => {
      const { minimo, maximo } = value();
      return minimo !== null && maximo !== null && minimo > maximo
        ? { kind: 'rango-invertido', message: this.t('dialog.field.range') }
        : null;
    });
  });

  /**
   * Un solo aviso para el par: son un rango, y dos mensajes idénticos seguidos no dicen más que uno.
   *
   * <p>Se mira PRIMERO la raíz, y no es un detalle. La regla del rango invertido se declara sobre el
   * objeto entero —necesita los dos extremos a la vez—, así que su error vive en la raíz y no en
   * ninguno de los dos campos. El código del que sale esto solo preguntaba a los campos, de modo que
   * «el final va antes que el principio» no llegó a verse nunca: se escribió el mensaje, se tradujo a
   * los ocho idiomas y no había manera de que apareciera.
   */
  protected readonly fallo = computed(
    () =>
      this.falloDe(this.formulario) ??
      this.falloDe(this.formulario.minimo) ??
      this.falloDe(this.formulario.maximo),
  );

  /**
   * El mensaje que toca enseñar bajo el par de campos, o nulo. Se calla hasta que el campo se ha
   * TOCADO: pintar de rojo un filtro recién abierto acusa a quien todavía no ha escrito nada.
   */
  private falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  protected publica(): void {
    const { minimo, maximo } = this.extremos();
    this.cambiado.emit({ minimo: aTexto(minimo), maximo: aTexto(maximo) });
  }
}
