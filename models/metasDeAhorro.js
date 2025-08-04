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
    progreso: { type: Number, default: 0 },
    nombre: { type: String, required: true },
    descripcion: { type: String },
    porcentaje: { type: Number, default: 0 },
    tipo: {
      fecha: { type: Date, default: null },
      montoMensual: { type: Number, default: null },
      porcentajeMensual: { type: Number, default: null },
    },
    moneda_extranjera: {
      nombre: { type: String, default: null },
      simbolo: { type: String, default: null },
    },
    avances: [AvanceSchema],
  },
  { timestamps: true }
);
MetasSchema.pre("save", function (next) {
  if (!this.avances || this.avances.length === 0) {
    this.progreso = 0;
    this.porcentaje = 0;
  } else {
    const totalAvance = this.avances.reduce((acc, a) => acc + a.cantidad, 0);
    this.progreso = totalAvance;
    this.porcentaje =
      this.objetivo > 0 ? (totalAvance / this.objetivo) * 100 : 0;
  }
  next();
});

export default mongoose.model("Meta", MetasSchema);
