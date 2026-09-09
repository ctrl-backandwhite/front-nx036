import { Component, computed, inject, input, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { FichaDeProducto, VarianteDeProducto } from '../../domain/model/producto';
import { enCentimetros, hayBascula, volumenCm3 } from '../../domain/model/catalogo-auxiliar';
import { etiquetaDeValor } from '../../domain/model/seleccion-de-variante';

/** Con más de diez variantes la tabla se colapsa, igual que las tallas. */
const TOPE_ANTES_DE_COLAPSAR = 10;

/**
 * La báscula del producto: peso y medidas REALES por variante.
 *
 * <p>El peso decide el porte, así que no es un dato de adorno: es lo que hace que el envío que se
 * cobra sea el que de verdad cuesta. El volumen se CALCULA, no viaja.
 *
 * <p>La variante guarda el valor tal y como vino del proveedor («藏青色») y la traducción está en las
 * opciones del producto. Sin ese cruce, la tabla enseñaba los colores en chino aunque el resto de la
 * ficha estuviera en español.
 */
@Component({
  selector: 'nx-bascula-variantes',
  template: `
    <div class="card card-border bg-base-100">
      <div class="card-body">
        <h2 class="card-title">{{ t('pdp.scale.title') }}</h2>
        @if (!hayDatos()) {
          <p class="text-[13px] opacity-60 mt-1">{{ t('pdp.scale.empty') }}</p>
        } @else {
          <div class="overflow-x-auto mt-1">
            <table class="table table-zebra table-sm">
              <thead>
                <tr>
                  @for (eje of ejes(); track eje) {
                    <th class="font-medium">{{ nombreDeEje(eje) }}</th>
                  }
                  <th class="font-medium text-right">{{ t('pdp.scale.length') }}</th>
                  <th class="font-medium text-right">{{ t('pdp.scale.width') }}</th>
                  <th class="font-medium text-right">{{ t('pdp.scale.height') }}</th>
                  <th class="font-medium text-right">{{ t('pdp.scale.volume') }}</th>
                  <th class="font-medium text-right">{{ t('pdp.scale.weight') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (variante of visibles(); track variante.id) {
                  <tr>
                    @for (eje of ejes(); track eje) {
                      <td>{{ valorDelEje(variante, eje) }}</td>
                    }
                    <td class="text-right font-mono">{{ cm(variante.largoMm) }}</td>
                    <td class="text-right font-mono">{{ cm(variante.anchoMm) }}</td>
                    <td class="text-right font-mono">{{ cm(variante.altoMm) }}</td>
                    <td class="text-right font-mono">{{ volumen(variante) }}</td>
                    <td class="text-right font-mono">{{ peso(variante) }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (colapsable()) {
              <button
                type="button"
                (click)="desplegada.set(!desplegada())"
                class="btn btn-ghost btn-sm w-full mt-2 text-primary font-normal"
              >
                {{
                  desplegada()
                    ? t('pdp.size.show_less')
                    : t('pdp.size.show_more') + ' (' + (variantes().length - tope) + ')'
                }}
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class BasculaVariantes {
  readonly ficha = input.required<FichaDeProducto>();

  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;
  protected readonly tope = TOPE_ANTES_DE_COLAPSAR;
  protected readonly desplegada = signal(false);

  /**
   * Solo las variantes ACTIVAS.
   *
   * <p>Una variante desactivada no se puede comprar, así que su peso y sus medidas no le sirven a
   * nadie: la tabla estaba prometiendo pesos de combinaciones que no se pueden pedir. Y como una
   * variante retirada suele ser justo la que quedó con datos viejos —un color que ya no figura entre
   * las opciones del producto—, era también por donde asomaban los valores en chino sin traducir.
   */
  protected readonly variantes = computed(() => this.ficha().variantes.filter((v) => v.activa));
  protected readonly hayDatos = computed(() => hayBascula(this.variantes()));
  protected readonly ejes = computed(() => Object.keys(this.variantes()[0]?.opciones ?? {}));
  protected readonly colapsable = computed(() => this.variantes().length > TOPE_ANTES_DE_COLAPSAR);
  protected readonly visibles = computed(() =>
    this.desplegada() || !this.colapsable()
      ? this.variantes()
      : this.variantes().slice(0, TOPE_ANTES_DE_COLAPSAR),
  );

  /** El diccionario chino → idioma activo, construido una vez con las opciones del producto. */
  private readonly traduccionDeValor = computed(() => {
    const mapa = new Map<string, string>();
    for (const eje of this.ficha().ejesDeVariante) {
      for (const valor of eje.valores) {
        const etiqueta = etiquetaDeValor(valor, this.preferencias.idioma());
        if (valor.valorZh && etiqueta) {
          mapa.set(valor.valorZh, etiqueta);
        }
      }
    }
    return mapa;
  });

  protected nombreDeEje(clave: string): string {
    const traducido = this.t(`attr.${clave.toLowerCase()}`);
    return traducido === `attr.${clave.toLowerCase()}` ? clave : traducido;
  }

  protected valorDelEje(variante: VarianteDeProducto, eje: string): string {
    const crudo = variante.opciones[eje];
    if (!crudo) {
      return '—';
    }
    const traducido = this.traduccionDeValor().get(crudo);
    if (traducido) {
      return traducido;
    }
    // Sin traducción se enseña el valor tal cual vino, que para las tallas y los códigos es lo
    // correcto —«37» no se traduce—. Pero si son IDEOGRAMAS y no se está mirando en chino, eso es
    // enseñar un fallo: quien navega en español ve «卡其色【牛筋软底】» en una tabla donde todo lo
    // demás está en su idioma.
    //
    // Ocurre cuando una variante quedó con un valor que ya no está entre las opciones declaradas del
    // producto —una carga vieja que se corrigió a medias—: esa variante ni siquiera se puede elegir
    // en la ficha, así que además de ilegible es inalcanzable. El guion dice «no lo sé» sin fingir.
    return this.esChino(crudo) && this.preferencias.idioma() !== 'zh' ? '—' : crudo;
  }

  /** ¿Lleva ideogramas? Basta con encontrar uno: un valor mixto tampoco se puede leer en español. */
  private esChino(valor: string): boolean {
    return /[\u4e00-\u9fff]/.test(valor);
  }

  protected cm(milimetros?: number): string {
    return enCentimetros(milimetros);
  }

  protected volumen(variante: VarianteDeProducto): string {
    return volumenCm3(variante);
  }

  protected peso(variante: VarianteDeProducto): string {
    return variante.pesoGramos != null && variante.pesoGramos > 0
      ? variante.pesoGramos.toLocaleString()
      : '—';
  }
}
