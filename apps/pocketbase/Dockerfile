FROM alpine:latest

WORKDIR /app

# Instalar dependencias necesarias
RUN apk add --no-cache unzip wget

# Descargar PocketBase (versión nueva compatible con CORS)
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.23.0/pocketbase_0.23.0_linux_amd64.zip \
    && unzip pocketbase_0.23.0_linux_amd64.zip \
    && chmod +x pocketbase \
    && rm pocketbase_0.23.0_linux_amd64.zip

# Copiar archivos del proyecto
COPY . .

# Exponer puerto
EXPOSE 8090

# Ejecutar PocketBase con CORS habilitado
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090", "--http-cors=*"]
