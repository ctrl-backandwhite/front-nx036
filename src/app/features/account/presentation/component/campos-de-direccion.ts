import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  form,
  maxLength,
  required,
  validate,
} from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CuentaStore } from '../../application/state/cuenta.store';
import { SelectorPais } from '@ds/component/pais/selector-pais';
import { SelectorProvincia } from '@ds/component/provincia/selector-provincia';
import { Telefono } from '@ds/component/telefono/telefono';
import {
  DatosDeDireccion,
  FormatoPostal,
  codigoPostalInvalido,
} from '../../domain/model/direccion';
import { AYUDA_DE_DIRECCION_PORT, Provincia } from '../../domain/port/direcciones.port';

/** Los largos que acepta el backend. Sin ellos, el rechazo llega después de pulsar «guardar». */
const LARGO_DEL_NOMBRE = 120;
const LARGO_DE_LA_LINEA = 200;
const LARGO_DE_LA_CIUDAD = 120;

/**
 * El formulario de una dirección, sin el botón de guardar.
 *
 * <p>Lo comparten la página de direcciones y la ventana emergente del perfil, que es lo que garantiza
 * que los dos sitios pidan lo mismo y lo validen igual.
 *
 * <p>Habla con el puerto de AYUDA directamente, sin caso de uso, porque solo LEE dos listas para
 * rellenarse: no orquesta nada ni cambia el estado de nadie. En cuanto tuviera que decidir algo, ese
 * algo sería un caso de uso.
 *
 * <p>El estado lo lleva Signal Forms sobre el propio `model()`: la señal del modelo ES la que viaja al
 * padre, así que la dirección sigue subiendo en cada pulsación igual que antes, pero ahora hay un sitio
 * que sabe qué campo falta y puede decirlo debajo del campo. Antes el padre repetía la comprobación por
 * su cuenta y el formulario no decía nada: quien se dejaba la ciudad veía el botón apagado sin saber
 * por qué.
 *
 * <p>Los mensajes se enseñan solo cuando el campo se ha TOCADO. La excepción es el código postal, que
 * conserva su aviso de siempre: no acusa de vacío a nadie —solo salta cuando lo escrito contradice el
 * formato del país—, y esperar al `blur` sería descubrir el fallo más tarde sin ganar nada.
 *
 * <p>Mobile first: una columna, y dos a partir de `sm`. El teléfono y las líneas de la dirección ocupan
 * la fila entera incluso en pantalla ancha, porque en media columna el número se queda tan estrecho que
 * ni cabe el texto de ejemplo.
 */
@Component({
  selector: 'nx-campos-de-direccion',
  // Un elemento propio nace en línea, y una caja en línea NO ocupa la altura de su contenido: el
  // «space-y-4» del formulario le pone el margen al hermano siguiente —la casilla de «predeterminada»—
  // medido contra la línea de texto, no contra los campos, así que el hueco valía cero y la casilla
  // salía pegada al último campo. Quinta vez que pasa en este proyecto.
  host: { class: 'block' },
  imports: [SelectorPais, SelectorProvincia, Telefono, FormField],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="sm:col-span-2">
        <input
          [class]="claseCampo()"
          [placeholder]="t('checkout.full_name') + ' *'"
          [attr.aria-label]="t('checkout.full_name')"
          [formField]="formulario.nombreCompleto"
        />
        @if (falloDe(formulario.nombreCompleto); as fallo) {
          <span role="alert" class="text-[12px] text-error mt-1 block">{{ fallo }}</span>
        }
      </div>

      <div class="sm:col-span-2">
        <!-- Prefijo internacional con bandera más el número: se guarda entero, en E.164. -->
        <!--
          El rótulo del PREFIJO se deja en el que trae el sistema de diseño: si aquí se le pusiera el
          mismo nombre que al país de la dirección, quien navega con lector de pantalla oiría dos
          desplegables llamados igual y no sabría cuál está cambiando.

          El teléfono es una pieza del sistema de diseño y no habla el protocolo de Signal Forms, así
          que se ata al VALOR del campo en vez de con la directiva; el estado sigue en el formulario.

          Y el prefijo parte del país de ESTA dirección, no del de la cuenta: un teléfono de contacto
          para una entrega es el de quien la recibe. Antes partía siempre de «+34».
        -->
        <nx-telefono
          [valor]="formulario.telefono().value()"
          (valorChange)="formulario.telefono().value.set($event)"
          [paisPorDefecto]="paisParaElPrefijo()"
          [etiquetaNumero]="t('checkout.phone')"
        />
      </div>

      <!--
        País de ENTREGA. No es el país de la cuenta: ese es el de registro, fija el margen y solo se
        toca desde los datos personales. Cambiar aquí de país cambia adónde se envía, nunca el precio.
      -->
      <nx-selector-pais
        [valor]="formulario.pais().value()"
        (valorChange)="cambiaPais($event)"
        [clase]="claseSelect() + ' sm:col-span-2'"
        [marcador]="t('checkout.country_iso') + ' *'"
        [etiqueta]="t('checkout.country_iso')"
      />

      <div class="sm:col-span-2">
        <input
          [class]="claseCampo()"
          [placeholder]="t('checkout.line1') + ' *'"
          [attr.aria-label]="t('checkout.line1')"
          [formField]="formulario.linea1"
        />
        @if (falloDe(formulario.linea1); as fallo) {
          <span role="alert" class="text-[12px] text-error mt-1 block">{{ fallo }}</span>
        }
      </div>

      <input
        [class]="claseCampo() + ' sm:col-span-2'"
        [placeholder]="t('checkout.line2')"
        [attr.aria-label]="t('checkout.line2')"
        [formField]="formulario.linea2"
      />

      <div>
        <input
          [class]="claseCampo()"
          [placeholder]="t('checkout.city') + ' *'"
          [attr.aria-label]="t('checkout.city')"
          [formField]="formulario.ciudad"
        />
        @if (falloDe(formulario.ciudad); as fallo) {
          <span role="alert" class="text-[12px] text-error mt-1 block">{{ fallo }}</span>
        }
      </div>

      <!-- Con provincias sembradas es un desplegable; sin ellas, texto libre. El código alimenta el impuesto. -->
      <nx-selector-provincia
        [valor]="formulario.provincia().value()"
        (valorChange)="formulario.provincia().value.set($event)"
        [provincias]="provinciasDelSelector()"
        [claseSelect]="claseSelect()"
        [claseInput]="claseCampo()"
        [marcador]="t('checkout.state')"
      />

      <div>
        <input
          [class]="claseCampo() + (postalInvalido() ? ' input-error border-error' : '')"
          [placeholder]="marcadorPostal()"
          [attr.aria-label]="t('checkout.postal_code')"
          [attr.aria-invalid]="postalInvalido()"
          [formField]="formulario.codigoPostal"
        />
        @if (postalInvalido()) {
          <p role="alert" class="text-[12px] text-error mt-1">{{ avisoPostal() }}</p>
        }
      </div>
    </div>
  `,
})
export class CamposDeDireccion {
  readonly datos = model.required<DatosDeDireccion>();
  /** En la ventana emergente los campos van más apretados que en la página completa. */
  readonly compacto = input(false);

  private readonly traduccion = inject(TraduccionService);
  private readonly ayuda = inject(AYUDA_DE_DIRECCION_PORT);
  private readonly cuenta = inject(CuentaStore);

  protected readonly t = this.traduccion.t;

  /**
   * De qué país parte el prefijo del teléfono.
   *
   * <p>Primero el de ESTA dirección: un teléfono de contacto para una entrega es el de quien la
   * recibe. Pero en una dirección nueva ese campo está vacío —es lo primero que se ve al abrir la
   * ventana—, y ahí caía en España para todo el mundo. El respaldo es el país en el que se REGISTRÓ
   * la cuenta, que es el mejor dato disponible sobre dónde está quien escribe.
   *
   * <p>Se lee del almacén de la CUENTA y no de la sesión: medido el 11-sep, al entrar directo a
   * `/profile` por su dirección el perfil tenía al titular cargado mientras `SesionActual` seguía
   * vacío —la cabecera pintaba «Iniciar sesión» con la página del perfil delante—, así que el
   * respaldo no llegaba nunca. Este almacén es el que alimenta el formulario de al lado, y si él no
   * tiene los datos tampoco hay pantalla que enseñar.
   */
  protected readonly paisParaElPrefijo = computed(
    () => this.datos().pais || this.cuenta.titular()?.pais || '',
  );

  private readonly provincias = signal<readonly Provincia[]>([]);

  /**
   * Las provincias con la forma que espera el sistema de diseño.
   *
   * <p>El dominio las nombra en español y la pieza visual, en inglés. Se traduce AQUÍ, en la frontera:
   * renombrar el modelo del negocio para que encaje con un componente sería invertir la dependencia.
   */
  protected readonly provinciasDelSelector = computed(() =>
    this.provincias().map((provincia) => ({ code: provincia.codigo, name: provincia.nombre })),
  );
  private readonly formatoPostal = signal<FormatoPostal | null>(null);

  protected readonly claseCampo = computed(() =>
    this.compacto() ? 'input input-sm w-full' : 'input w-full',
  );
  protected readonly claseSelect = computed(() =>
    this.compacto() ? 'select select-sm w-full' : 'select w-full',
  );

  protected readonly avisoPostal = computed(() =>
    this.t('address.postal_invalid').replace('{example}', this.formatoPostal()?.ejemplo ?? ''),
  );

  /**
   * Lo que hace falta para poder enviar. Es la MISMA regla que `direccionCompleta()` del dominio, que
   * sigue siendo quien manda; aquí solo se declara campo a campo para poder decir cuál falta mientras
   * se escribe.
   *
   * <p>El código postal se declara con `validate()` porque su regla depende del país: la trae el
   * servidor y es la del dominio, no una copia de su tabla de formatos. Vacío nunca se regaña —aún se
   * está escribiendo— y que sea obligatorio donde toca lo comprueba el servidor al guardar.
   */
  protected readonly formulario = form(this.datos, (ruta) => {
    required(ruta.nombreCompleto, { message: () => this.t('dialog.field.required') });
    maxLength(ruta.nombreCompleto, LARGO_DEL_NOMBRE, { message: () => this.t('dialog.field.maxlength') });
    required(ruta.linea1, { message: () => this.t('dialog.field.required') });
    maxLength(ruta.linea1, LARGO_DE_LA_LINEA, { message: () => this.t('dialog.field.maxlength') });
    maxLength(ruta.linea2, LARGO_DE_LA_LINEA, { message: () => this.t('dialog.field.maxlength') });
    required(ruta.ciudad, { message: () => this.t('dialog.field.required') });
    maxLength(ruta.ciudad, LARGO_DE_LA_CIUDAD, { message: () => this.t('dialog.field.maxlength') });
    required(ruta.pais, { message: () => this.t('dialog.field.required') });
    validate(ruta.codigoPostal, ({ value }) =>
      codigoPostalInvalido(value(), this.formatoPostal())
        ? { kind: 'pattern', message: this.avisoPostal() }
        : undefined,
    );
  });

  /**
   * El código postal contradice el formato del país.
   *
   * <p>Sale del propio formulario para que la regla viva en UN sitio, y se enseña sin esperar al `blur`
   * a propósito: nunca acusa de vacío —con el campo en blanco no hay error—, así que callarlo hasta que
   * el campo se toque solo serviría para descubrir el fallo más tarde.
   */
  protected readonly postalInvalido = computed(
    () => this.formulario.codigoPostal().errors().length > 0,
  );

  protected readonly marcadorPostal = computed(() => {
    const ejemplo = this.formatoPostal()?.ejemplo;
    const rotulo = this.t('checkout.postal_code');
    return ejemplo ? `${rotulo} (${ejemplo})` : rotulo;
  });

  /**
   * El país elegido, aislado del resto del formulario.
   *
   * <p>Es un `computed` y no una lectura directa dentro del efecto porque el objeto de datos cambia de
   * identidad con CADA tecla: leerlo entero allí dispararía dos peticiones al servidor por cada letra
   * que se escribe en la calle. Así solo se avisa cuando el país cambia de verdad.
   */
  private readonly paisElegido = computed(() => this.datos().pais);

  constructor() {
    // Las dos listas dependen del país elegido y se piden solas al cambiarlo. Son datos de APOYO: si
    // fallan, el formulario sigue funcionando y quien decide de verdad es el servidor al guardar.
    effect(() => {
      const pais = this.paisElegido();
      if (!pais) {
        this.provincias.set([]);
        this.formatoPostal.set(null);
        return;
      }
      void this.consultaAyuda(pais);
    });
  }

  private async consultaAyuda(pais: string): Promise<void> {
    const [provincias, formato] = await Promise.all([
      this.ayuda.provincias(pais),
      this.ayuda.formatoPostal(pais),
    ]);
    this.provincias.set(provincias.ok ? provincias.valor : []);
    this.formatoPostal.set(formato.ok ? formato.valor : null);
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo si no hay nada que decir todavía. Se calla hasta
   * que el campo se ha TOCADO: pintar de rojo una dirección recién abierta, con los campos vacíos,
   * acusa a quien todavía no ha escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  /**
   * Al cambiar de país se LIMPIA la provincia.
   *
   * <p>Si no, se arrastraría el texto libre del país anterior haciéndose pasar por código de región y el
   * impuesto por estado saldría del sitio equivocado.
   *
   * <p>El país lo elige un desplegable de fuera del formulario, así que además se marca el campo a mano:
   * sin ello nunca se daría por tocado y su estado no llegaría a contar.
   */
  protected cambiaPais(pais: string): void {
    this.datos.update((actual) => ({ ...actual, pais, provincia: '' }));
    this.formulario.pais().markAsTouched();
  }
}
