# Migraciones de base de datos

Coloca en esta carpeta scripts versionados (p. ej. `202405101200-add-field.js`) para aplicar cambios incrementales sobre las colecciones.
Cada script debe exportar dos funciones: `up` y `down`, ambas reciben la instancia de `mongoose` conectada.

Ejemplo:

```js
module.exports = {
  async up(mongoose) {
    await mongoose.connection.collection('texts').updateMany({}, { $set: { archived: false } });
  },
  async down(mongoose) {
    await mongoose.connection.collection('texts').updateMany({}, { $unset: { archived: '' } });
  }
};
```

Luego puedes ejecutar tus migraciones con un runner personalizado en `scripts/migrate.js`.
