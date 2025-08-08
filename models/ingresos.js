import mongoose from "mongoose";

const IngresosSchema = new mongoose.Schema(
  {
    user_fk: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    categoria_fk: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria",
      required: true,
    },
    nombre: { type: String, required: true },
    descripcion: { type: String },
    cantidad: { type: Number, required: true },
    tipo: { type: String, enum: ["fijo", "variable"], required: true },
    cuotas: { type: Number, min: 1, default: 1 },
    frecuencia: {
      type: String,
      enum: ["mensual", "quincenal", "semanal"],
      default: "mensual",
    }, // Opcional
    fechaInicio: { type: Date, default: Date.now }, // Opcional
    pendienteConfirmacion: { type: Boolean, default: false },
    cuotasProcesadas: { type: Number, default: 0 },
    cuotasAutomaticas: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Ingreso", IngresosSchema);
