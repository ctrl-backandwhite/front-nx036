# ══════════════════════════════════════════════════════════════════════════════
# Etapa 1 · Construcción
# ══════════════════════════════════════════════════════════════════════════════
# Debian/glibc (node:22), NUNCA alpine/musl. La misma trampa que documenta el
# Dockerfile del frontend de React, y aquí aplica por el mismo motivo: este
# proyecto también compila el CSS con Tailwind 4 (`@tailwindcss/postcss`), que
# arrastra `@tailwindcss/oxide`, un binario nativo. El candado trae la variante
# `@tailwindcss/oxide-linux-x64-gnu`, compilada contra glibc; sobre musl la
# construcción se cae al resolver el complemento de Tailwind. Comprobado en el
# `package-lock.json` antes de escribir esto, no heredado a ciegas del React.
FROM node:22 AS construccion
WORKDIR /app

# El manifiesto y el candado ANTES que el código: mientras esos dos ficheros no
# cambien, Docker reutiliza la capa de dependencias y la construcción se salta
# el minuto largo que tarda npm.
COPY package.json package-lock.json ./
# `npm ci` y no `npm install`: instala EXACTAMENTE lo que dice el candado y falla
# si el candado y el manifiesto no cuadran, en lugar de arreglarlo por su cuenta
# y dejar en la imagen versiones que nadie ha revisado.
RUN npm ci --no-audit --no-fund

COPY . .

# La CLI de Angular pregunta por la telemetría la primera vez que se ejecuta. En
# una construcción no interactiva esa pregunta no la contesta nadie: se apaga por
# variable de entorno para que no cuelgue ni mande nada hacia fuera.
ENV NG_CLI_ANALYTICS=false

# `npm run build` = `ng build` (configuración `production` por defecto, según
# `angular.json`). Con `outputMode: static` esto NO deja un servidor Node: el
# paquete de servidor se usa DURANTE la construcción para prerenderizar y luego
# se tira. Lo que queda es:
#   dist/front-nx036/browser/index.html       la portada ya pintada
#   dist/front-nx036/browser/index.csr.html   el esqueleto para el resto de rutas
#   dist/front-nx036/browser/*-HASH.js|css    los estáticos, con hash en el nombre
RUN npm run build

# ══════════════════════════════════════════════════════════════════════════════
# Etapa 2 · Imagen final
# ══════════════════════════════════════════════════════════════════════════════
# Aquí SÍ vale alpine, y es la diferencia grande con el Dockerfile del React.
# Aquel necesita `node:22-slim` en la imagen final porque su escaparate se pinta
# en servidor y el proceso Node sigue vivo en producción; por eso también arrastra
# `node_modules` y tiene una etapa entera dedicada a instalar las dependencias de
# producción a solas. Aquí no corre nada de Node: solo nginx entregando ficheros,
# así que la restricción glibc-frente-a-musl de arriba no alcanza a esta etapa
# —el binario de Tailwind solo hace falta al CONSTRUIR el CSS—. La imagen final
# baja de cientos de megas a unas decenas.
FROM nginx:alpine AS final

# La configuración va a `conf.d/default.conf`, PISANDO la de ejemplo que trae la
# imagen. No es por comodidad: esa configuración de ejemplo publica esta misma
# carpeta en el puerto 80 sin ninguna de nuestras reglas —sin el 403 a los
# rastreadores, sin el reenvío al backend y sin las reglas de caché—. Dejarla
# viva sería abrir una segunda puerta al mismo contenido, y sin protección.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Solo la carpeta `browser`. La salida de `ng build` tiene también
# `prerendered-routes.json` y `3rdpartylicenses.txt`, que son artefactos de la
# construcción y no tienen por qué acabar publicados en la web.
COPY --from=construccion /app/dist/front-nx036/browser /usr/share/nginx/html

# El mismo puerto que el escaparate de React, que es el que espera la pasarela
# de delante. Está declarado en el `listen` del nginx.conf.
EXPOSE 3003
