import { beforeEach, describe, expect, it, vi } from 'vitest'

import { vuelaALaCesta } from './vuela-a-la-cesta'

/**
 * El vuelo al carrito es decoración, y lo que de verdad hay que sujetar es que **nunca estorbe**:
 * que no se quede una copia pegada sobre la pantalla, que no tape lo que hay debajo, que no la lea
 * un lector de pantalla y que no se mueva nada si quien mira pidió menos movimiento.
 */
describe('vuelaALaCesta', () => {
  let animaciones: { efecto: Keyframe[]; resolver: () => void; rechazar: () => void }[]

  /** Un elemento con tamaño: `getBoundingClientRect` devuelve ceros en jsdom si no se finge. */
  function conRectangulo<T extends HTMLElement>(el: T, x: number, y: number, w = 100, h = 100): T {
    el.getBoundingClientRect = () =>
      ({ top: y, left: x, width: w, height: h, right: x + w, bottom: y + h, x, y }) as DOMRect
    return el
  }

  function origenConImagen(): HTMLElement {
    const caja = document.createElement('div')
    const img = document.createElement('img')
    img.src = 'https://cdn/foto.jpg'
    conRectangulo(img, 10, 500)
    caja.appendChild(img)
    document.body.appendChild(caja)
    return caja
  }

  function cesta(id: string, visible: boolean): HTMLElement {
    const el = document.createElement('div')
    el.id = id
    conRectangulo(el, 1200, 20, visible ? 40 : 0, visible ? 40 : 0)
    document.body.appendChild(el)
    return el
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    animaciones = []
    // Las animaciones del navegador no existen en jsdom: se finge la API y se guarda lo pedido.
    HTMLImageElement.prototype.animate = function (efecto: Keyframe[]) {
      let resolver!: () => void
      let rechazar!: () => void
      const finished = new Promise<void>((ok, mal) => {
        resolver = () => ok()
        rechazar = () => mal(new Error('cancelada'))
      })
      animaciones.push({ efecto, resolver, rechazar })
      return { finished } as unknown as Animation
    } as typeof HTMLImageElement.prototype.animate
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
  })

  it('clona la imagen y la anima hasta la cesta', async () => {
    const origen = origenConImagen()
    cesta('nx-cart-icon', true)

    vuelaALaCesta(origen)

    expect(animaciones).toHaveLength(1)
    const copia = document.querySelector<HTMLImageElement>('body > img')
    expect(copia, 'la copia se añade al body, no dentro de la tarjeta').not.toBeNull()
    expect(copia!.src).toContain('foto.jpg')
  })

  /** Si se quedara, taparía los clics de lo que hay debajo durante el resto de la sesión. */
  it('retira la copia al terminar', async () => {
    vuelaALaCesta(origenConImagen())
    cesta('nx-cart-icon', true)
    document.body.innerHTML = ''
    const origen = origenConImagen()
    cesta('nx-cart-icon', true)
    vuelaALaCesta(origen)

    animaciones.at(-1)!.resolver()
    await Promise.resolve()
    await Promise.resolve()

    expect(document.querySelector('body > img')).toBeNull()
  })

  /** Navegar a media animación la CANCELA: el `finished` rechaza, y aun así hay que limpiar. */
  it('retira la copia aunque la animación se cancele', async () => {
    const origen = origenConImagen()
    cesta('nx-cart-icon', true)
    vuelaALaCesta(origen)

    animaciones[0].rechazar()
    await Promise.resolve()
    await Promise.resolve()

    expect(document.querySelector('body > img')).toBeNull()
  })

  it('no anima si se pidió reducir el movimiento', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    const origen = origenConImagen()
    cesta('nx-cart-icon', true)

    vuelaALaCesta(origen)

    expect(animaciones).toHaveLength(0)
    expect(document.querySelector('body > img')).toBeNull()
  })

  /**
   * EL caso del móvil: allí la cesta de la cabecera está oculta. Volar hacia un elemento que no se
   * pinta manda la imagen a la esquina superior izquierda, que es donde el navegador dice que está.
   */
  it('vuela a la cesta del móvil cuando la de la cabecera está oculta', () => {
    const origen = origenConImagen()
    cesta('nx-cart-icon', false)
    const movil = conRectangulo(cesta('nx-cart-icon-movil', true), 160, 900, 30, 30)

    vuelaALaCesta(origen)

    expect(animaciones).toHaveLength(1)
    const ultimo = animaciones[0].efecto.at(-1)!['transform'] as string
    const destino = movil.getBoundingClientRect()
    const esperadoX = Math.round(destino.left + destino.width / 2 - (10 + 50))
    expect(ultimo, `debería dirigirse a la cesta de abajo`).toContain(`${esperadoX}px`)
  })

  it('no hace nada si no hay ninguna cesta a la vista', () => {
    vuelaALaCesta(origenConImagen())

    expect(animaciones).toHaveLength(0)
    expect(document.querySelector('body > img')).toBeNull()
  })

  it('no hace nada sin origen ni sin imagen dentro', () => {
    cesta('nx-cart-icon', true)
    vuelaALaCesta(null)
    vuelaALaCesta(document.createElement('div'))

    expect(animaciones).toHaveLength(0)
  })

  /** La copia es decoración: el aviso de que se añadió ya lo da el texto. */
  it('la copia no la lee un lector de pantalla ni captura clics', () => {
    const origen = origenConImagen()
    cesta('nx-cart-icon', true)

    vuelaALaCesta(origen)

    const copia = document.querySelector<HTMLImageElement>('body > img')!
    expect(copia.getAttribute('aria-hidden')).toBe('true')
    expect(copia.alt).toBe('')
    expect(copia.style.pointerEvents).toBe('none')
  })
})
