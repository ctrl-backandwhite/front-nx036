import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  DisenoPod,
  MaquetaGenerada,
  NuevoDiseno,
  ProductoEnBlanco,
} from '../domain/model/diseno-pod';
import {
  DisenosPort,
  GeneracionDeDisenoPort,
  ProductosEnBlancoPort,
} from '../domain/port/pod.port';

interface EnBlancoDto {
  id: string;
  title: string;
  /** El campo actual. */
  mainImage?: string;
  /** El campo antiguo. Se conserva como respaldo mientras queden filas sin migrar. */
  image?: string;
  price?: number;
  currency?: string;
}

interface DisenoDto {
  id: string;
  productId: string;
  productTitle: string;
  name: string;
  mockupUrl?: string;
  status: string;
  aiPrompt?: string;
  createdAt: string;
}

interface MaquetaDto {
  mockupUrl: string;
  prompt: string;
  provider: string;
}

function aDiseno(dto: DisenoDto): DisenoPod {
  return {
    id: dto.id,
    idProducto: dto.productId,
    tituloDelProducto: dto.productTitle,
    nombre: dto.name,
    maquetaUrl: dto.mockupUrl,
    estado: dto.status,
    instruccionIa: dto.aiPrompt,
    creadoEl: dto.createdAt,
  };
}

/** El catálogo de prendas y objetos sin estampar. */
@Injectable()
export class ProductosEnBlancoHttpAdapter implements ProductosEnBlancoPort {
  private readonly api = inject(ApiService);

  async lista(idioma: string): Promise<Result<readonly ProductoEnBlanco[], AppError>> {
    const respuesta = await this.api.get<EnBlancoDto[]>('/pod/blank-products', { lang: idioma });
    return mapea(respuesta, (filas) =>
      filas.map((dto) => ({
        id: dto.id,
        titulo: dto.title,
        // `mainImage` es el campo actual; `image` sobrevive porque quedan filas antiguas sin migrar y
        // sin el respaldo la rejilla salía entera con el marcador de imagen rota.
        imagen: dto.mainImage ?? dto.image,
        precio: Number(dto.price ?? 0),
        divisa: dto.currency ?? 'USD',
      })),
    );
  }
}

/** Los diseños propios. */
@Injectable()
export class DisenosHttpAdapter implements DisenosPort {
  private readonly api = inject(ApiService);

  async mios(): Promise<Result<readonly DisenoPod[], AppError>> {
    return mapea(await this.api.get<DisenoDto[]>('/me/pod/designs'), (filas) => filas.map(aDiseno));
  }

  async crea(diseno: NuevoDiseno): Promise<Result<DisenoPod, AppError>> {
    const respuesta = await this.api.post<DisenoDto>('/me/pod/designs', {
      productId: diseno.idProducto,
      name: diseno.nombre,
      aiPrompt: diseno.instruccionIa || undefined,
    });
    return mapea(respuesta, aDiseno);
  }

  /**
   * El nombre viaja en la CONSULTA, no en el cuerpo: es lo que espera este endpoint del backend. Se
   * codifica porque un nombre con un `&` o con un espacio partía la dirección y el diseño se quedaba
   * con la mitad del nombre.
   */
  async renombra(id: string, nombre: string): Promise<Result<DisenoPod, AppError>> {
    const camino = `/me/pod/designs/${id}?name=${encodeURIComponent(nombre)}`;
    return mapea(await this.api.put<DisenoDto>(camino, null), aDiseno);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<void>(`/me/pod/designs/${id}`), () => undefined);
  }
}

/** El generador de maquetas. Adaptador propio: es un servicio externo con su forma de fallar. */
@Injectable()
export class GeneracionDeDisenoHttpAdapter implements GeneracionDeDisenoPort {
  private readonly api = inject(ApiService);

  async genera(instruccion: string): Promise<Result<MaquetaGenerada, AppError>> {
    const respuesta = await this.api.post<MaquetaDto>('/me/pod/ai-generate', {
      prompt: instruccion,
    });
    return mapea(respuesta, (dto) => ({
      maquetaUrl: dto.mockupUrl,
      instruccion: dto.prompt,
      proveedor: dto.provider,
    }));
  }
}
