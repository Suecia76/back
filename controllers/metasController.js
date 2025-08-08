import Meta from "../models/metasDeAhorro.js";
import Usuario from "../models/usuarios.js";
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
    const {
      nombre,
      descripcion,
      progreso = 0,
      tipo,
      user_fk,
      objetivo,
      montoMensual,
      porcentajeMensual,
      moneda_extranjera,
      porcentaje,
    } = req.body;

    if (req.body.moneda_extranjera) {
      const { nombre, simbolo } = req.body.moneda_extranjera;
      if (!nombre || !simbolo) {
        return res.status(400).json({
          message: "Faltan datos de la moneda extranjera (nombre o símbolo).",
        });
      }
    }

    if (!user_fk || !objetivo || !nombre) {
      return res
        .status(400)
        .json({ message: "Todos los campos son requeridos." });
    }

    if (!mongoose.Types.ObjectId.isValid(user_fk)) {
      return res
        .status(400)
        .json({ message: "El user_fk no es un ObjectId válido." });
    }

    const tipoMeta = {
      fecha: null,
      montoMensual: montoMensual ?? null,
      porcentajeMensual: porcentajeMensual ?? null,
    };

    // Crear arreglo de avances inicial, si progreso > 0
    const avancesIniciales = [];
    if (typeof progreso === "number" && progreso > 0) {
      avancesIniciales.push({
        cantidad: progreso,
        fecha: new Date(),
      });
    }

    const nuevaMeta = new Meta({
      user_fk: new mongoose.Types.ObjectId(user_fk),
      objetivo,
      nombre,
      descripcion,
      tipo: tipoMeta,
      moneda_extranjera: req.body.moneda_extranjera || null,
      avances: avancesIniciales, // importante para que el middleware calcule
      // NO asignar directamente progreso ni porcentaje
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
    const { tipo, montoMensual, porcentajeMensual, progreso } = req.body;

    const meta = await Meta.findById(req.params.id);
    if (!meta) {
      return res.status(404).json({ message: "Meta no encontrada" });
    }

    // Buscar el usuario
    const usuario = await Usuario.findById(meta.user_fk);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (tipo === "montoMensual") {
      meta.tipo = {
        montoMensual: montoMensual || 0,
        porcentajeMensual: null,
      };
    } else if (tipo === "porcentajeMensual") {
      meta.tipo = {
        montoMensual: null,
        porcentajeMensual: porcentajeMensual || 0,
      };
    } else {
      meta.tipo = {
        montoMensual: null,
        porcentajeMensual: null,
      };
    }

    //  Si la meta es en moneda extranjera y llega un avance
    if (meta.moneda_extranjera && req.body.avance) {
      const { cantidad, precioMoneda } = req.body.avance;

      if (cantidad && precioMoneda) {
        const totalEnPesos = cantidad * precioMoneda;

        if (usuario.saldo < totalEnPesos) {
          return res.status(400).json({ message: "Saldo insuficiente" });
        }

        meta.progreso += totalEnPesos;
        meta.avances.push({
          cantidad: cantidad,
          fecha: new Date(),
        });

        usuario.saldo -= totalEnPesos;
      }
    }

    //  Si llega un nuevo avance manual (progreso)
    if (typeof progreso === "number" && progreso > 0) {
      if (usuario.saldo < progreso) {
        return res.status(400).json({ message: "Saldo insuficiente" });
      }

      meta.avances.push({
        cantidad: progreso,
        fecha: new Date(),
      });

      usuario.saldo -= progreso;
    }

    //  Actualizar otros campos excepto los ya manejados
    const {
      tipo: _,
      montoMensual: __,
      porcentajeMensual: ___,
      progreso: ____,
      avance: _____,
      ...rest
    } = req.body;
    Object.assign(meta, rest);

    await meta.save();
    await usuario.save();

    res.json(meta);
  } catch (error) {
    console.error("Error al modificar la meta:", error);
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
