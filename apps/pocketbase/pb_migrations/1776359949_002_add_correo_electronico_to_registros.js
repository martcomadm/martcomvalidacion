/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("registros");

  const existing = collection.fields.getByName("correo_electronico");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("correo_electronico"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "correo_electronico",
    values: ["S\u00ed", "No"]
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("registros");
    collection.fields.removeByName("correo_electronico");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})
