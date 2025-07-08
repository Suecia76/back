import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lastname: { type: String, required: true },
    age: { type: Number, required: true },
    phonenumber: { type: Number, required: true },
    email: { type: String, required: true, unique: true }, // Email único
    email_verified_at: { type: Date, required: false }, // Campo opcional
    password: { type: String, required: true },
    remember_token: { type: String, required: false }, // Campo opcional para recordar la sesión
    image: { type: String, required: false }, // Campo opcional para la imagen de perfil
    saldo: {
      type: Number,
      default: 0, // Valor inicial
    },
  },
  { timestamps: true } // Incluye createdAt y updatedAt
);

export default mongoose.model("Usuario", UserSchema);
