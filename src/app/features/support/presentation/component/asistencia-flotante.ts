import { Component, input, output } from '@angular/core';
import { LineaDeCesta, SugerenciaParaLaCesta } from '../../domain/model/cesta';
import { AvatarDelAsistente } from './avatar-del-asistente';
import { WidgetDeChat } from './widget-de-chat';

/**
 * Lo que flota en la esquina del escaparate: el asistente y el chat.
 *
 * <p>Existe SOLO para garantizar que ninguno de los dos pese en el arranque. Los dos van en `@defer (on
 * idle)`: su código no se descarga hasta que el navegador no tiene nada mejor que hacer, así que no
 * compite con lo que la persona está mirando —el catálogo o la ficha— justo cuando más importa.
 *
 * <p>No se difieren `on interaction` porque el disparador tendría que ser su propio botón: habría que
 * pulsarlo dos veces —una para descargar y otra para abrir— y eso se lee como que el botón no funciona.
 * `on idle` los deja listos antes de que nadie los busque, sin haber estorbado.
 *
 * <p>No hay `@placeholder`: hasta que cargan no hay NADA que enseñar, y un hueco reservado en la esquina
 * se ve como un fallo de pintado.
 *
 * <p>Además de diferir, este componente es el punto por el que el marco de la página entrega lo que el
 * asistente no puede saber por sí mismo —qué lleva la cesta— y recoge lo que no puede hacer solo:
 * añadir a la cesta, abrir la ficha rápida y abrir la guía de bienvenida, que son de otros contextos.
 */
@Component({
  selector: 'nx-asistencia-flotante',
  imports: [AvatarDelAsistente, WidgetDeChat],
  template: `
    @defer (on idle) {
      <nx-avatar-del-asistente
        [lineasDeLaCesta]="lineasDeLaCesta()"
        [enElPago]="enElPago()"
        [anadiendo]="anadiendo()"
        (anadeALaCesta)="anadeALaCesta.emit($event)"
        (abreFichaRapida)="abreFichaRapida.emit($event)"
        (pideLaGuia)="pideLaGuia.emit()"
      />
    }

    @defer (on idle) {
      <nx-widget-de-chat (abreFichaRapida)="abreFichaRapida.emit($event)" />
    }
  `,
})
export class AsistenciaFlotante {
  readonly lineasDeLaCesta = input<readonly LineaDeCesta[]>([]);
  readonly enElPago = input(false);
  readonly anadiendo = input<string | null>(null);

  readonly anadeALaCesta = output<SugerenciaParaLaCesta>();
  readonly abreFichaRapida = output<string>();
  readonly pideLaGuia = output<void>();
}
