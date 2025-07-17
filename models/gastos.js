import mongoose from "mongoose";

const GastosSchema = new mongoose.Schema(
  {
    user_fk: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    }, // Relación con la tabla de usuarios
    categoria_fk: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria",
      required: true,
    }, // Relación con la tabla de categorías
    nombre: { type: String, required: true },
    descripcion: { type: String },
    cantidad: { type: Number, required: true },
    tipo: { type: String, enum: ["fijo", "variable"], required: true }, // Define valores válidos para `tipo`
    estado: { type: String, enum: ["pendiente", "pagado"], required: true },
    cuotas: { type: Number, min: 1, default: 1 }, // Ya existe
    frecuencia: {
      type: String,
      enum: ["mensual", "quincenal", "semanal"],
      default: "mensual",
    }, // Nuevo
    fechaInicio: { type: Date, default: Date.now }, // Nuevo
    pendienteConfirmacion: { type: Boolean, default: false },
    cuotasProcesadas: { type: Number, default: 0 },
    cuotasAutomaticas: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Gasto", GastosSchema);
