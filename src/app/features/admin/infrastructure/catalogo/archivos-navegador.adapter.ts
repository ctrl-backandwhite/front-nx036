import { DOCUMENT, Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { TokenStore } from '@core/auth/token-store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { FiltroDeExportacion } from '../../domain/catalogo/model/exportacion';
import { FilaDeImportacion } from '../../domain/catalogo/model/importacion-masiva';
import {
  ArchivoLocal,
  DescargaDeArchivosPort,
  ExportacionEnFlujoPort,
  LectorDeArchivosPort,
} from '../../domain/catalogo/port/transferencia-de-catalogo.port';

/** Cuántos productos pide el backend por lote al volcar en flujo. */
const LOTE_DEL_VOLCADO = 500;

/** El selector de archivo moderno, cuando el navegador lo trae. No está en la definición estándar. */
interface SelectorDeGuardado {
  showSaveFilePicker?: (opciones: unknown) => Promise<{
    createWritable: () => Promise<WritableStream>;
  }>;
}

/**
 * Todo lo que toca el disco de quien administra: leer un archivo elegido, guardar uno y volcar el
 * catálogo entero por flujo.
 *
 * <p>Vive en INFRAESTRUCTURA porque nada de esto existe fuera del navegador —al prerenderizar no hay
 * `document`, ni `fetch` con credenciales, ni selector de archivo—, y porque sacarlo del caso de uso es
 * lo que permite probar la exportación sin un navegador delante.
 *
 * <p>El volcado completo va por `fetch` y no por el servicio de API: lo que llega es un flujo NDJSON de
 * cientos de megas y hay que escribirlo a disco a medida que llega. Cargarlo como JSON tumbaba la
 * pestaña.
 */
@Injectable()
export class ArchivosNavegadorAdapter
  implements LectorDeArchivosPort, DescargaDeArchivosPort, ExportacionEnFlujoPort
{
  private readonly documento = inject(DOCUMENT);
  private readonly config = inject(APP_CONFIG);
  private readonly tokens = inject(TokenStore);

  async leeTexto(archivo: ArchivoLocal): Promise<Result<string, AppError>> {
    try {
      return exito(await (archivo.fuente as File).text());
    } catch (error) {
      return fallo(creaError('peticion-invalida', String((error as Error)?.message ?? '')));
    }
  }

  /**
   * Recorre el NDJSON línea a línea y entrega lotes.
   *
   * <p>Devuelve cuántas líneas no se pudieron interpretar. Una línea rota NO aborta el fichero: en un
   * volcado de un millón de filas, tirar la carga entera por una es peor que dejarla fuera y decirlo.
   */
  async recorreNdjson(
    archivo: ArchivoLocal,
    filasPorLote: number,
    alLote: (filas: readonly FilaDeImportacion[], bytesLeidos: number) => Promise<void>,
  ): Promise<Result<number, AppError>> {
    try {
      const lector = (archivo.fuente as File).stream().getReader();
      const descodificador = new TextDecoder();
      let pendiente = '';
      let bytes = 0;
      let ilegibles = 0;
      let lote: FilaDeImportacion[] = [];
      for (;;) {
        const { done, value } = await lector.read();
        if (done) {
          break;
        }
        bytes += value.byteLength;
        pendiente += descodificador.decode(value, { stream: true });
        let salto = pendiente.indexOf('\n');
        while (salto >= 0) {
          const linea = pendiente.slice(0, salto).trim();
          pendiente = pendiente.slice(salto + 1);
          if (linea) {
            try {
              lote.push(JSON.parse(linea));
            } catch {
              ilegibles++;
            }
          }
          if (lote.length >= filasPorLote) {
            await alLote(lote, bytes);
            lote = [];
          }
          salto = pendiente.indexOf('\n');
        }
        await alLote([], bytes);
      }
      const ultima = pendiente.trim();
      if (ultima) {
        try {
          lote.push(JSON.parse(ultima));
        } catch {
          ilegibles++;
        }
      }
      await alLote(lote, archivo.tamano);
      return exito(ilegibles);
    } catch (error) {
      return fallo(creaError('desconocido', String((error as Error)?.message ?? '')));
    }
  }

  guarda(nombre: string, contenido: string, tipo: string): void {
    const bloque = new Blob([contenido], { type: tipo });
    const direccion = URL.createObjectURL(bloque);
    const enlace = this.documento.createElement('a');
    enlace.href = direccion;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(direccion);
  }

  async descargaTodo(
    filtro: FiltroDeExportacion,
    nombre: string,
  ): Promise<Result<boolean, AppError>> {
    // IMPORTANTE: el selector de archivo se abre DENTRO del gesto de quien pulsa, antes de cualquier
    // espera de red. Llamarlo después de un `await` deja de contar como gesto y el navegador lo niega
    // con «Must be handling a user gesture».
    const abre = (this.documento.defaultView as unknown as SelectorDeGuardado)?.showSaveFilePicker;
    let destino: WritableStream | null = null;
    if (abre) {
      try {
        const manejador = await abre({
          suggestedName: nombre,
          types: [{ description: 'NDJSON', accept: { 'application/x-ndjson': ['.ndjson'] } }],
        });
        destino = await manejador.createWritable();
      } catch (error) {
        // Cancelar el selector no es un fallo: no hay nada que avisar.
        if ((error as { name?: string })?.name === 'AbortError') {
          return exito(false);
        }
        return fallo(creaError('desconocido', String((error as Error)?.message ?? '')));
      }
    }
    return this.vuelca(filtro, nombre, destino);
  }

  private async vuelca(
    filtro: FiltroDeExportacion,
    nombre: string,
    destino: WritableStream | null,
  ): Promise<Result<boolean, AppError>> {
    const parametros = new URLSearchParams({ batch: String(LOTE_DEL_VOLCADO) });
    if (filtro.creadoDesde) {
      parametros.set('createdFrom', filtro.creadoDesde);
    }
    if (filtro.creadoHasta) {
      parametros.set('createdTo', filtro.creadoHasta);
    }
    if (filtro.verificado !== undefined) {
      parametros.set('verified', String(filtro.verificado));
    }
    try {
      const respuesta = await fetch(
        `${this.config.apiBase}/api/admin/catalog/products/export/ndjson?${parametros}`,
        { headers: { Authorization: `Bearer ${this.tokens.acceso() ?? ''}` } },
      );
      if (!respuesta.ok || !respuesta.body) {
        return fallo(creaError('error-del-servidor', '', { estado: respuesta.status }));
      }
      if (destino) {
        await respuesta.body.pipeTo(destino);
      } else {
        // Sin selector de archivo se acumula en memoria. Vale para volúmenes moderados y es el único
        // camino que queda en los navegadores que no lo traen.
        this.guarda(nombre, await respuesta.text(), 'application/x-ndjson');
      }
      return exito(true);
    } catch (error) {
      return fallo(creaError('sin-conexion', String((error as Error)?.message ?? '')));
    }
  }
}
