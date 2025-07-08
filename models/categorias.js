import mongoose from "mongoose";

const CategoriaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true },
    imagen: { type: String, required: false }, // URL o path de la imagen
    user_fk: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }, // Referencia al modelo Usuario
    predeterminada: { type: Boolean, default: false }, // Indica si es una categoría predeterminada
  },
  { timestamps: true } // Incluye createdAt y updatedAt
);

export default mongoose.model("Categoria", CategoriaSchema);
