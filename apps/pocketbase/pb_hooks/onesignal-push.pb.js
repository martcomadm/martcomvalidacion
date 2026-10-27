/// <reference path="../pb_data/types.d.ts" />

$app.logger().info("Hook cargado: onesignal-push.pb.js")

/**
 * Hook: Notificación push (OneSignal) a los administradores por cada alta nueva en `registros`.
 *
 * Llega a todos los dispositivos donde un admin activó la campana en la web
 * (etiqueta rol=admin), aunque tengan el navegador cerrado.
 *
 * Variables de entorno requeridas (EasyPanel → servicio de PocketBase → Environment):
 * - ONESIGNAL_APP_ID    (OneSignal → Settings → Keys & IDs → App ID)
 * - ONESIGNAL_API_KEY   (OneSignal → Settings → Keys & IDs → App API Key)
 * Opcional:
 * - SITE_URL            (por defecto https://validacionmartcom.site)
 *
 * Notas:
 * - NO bloquea la creación del registro si OneSignal falla.
 * - No envía datos personales (nombre, NSS, CURP); solo ejecutivo, plan, tipo y chat.
 */

onRecordAfterCreateSuccess((e) => {
    if (e.record.collection().name !== "registros") {
        return e.next()
    }

    const appId = $os.getenv("ONESIGNAL_APP_ID")
    const apiKey = $os.getenv("ONESIGNAL_API_KEY")
    const siteUrl = ($os.getenv("SITE_URL") || "https://validacionmartcom.site").replace(/\/+$/, "")

    if (!appId || !apiKey) {
        $app.logger().warn("OneSignal no configurado: faltan ONESIGNAL_APP_ID / ONESIGNAL_API_KEY. Se omite notificación.")
        return e.next()
    }

    const r = e.record
    const ejecutivo = r.getString("ejecutivo") || "Sin ejecutivo"
    const detalle = [r.getString("plan"), r.getString("tipo_ingreso"), r.getString("chat")]
        .filter((v) => v)
        .join(" · ")

    const body = {
        app_id: appId,
        target_channel: "push",
        filters: [{ field: "tag", key: "rol", relation: "=", value: "admin" }],
        headings: { en: "Nueva alta · " + ejecutivo },
        contents: { en: detalle || "Se capturó un nuevo registro" },
        url: siteUrl + "/seguimiento",
        priority: 10,
        ttl: 86400
    }

    try {
        const response = $http.send({
            url: "https://api.onesignal.com/notifications?c=push",
            method: "POST",
            headers: {
                "Authorization": "Key " + apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            timeout: 8
        })

        if (response.statusCode < 200 || response.statusCode >= 300) {
            $app.logger().error(
                "Falló envío de push OneSignal",
                "statusCode", response.statusCode,
                "response", response.json || response.body,
                "recordId", r.id
            )
        } else {
            $app.logger().info("Push OneSignal enviado", "id", response.json?.id || "N/A", "recordId", r.id)
        }
    } catch (err) {
        $app.logger().error("Excepción enviando push OneSignal", "error", err, "recordId", r.id)
    }

    return e.next()
})
