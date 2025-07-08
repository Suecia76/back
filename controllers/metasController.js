import Meta from "../models/metasDeAhorro.js";
import mongoose from "mongoose";

export const obtenerMetas = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "El userId no es un ObjectId válido." });
    }

    const metas = await Meta.find({ user_fk: userId });

    if (!metas.length) {
      return res
        .status(404)
        .json({ message: "No se encontraron metas para este usuario." });
    }

    res.json(metas);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const obtenerMetaPorId = async (req, res) => {
  try {
    const meta = await Meta.findById(req.params.id);
    res.json(meta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const crearMetas = async (req, res) => {
  try {
    const { nombre, descripcion, progreso, tipo, user_fk, objetivo } = req.body;

    if (!user_fk || !objetivo || !nombre) {
      return res
        .status(400)
        .json({ message: "Todos los campos son requeridos." });
    }

    // Validar que user_fk sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(user_fk)) {
      return res
        .status(400)
        .json({ message: "El user_fk no es un ObjectId válido." });
    }

    const nuevaMeta = new Meta({
      user_fk: new mongoose.Types.ObjectId(user_fk),
      objetivo,
      nombre,
      descripcion,
      progreso,
      tipo,
    });

    const metaGuardada = await nuevaMeta.save();

    res.status(201).json({
      message: "Meta de ahorro creada exitosamente.",
      goal: metaGuardada,
    });
  } catch (error) {
    console.error("Error al crear la meta:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

export const eliminarMetas = async (req, res) => {
  try {
    const metaEliminada = await Meta.findByIdAndDelete(req.params.id);
    res.json(metaEliminada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const modificarMetas = async (req, res) => {
  try {
    const { progreso } = req.body;
    const meta = await Meta.findById(req.params.id);
    if (!meta) {
      return res.status(404).json({ message: "Meta no encontrada" });
    }

    // Si hay un nuevo avance, lo agregamos al historial
    if (progreso && progreso !== meta.progreso) {
      meta.avances.push({
        cantidad: progreso,
        fecha: new Date(),
      });
    }

    // Actualiza el resto de los campos
    Object.assign(meta, req.body);
    await meta.save();

    res.json(meta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const obtenerAvancesPorMes = async (req, res) => {
  try {
    const { userId } = req.params;
    const metas = await Meta.find({ user_fk: userId });

    const avancesPorMes = {};

    metas.forEach((meta) => {
      if (meta.avances && meta.avances.length > 0) {
        meta.avances.forEach((avance) => {
          const mes = avance.fecha.toLocaleString("default", {
            month: "short",
            year: "numeric",
          });
          avancesPorMes[mes] =
            (avancesPorMes[mes] || 0) + (avance.cantidad || 0);
        });
      }
    });

    res.json(avancesPorMes);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener avances por mes",
      error: error.message,
    });
  }
};
