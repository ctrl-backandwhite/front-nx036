import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { SelectorPais } from '@ds/component/pais/selector-pais';
import { SelectorProvincia } from '@ds/component/provincia/selector-provincia';
import { Telefono } from '@ds/component/telefono/telefono';
import {
  DatosDeDireccion,
  FormatoPostal,
  codigoPostalInvalido,
} from '../../domain/model/direccion';
import { AYUDA_DE_DIRECCION_PORT, Provincia } from '../../domain/port/direcciones.port';

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
 * <p>Mobile first: una columna, y dos a partir de `sm`. El teléfono y las líneas de la dirección ocupan
 * la fila entera incluso en pantalla ancha, porque en media columna el número se queda tan estrecho que
 * ni cabe el texto de ejemplo.
 */
@Component({
  selector: 'nx-campos-de-direccion',
  imports: [SelectorPais, SelectorProvincia, Telefono],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input
        [class]="claseCampo() + ' sm:col-span-2'"
        [placeholder]="t('checkout.full_name') + ' *'"
        [attr.aria-label]="t('checkout.full_name')"
        [value]="datos().nombreCompleto"
        (input)="escribe('nombreCompleto', $event)"
      />

      <div class="sm:col-span-2">
        <!-- Prefijo internacional con bandera más el número: se guarda entero, en E.164. -->
        <!--
          El rótulo del PREFIJO se deja en el que trae el sistema de diseño: si aquí se le pusiera el
          mismo nombre que al país de la dirección, quien navega con lector de pantalla oiría dos
          desplegables llamados igual y no sabría cuál está cambiando.
        -->
        <nx-telefono
          [valor]="datos().telefono"
          (valorChange)="cambia('telefono', $event)"
          [etiquetaNumero]="t('checkout.phone')"
        />
      </div>

      <!--
        País de ENTREGA. No es el país de la cuenta: ese es el de registro, fija el margen y solo se
        toca desde los datos personales. Cambiar aquí de país cambia adónde se envía, nunca el precio.
      -->
      <nx-selector-pais
        [valor]="datos().pais"
        (valorChange)="cambiaPais($event)"
        [clase]="claseSelect() + ' sm:col-span-2'"
        [marcador]="t('checkout.country_iso') + ' *'"
        [etiqueta]="t('checkout.country_iso')"
      />

      <input
        [class]="claseCampo() + ' sm:col-span-2'"
        [placeholder]="t('checkout.line1') + ' *'"
        [attr.aria-label]="t('checkout.line1')"
        [value]="datos().linea1"
        (input)="escribe('linea1', $event)"
      />

      <input
        [class]="claseCampo() + ' sm:col-span-2'"
        [placeholder]="t('checkout.line2')"
        [attr.aria-label]="t('checkout.line2')"
        [value]="datos().linea2"
        (input)="escribe('linea2', $event)"
      />

      <input
        [class]="claseCampo()"
        [placeholder]="t('checkout.city') + ' *'"
        [attr.aria-label]="t('checkout.city')"
        [value]="datos().ciudad"
        (input)="escribe('ciudad', $event)"
      />

      <!-- Con provincias sembradas es un desplegable; sin ellas, texto libre. El código alimenta el impuesto. -->
      <nx-selector-provincia
        [valor]="datos().provincia"
        (valorChange)="cambia('provincia', $event)"
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
          [value]="datos().codigoPostal"
          (input)="escribe('codigoPostal', $event)"
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

  protected readonly t = this.traduccion.t;

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

  protected readonly postalInvalido = computed(() =>
    codigoPostalInvalido(this.datos().codigoPostal, this.formatoPostal()),
  );

  protected readonly marcadorPostal = computed(() => {
    const ejemplo = this.formatoPostal()?.ejemplo;
    const rotulo = this.t('checkout.postal_code');
    return ejemplo ? `${rotulo} (${ejemplo})` : rotulo;
  });

  protected readonly avisoPostal = computed(() =>
    this.t('address.postal_invalid').replace('{example}', this.formatoPostal()?.ejemplo ?? ''),
  );

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

  protected escribe(campo: 'nombreCompleto' | 'linea1' | 'linea2' | 'ciudad' | 'codigoPostal', evento: Event): void {
    this.cambia(campo, (evento.target as HTMLInputElement).value);
  }

  protected cambia(campo: keyof DatosDeDireccion, valor: string): void {
    this.datos.update((actual) => ({ ...actual, [campo]: valor }));
  }

  /**
   * Al cambiar de país se LIMPIA la provincia.
   *
   * <p>Si no, se arrastraría el texto libre del país anterior haciéndose pasar por código de región y el
   * impuesto por estado saldría del sitio equivocado.
   */
  protected cambiaPais(pais: string): void {
    this.datos.update((actual) => ({ ...actual, pais, provincia: '' }));
  }
}
