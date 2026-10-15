/// <reference path="../pb_data/types.d.ts" />
// Hace opcional el campo "correo" de registros (antes era obligatorio).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("registros");
  const field = collection.fields.getByName("correo");
  if (!field || field.required === false) return;
  field.required = false;
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("registros");
  const field = collection.fields.getByName("correo");
  if (!field) return;
  field.required = true;
  return app.save(collection);
})
