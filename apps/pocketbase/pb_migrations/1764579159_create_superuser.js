/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const email = ($os.getenv("PB_SUPERUSER_EMAIL") || "").trim()
    const password = ($os.getenv("PB_SUPERUSER_PASSWORD") || "").trim()

    // No romper arranque si no hay credenciales configuradas.
    if (!email || !password) {
        console.log("Skipping superuser migration: PB_SUPERUSER_EMAIL/PB_SUPERUSER_PASSWORD not set")
        return
    }

    const superusers = app.findCollectionByNameOrId("_superusers")

    // Evitar duplicados si ya existe.
    try {
        const existing = app.findAuthRecordByEmail(superusers.id, email)
        if (existing) {
            console.log("Skipping superuser migration: superuser already exists")
            return
        }
    } catch (_) {
        // Si no existe, continúa creación.
    }

    const record = new Record(superusers)
    record.set("email", email)
    record.set("password", password)

    app.save(record)
}, (app) => {
    const email = ($os.getenv("PB_SUPERUSER_EMAIL") || "").trim()
    if (!email) {
        return
    }

    try {
        const superusers = app.findCollectionByNameOrId("_superusers")
        const existing = app.findAuthRecordByEmail(superusers.id, email)
        if (existing) {
            app.delete(existing)
        }
    } catch (_) {
        // Sin acción en rollback si no existe.
    }
})
