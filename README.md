# NX036 — Escaparate y panel (`front-nx036`)

El frontend vivo de NX036: la tienda que ve quien compra y el panel de quien administra.

**Angular 22 · zoneless · Signals y Signal Forms · Tailwind 4 + daisyUI 5 · prerenderizado sin
servidor Node**

> Las **normas para escribir aquí** están en [`CLAUDE.md`](CLAUDE.md) y mandan sobre cualquier
> costumbre: arquitectura hexagonal, mobile first, CSS centralizado, qué API de Angular se usa y
> cuál está prohibida. Léelo antes de tocar código.

---

## Arrancar

Necesita el backend en marcha (`cd ../infra/docker && docker compose up -d`).

```bash
npm start          # queda en localhost:3004
```

**Navega por `localhost`, nunca por `127.0.0.1`.** El backend solo admite `localhost:3003` y
`localhost:3004` como orígenes: con la IP toda petición devuelve 403 y el acceso falla **sin ningún
mensaje de error**, como si la contraseña fuera incorrecta.

## Pruebas

```bash
npm test        # 3.900 pruebas en 404 ficheros a 25-sep-2026
npm run lint    # el lint verifica las fronteras del hexágono, no solo el estilo
```

Las dos en verde antes de dar nada por terminado. La norma del proyecto es **90 % de cobertura**, y
cada desarrollo llega con sus pruebas.

Hace falta **Node 22**. Bajo carga, una o dos pruebas fallan por pasada y pasan en solitario: es
conocido y no es tu cambio.

## Construir

```bash
npm run build:pre     # o :des, :pro
```

Dos variables son obligatorias al construir, y **si faltan no falla nada**: sale una web que parece
prerenderizada y no lo está.

- `NEXADROP_API_INTERNA` — un backend accesible desde donde se compila. Sin ella las peticiones del
  prerenderizado fallan en silencio y las páginas se escriben con sus marcadores de carga.
- `NEXADROP_PRERENDER_TOKEN` — debe valer lo mismo que `RATELIMIT_BUILD_TOKEN` en ese backend. Sin
  él solo caben unas quince fichas y el resto se generan con una página de error dentro.

## Desplegar

Lo hace el CI según la rama: `features` → desarrollo, `develop` → preproducción, `main` →
producción. Publica la imagen **y escribe él mismo el tag** en `nexadrop-deploy`. No se copian tags
a mano.

---

## Documentación

| Qué | Dónde |
|---|---|
| Normas de código y arquitectura | [`CLAUDE.md`](CLAUDE.md) |
| Por qué el hexágono y sus fronteras | [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) |
| Costuras entre contextos por coser | [`docs/INTEGRACION-PENDIENTE.md`](docs/INTEGRACION-PENDIENTE.md) |
| Defectos abiertos a la espera de decisión | [`docs/DEFECTOS-CERTIFICACION.md`](docs/DEFECTOS-CERTIFICACION.md) |
| Colores y tipografía | [`../docs/design-tokens.md`](../docs/design-tokens.md) |
