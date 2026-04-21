FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache unzip wget

RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.6/pocketbase_0.22.6_linux_amd64.zip \
    && unzip pocketbase_0.22.6_linux_amd64.zip \
    && chmod +x pocketbase \
    && rm *.zip

COPY . .

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090", "--http-cors=https://martcom-validaciones-web-validacion.mchc0z.easypanel.host"]
