import mongoose from "mongoose";

const NotificacionSchema = new mongoose.Schema(
  {
    user_fk: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    titulo: { type: String, required: true },
    body: { type: String, required: true },
    imagen: { type: String }, // URL o path de imagen opcional
    leida: { type: Boolean, default: false },
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Notificacion", NotificacionSchema);