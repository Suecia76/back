import Notificacion from "../models/notificaciones.js";

export const obtenerNotificaciones = async (req, res) => {
  try {
    const { userId } = req.params;
    const notificaciones = await Notificacion.find({ user_fk: userId }).sort({ fecha: -1 });
    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener notificaciones" });
  }
};

export const borrarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    await Notificacion.findByIdAndDelete(id);
    res.json({ message: "Notificación eliminada" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar notificación" });
  }
};
