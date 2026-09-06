import { Injectable, Injector, inject, resource } from '@angular/core';
import { PaisDeEnvio, RegionDeEnvio } from '../../domain/model/cotizacion-de-envio';
import { COBERTURA_DE_ENVIO_PORT } from '../../domain/port/envio.port';

/**
 * Adónde se puede enviar.
 *
 * <p>Dos consultas distintas y un solo caso de uso porque responden a la misma pregunta desde dos sitios:
 * el escaparate enseña los países cubiertos y el formulario de dirección necesita las provincias del país
 * elegido, que es lo que el servidor usa para el impuesto por región.
 */
@Injectable()
export class ConsultaLaCobertura {
  private readonly puerto = inject(COBERTURA_DE_ENVIO_PORT);
  private readonly inyector = inject(Injector);

  /** Los países cubiertos. La cobertura cambia rara vez, así que se pide una sola vez por visita. */
  paises() {
    return resource<readonly PaisDeEnvio[], true>({
      injector: this.inyector,
      defaultValue: [],
      params: () => true,
      loader: async () => {
        const resultado = await this.puerto.paises();
        return resultado.ok ? resultado.valor : [];
      },
    });
  }

  /** Las provincias del país elegido. Sin país no se pregunta nada. */
  regiones(pais: () => string) {
    return resource<readonly RegionDeEnvio[], string | undefined>({
      injector: this.inyector,
      defaultValue: [],
      params: () => pais() || undefined,
      loader: async ({ params }) => {
        const resultado = await this.puerto.regiones(params);
        return resultado.ok ? resultado.valor : [];
      },
    });
  }
}
