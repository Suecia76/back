import mongoose from "mongoose";

const SuscripcionesSchema = new mongoose.Schema({
  user_fk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
    unique: true,
  },
  subscription: {
    type: Object, // Suscripción web-push (puede ser null si solo usa FCM)
    required: false,
  },
  fcmToken: {
    type: String, // Token de Firebase Cloud Messaging
    required: false,
  },
});

export default mongoose.model("Suscripcion", SuscripcionesSchema);
