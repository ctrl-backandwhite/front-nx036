import { Component, computed, inject, input, resource } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { FichaDeProducto } from '../../domain/model/producto';

/**
 * Valores de atributo que llegan como código y hay que traducir.
 *
 * <p>Son los del feed del proveedor: sin esta tabla, la ficha enseñaba «kids», «all_season» o
 * «fashion-apparel» tal cual en las ocho lenguas.
 */
const VALORES_CONOCIDOS: Record<string, string> = {
  kids: 'attr.val.kids',
  adults: 'attr.val.adults',
  unisex: 'attr.val.unisex',
  men: 'attr.val.men',
  women: 'attr.val.women',
  all_season: 'attr.val.all_season',
  winter: 'attr.val.winter',
  summer: 'attr.val.summer',
  spring: 'attr.val.spring',
  autumn: 'attr.val.autumn',
  fall: 'attr.val.autumn',
  'fashion-apparel': 'category.fashion-apparel',
  'consumer-electronics': 'category.consumer-electronics',
  'home-kitchen': 'category.home-kitchen',
  'beauty-personal-care': 'category.beauty-personal-care',
  'sports-outdoors': 'category.sports-outdoors',
  'toys-gifts': 'category.toys-gifts',
};

/**
 * La ficha técnica pública.
 *
 * <p>Se construye con las ESPECIFICACIONES localizadas: el backend las sirve completas en el idioma
 * pedido, rellenando con el idioma base las posiciones sin traducir. Los atributos del feed están
 * guardados solo en español, y mezclarlos con las especificaciones duplicaba filas en dos idiomas
 * («Age range» junto a «Rango de edad»); por eso solo se usan como RESPALDO para productos antiguos
 * que aún no tienen especificaciones.
 */
@Component({
  selector: 'nx-tabla-atributos',
  template: `
    <div class="card card-border bg-base-100">
      <div class="card-body">
        <h2 class="card-title">{{ t('pdp.section.attributes') }}</h2>
        <!-- La tabla se desplaza dentro de su caja: en el móvil, una fila con un valor largo empujaba
             la página entera hacia los lados. -->
        <div class="overflow-x-auto mt-1">
          <table class="table table-zebra table-sm">
            <tbody>
              @if (filas().length === 0) {
                <tr>
                  <td colspan="2" class="text-center opacity-60 py-6">{{ t('pdp.attr.empty') }}</td>
                </tr>
              } @else {
                @for (fila of filas(); track fila.rotulo) {
                  <tr>
                    <td class="w-44 opacity-70">{{ fila.rotulo }}</td>
                    <td class="font-medium">{{ fila.valor }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class TablaAtributos {
  readonly ficha = input.required<FichaDeProducto>();

  private readonly catalogo = inject(CATALOGO_PORT);
  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;

  /** Las especificaciones se piden aparte: no viajan embebidas en la ficha. */
  private readonly especificaciones = resource({
    params: () => ({ id: this.ficha().id, idioma: this.preferencias.idioma() }),
    loader: async ({ params }) => {
      const resultado = await this.catalogo.especificaciones(params.id, params.idioma);
      return resultado.ok ? resultado.valor : [];
    },
  });

  protected readonly filas = computed<readonly { rotulo: string; valor: string }[]>(() => {
    const ficha = this.ficha();
    const especificaciones = this.especificaciones.value()?.length
      ? this.especificaciones.value()!
      : ficha.especificaciones;

    const filas: { rotulo: string; valor: string }[] = [];
    if (especificaciones.length > 0) {
      for (const especificacion of especificaciones) {
        filas.push({
          rotulo: this.rotulo(especificacion.clave),
          valor: this.valor(String(especificacion.valor)),
        });
      }
    } else {
      // Producto antiguo sin especificaciones: se cae a los atributos, deduplicando por rótulo YA
      // traducido para que una misma clave no salga dos veces al venir en varios idiomas.
      const vistos = new Set<string>();
      for (const [clave, valor] of Object.entries(ficha.atributos)) {
        const rotulo = this.rotulo(clave);
        if (vistos.has(rotulo.toLowerCase())) {
          continue;
        }
        vistos.add(rotulo.toLowerCase());
        filas.push({ rotulo, valor: this.valor(String(valor)) });
      }
    }

    // Los básicos van al final y NUNCA pisan lo que ya viene del proveedor.
    // El origen (la plataforma de la que se importó) no se enseña: es información interna.
    this.anadeSiFalta(filas, this.rotulo('brand'), ficha.marca);
    // Un pedido mínimo de una unidad no es un dato: es lo normal, y ocupa una fila para no decir nada.
    this.anadeSiFalta(filas, this.rotulo('moq'), ficha.moq > 1 ? ficha.moq : undefined);
    this.anadeSiFalta(
      filas,
      this.rotulo('rating'),
      ficha.valoracion != null
        ? `${Number(ficha.valoracion).toFixed(1)} ★ (${ficha.numeroDeResenas})`
        : undefined,
    );
    return filas;
  });

  private rotulo(clave: string): string {
    const traducido = this.t(`attr.${clave}`);
    // El servicio devuelve la CLAVE cuando no hay traducción: esa es la señal de que hay que
    // arreglárselas con el nombre crudo en vez de enseñar «attr.material» en pantalla.
    return traducido === `attr.${clave}` ? clave : traducido;
  }

  private valor(crudo: string): string {
    const clave = VALORES_CONOCIDOS[crudo.toLowerCase()];
    if (!clave) {
      return crudo;
    }
    const traducido = this.t(clave);
    return traducido === clave ? crudo : traducido;
  }

  private anadeSiFalta(
    filas: { rotulo: string; valor: string }[],
    rotulo: string,
    valor: string | number | undefined,
  ): void {
    if (valor == null || valor === '') {
      return;
    }
    if (filas.some((fila) => fila.rotulo.toLowerCase() === rotulo.toLowerCase())) {
      return;
    }
    filas.push({ rotulo, valor: String(valor) });
  }
}
