/// <reference path="../pb_data/types.d.ts" />

$app.logger().info("Hook cargado: twilio-whatsapp.pb.js")

/**
 * Hook: Enviar notificación por WhatsApp (Twilio) al crear un registro en `registros`.
 *
 * Variables de entorno requeridas:
 * - TWILIO_ACCOUNT_SID      (ej: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
 * - TWILIO_AUTH_TOKEN       (token secreto de Twilio)
 * - TWILIO_WHATSAPP_FROM    (ej: whatsapp:+14155238886)
 * - TWILIO_WHATSAPP_TO      (ej: whatsapp:+52XXXXXXXXXX)
 *
 * Notas:
 * - Este hook NO bloquea la creación del registro si falla Twilio.
 * - Para sandbox de Twilio, el número destino debe estar unido al sandbox.
 * - Usa plantilla aprobada vía Content SID (sin variables).
 */

onRecordAfterCreateSuccess((e) => {
    // Solo para la colección objetivo
    if (e.record.collection().name !== "registros") {
        return e.next()
    }

    const accountSid = $os.getenv("TWILIO_ACCOUNT_SID")
    const authToken = $os.getenv("TWILIO_AUTH_TOKEN")
    const from = $os.getenv("TWILIO_WHATSAPP_FROM")
    const to = $os.getenv("TWILIO_WHATSAPP_TO")

    if (!accountSid || !authToken || !from || !to) {
        $app.logger().warn(
            "Twilio WhatsApp no configurado: faltan variables de entorno. Se omite notificación."
        )
        return e.next()
    }

    const record = e.record

    const contentSid = "HX8f98a5af1b2da6c504c612334f5050aa"

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const authHeader = "Basic " + $security.base64Encode(`${accountSid}:${authToken}`)

    // x-www-form-urlencoded para Twilio API usando plantilla aprobada
    const formBody =
        "From=" + encodeURIComponent(from) +
        "&To=" + encodeURIComponent(to) +
        "&ContentSid=" + encodeURIComponent(contentSid)

    try {
        const response = $http.send({
            url: twilioUrl,
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formBody,
            timeout: 30
        })

        if (response.statusCode < 200 || response.statusCode >= 300) {
            $app.logger().error(
                "Falló envío WhatsApp Twilio",
                "statusCode", response.statusCode,
                "response", response.json || response.body
            )
            return e.next()
        }

        const sid = response.json?.sid || "N/A"
        $app.logger().info("WhatsApp Twilio enviado correctamente", "sid", sid, "recordId", record.id)
    } catch (err) {
        $app.logger().error("Excepción enviando WhatsApp Twilio", "error", err, "recordId", record.id)
    }

    return e.next()
})
