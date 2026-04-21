FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache unzip wget

# 🔥 eliminar binario anterior si existe
RUN rm -f pocketbase

# descargar versión nueva
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.23.0/pocketbase_0.23.0_linux_amd64.zip \
    && unzip pocketbase_0.23.0_linux_amd64.zip \
    && chmod +x pocketbase \
    && rm pocketbase_0.23.0_linux_amd64.zip

COPY . .

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090", "--origins=*"]
