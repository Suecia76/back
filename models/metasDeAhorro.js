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
    avances: [AvanceSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Meta", MetasSchema);
