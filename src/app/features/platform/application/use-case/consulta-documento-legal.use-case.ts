import { Injectable, inject } from '@angular/core';
import { DocContent } from '@shared/content/site-pages';
import {
  TipoDeDocumentoLegal,
  documentoAEnsenar,
  respaldoCompilado,
} from '../../domain/model/documento-legal';
import { DOCUMENTOS_LEGALES_PORT } from '../../domain/port/documentos-legales.port';

/**
 * Trae el documento legal que hay que enseñar.
 *
 * <p>Es un caso de uso y no una llamada suelta desde la pantalla porque hay una DECISIÓN detrás: la
 * fuente es la base de datos, pero si el backend no responde se sirve el texto compilado en la propia
 * aplicación. En una página legal esa red importa más que en ninguna otra — quien compra tiene derecho
 * a leer las condiciones que le vinculan, y «vuelve a intentarlo» no es una respuesta aceptable.
 *
 * <p>Nunca falla: siempre devuelve un documento. Por eso el tipo de retorno no es un `Result`, y esa
 * ausencia es intencionada: obliga a quien lo llama a pintar algo, que es justo lo que se quiere.
 */
@Injectable()
export class ConsultaDocumentoLegal {
  private readonly documentos = inject(DOCUMENTOS_LEGALES_PORT);

  async ejecuta(tipo: TipoDeDocumentoLegal, idioma: string): Promise<DocContent> {
    const resultado = await this.documentos.consulta(tipo, idioma);
    if (!resultado.ok) {
      return respaldoCompilado(tipo, idioma);
    }
    // Un documento publicado con el cuerpo vacío —lo que deja un borrador a medias— también cae al
    // respaldo: la regla está en el dominio y aquí solo se aplica.
    return documentoAEnsenar(resultado.valor, tipo, idioma);
  }
}
