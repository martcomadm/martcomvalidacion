/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("registros");

  const existing = collection.fields.getByName("terminos_condiciones");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("terminos_condiciones"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "terminos_condiciones",
    values: ["S\u00ed", "No"]
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("registros");
    collection.fields.removeByName("terminos_condiciones");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})
