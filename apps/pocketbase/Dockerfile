FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache unzip wget

# 🔥 eliminar binario anterior si existe
RUN rm -f pocketbase

# descargar versión nueva
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.36.7/pocketbase_0.36.7_linux_amd64.zip \
    && unzip pocketbase_0.36.7_linux_amd64.zip \
    && chmod +x pocketbase \
    && rm pocketbase_0.36.7_linux_amd64.zip

COPY . .

# Hooks activos en producción. EasyPanel puede construir desde la raíz del
# repositorio (hooks en /app/apps/pocketbase/pb_hooks) o desde apps/pocketbase
# (hooks en /app/pb_hooks); se copian aquí desde donde estén para que PocketBase
# siempre los encuentre. Por ahora solo se activa el de notificaciones push.
RUN mkdir -p /app/pb_hooks_active \
    && SRC=$(ls /app/pb_hooks/onesignal-push.pb.js /app/apps/pocketbase/pb_hooks/onesignal-push.pb.js 2>/dev/null | head -n 1) \
    && test -n "$SRC" \
    && cp "$SRC" /app/pb_hooks_active/ \
    && ls -la /app/pb_hooks_active

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090", "--origins=*", "--hooksDir=/app/pb_hooks_active"]
