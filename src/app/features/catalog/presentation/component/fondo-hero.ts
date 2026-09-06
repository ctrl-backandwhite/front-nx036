import { Component, computed, inject, resource } from '@angular/core';
import { PORTADA_PORT } from '../../domain/port/catalogo.port';

/** Una cinta ya montada: su identidad, su sentido de marcha y sus celdas con clave estable. */
interface Cinta {
  readonly id: string;
  readonly alReves: boolean;
  readonly celdas: readonly { readonly clave: string; readonly foto: string }[];
}

/** Cuántas cintas se pintan. Tres llenan el alto del hero sin repetir demasiado. */
const CINTAS = 3;
/** Por debajo de esto no hay fondo: media docena de fotos repetidas se nota y queda peor que nada. */
const MINIMO_DE_FOTOS = 6;

/**
 * El fondo vivo del hero: cintas de fotos REALES del catálogo que se deslizan sin fin, como una cinta
 * transportadora —un guiño al comercio transfronterizo.
 *
 * <p>Las fotos salen del endpoint PÚBLICO de secciones y no del listado: la portada la ven visitantes
 * sin cuenta y el listado exige sesión. Cuando se pedía el listado, el interceptor tomaba el 401 por
 * sesión caída y echaba a la pantalla de acceso a quien entraba en la portada sin registrarse.
 *
 * <p>El texto SIEMPRE queda legible gracias a un velo más fuerte en el centro. Toda la animación es
 * CSS (`hero-belt`, en la hoja central), así que se pausa sola con «reducir movimiento».
 */
@Component({
  selector: 'nx-fondo-hero',
  template: `
    @if (cintas().length > 0) {
      <div aria-hidden="true" class="hero-backdrop absolute inset-0 -z-10 overflow-hidden">
        <div class="hero-belts">
          @for (cinta of cintas(); track cinta.id) {
            <div class="hero-belt" [class.reverse]="cinta.alReves">
              <!-- El conjunto va DUPLICADO: es lo que hace que el bucle no tenga costura. -->
              <div class="hero-track">
                @for (celda of cinta.celdas; track celda.clave) {
                  <div
                    class="hero-cell"
                    [style.background-image]="'url(&quot;' + celda.foto + '&quot;)'"
                  ></div>
                }
              </div>
            </div>
          }
        </div>
        <!-- Velo de legibilidad: sólido en el centro (texto), suave en los bordes (asoman productos). -->
        <div class="hero-scrim"></div>
        <div class="hero-tint"></div>
      </div>
    }
  `,
})
export class FondoHero {
  private readonly portada = inject(PORTADA_PORT);

  private readonly datos = resource({
    loader: async () => {
      // Doce por sección da alrededor de cuarenta y ocho fotos, que es lo que llenan las tres cintas.
      const resultado = await this.portada.secciones(12);
      return resultado.ok ? resultado.valor : null;
    },
  });

  protected readonly cintas = computed<readonly Cinta[]>(() => {
    const fotos = [
      ...new Set(
        (this.datos.value()?.secciones ?? [])
          .flatMap((seccion) => seccion.items)
          .map((producto) => producto.imagenPrincipal)
          .filter((foto): foto is string => !!foto),
      ),
    ];
    if (fotos.length < MINIMO_DE_FOTOS) {
      return [];
    }
    const porCinta = Math.ceil(fotos.length / CINTAS);
    return Array.from({ length: CINTAS }, (_, indice) => {
      const trozo = fotos.slice(indice * porCinta, indice * porCinta + porCinta);
      const relleno = trozo.length >= 5 ? trozo : fotos.slice(0, Math.max(MINIMO_DE_FOTOS, trozo.length));
      // El conjunto se duplica para que el bucle no tenga costura, así que la dirección de la foto se
      // repite: la CLAVE lleva además la posición, porque un `track` no puede repetirse. Con el índice
      // suelto, cada cambio reconstruiría las tres cintas enteras.
      return {
        id: `cinta-${indice}`,
        alReves: indice % 2 === 1,
        celdas: [...relleno, ...relleno].map((foto, posicion) => ({
          clave: `${indice}-${posicion}-${foto}`,
          foto,
        })),
      };
    });
  });
}
