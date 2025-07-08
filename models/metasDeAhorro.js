import mongoose from "mongoose";

const AvanceSchema = new mongoose.Schema(
  {
    cantidad: { type: Number, required: true },
    fecha: { type: Date, required: true },
  },
  { _id: false }
);

const MetasSchema = new mongoose.Schema(
  {
    user_fk: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      // Relación con la tabla de usuarios
    },
    objetivo: { type: Number, required: true },
    progreso: { type: Number, required: true },
    nombre: { type: String, required: true },
    descripcion: { type: String },
    tipo: {
      fecha: { type: Date, default: null },
      montoMensual: { type: Number, default: null },
      porcentajeMensual: { type: Number, default: null },
    },
    avances: [AvanceSchema], // <--- Nuevo campo
  },
  { timestamps: true } // Crea automáticamente los campos `createdAt` y `updatedAt`
);

export default mongoose.model("Meta", MetasSchema);
