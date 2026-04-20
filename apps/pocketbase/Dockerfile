FROM alpine:latest

WORKDIR /app

COPY . .

RUN chmod +x apps/pocketbase

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
