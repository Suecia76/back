import Gasto from "../models/gastos.js";
import Usuario from "../models/usuarios.js";
import mongoose from "mongoose";

export const obtenerGastos = async (req, res) => {
  try {
    const gastos = await Gasto.find();
    res.json(gastos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const crearGastos = async (req, res) => {
  try {
    const {
      nombre = "Gasto sin nombre",
      descripcion = "Sin descripción",
      cantidad = 0,
      tipo = "variable",
      user_fk,
      estado = "pendiente",
      categoria_fk,
      cuotas = 1,
      frecuencia = "mensual",
      fechaInicio,
      cuotasAutomaticas = true,
    } = req.body;

    console.log(cuotasAutomaticas);
    // Validar que los datos requeridos estén presentes
    if (!user_fk || !categoria_fk) {
      return res
        .status(400)
        .json({ message: "El usuario y la categoría son requeridos." });
    }

    // Validar que los IDs sean válidos
    if (!mongoose.Types.ObjectId.isValid(user_fk)) {
      return res
        .status(400)
        .json({ message: "El user_fk no es un ObjectId válido." });
    }
    if (!mongoose.Types.ObjectId.isValid(categoria_fk)) {
      return res
        .status(400)
        .json({ message: "El categoria_fk no es un ObjectId válido." });
    }

    // Validar frecuencia
    const frecuenciasValidas = ["mensual", "quincenal", "semanal"];
    const frecuenciaFinal = frecuenciasValidas.includes(frecuencia)
      ? frecuencia
      : "mensual";

    // Validar cuotas
    const cuotasFinal = Number.isInteger(cuotas) && cuotas > 0 ? cuotas : 1;

    // Validar fechaInicio
    let fechaInicioFinal = fechaInicio ? new Date(fechaInicio) : new Date();

    // Determinar si la primera cuota debe quedar pendiente de confirmación
    let pendienteConfirmacion = false;
    if (
      cuotasAutomaticas === false &&
      cuotasFinal > 0 &&
      fechaInicioFinal.setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)
    ) {
      pendienteConfirmacion = true;
    }

    // Crear el nuevo gasto
    const nuevoGasto = new Gasto({
      user_fk: new mongoose.Types.ObjectId(user_fk),
      categoria_fk: new mongoose.Types.ObjectId(categoria_fk),
      nombre,
      descripcion,
      cantidad: cantidad > 0 ? cantidad : 0,
      estado: ["pendiente", "pagado"].includes(estado) ? estado : "pendiente",
      tipo: ["fijo", "variable"].includes(tipo) ? tipo : "variable",
      cuotas: cuotasFinal,
      frecuencia: frecuenciaFinal,
      fechaInicio: fechaInicioFinal,
      cuotasAutomaticas: cuotasAutomaticas,
      pendienteConfirmacion: pendienteConfirmacion,
    });

    const gastoGuardado = await nuevoGasto.save();

    // Solo descontar el saldo si:
    // - Es sin cuotas (cuotasFinal === 1) y está pagado
    // - O es en cuotas automáticas, está pagado y la fecha de inicio es hoy o anterior (primera cuota automática)
    if (
      (cuotasFinal === 1 && estado === "pagado") ||
      (cuotasAutomaticas === true &&
        cuotasFinal > 1 &&
        estado === "pagado" &&
        fechaInicioFinal.setHours(0, 0, 0, 0) <=
          new Date().setHours(0, 0, 0, 0))
    ) {
      // Descontar solo UNA cuota
      await Usuario.findByIdAndUpdate(user_fk, {
        $inc: { saldo: -cantidad / cuotasFinal },
      });
    }

    res.status(201).json({
      message: "Gasto creado exitosamente.",
      gasto: gastoGuardado,
      detalles: {
        estadoAplicado: gastoGuardado.estado,
        tipoAplicado: gastoGuardado.tipo,
        cuotasAplicadas: gastoGuardado.cuotas,
        frecuenciaAplicada: gastoGuardado.frecuencia,
        fechaInicioAplicada: gastoGuardado.fechaInicio,
      },
    });
  } catch (error) {
    console.error("Error al crear el gasto:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

export const paginadoGastos = async (req, res) => {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 10;
    const skip = (pagina - 1) * limite;

    const gastos = await Gasto.find().skip(skip).limit(limite);
    const totalGastos = await Gasto.countDocuments();
    const totalPaginas = Math.ceil(totalGastos / limite);

    res.json({
      gastos,
      pagina,
      numeroPaginas: totalPaginas,
      totalGastos,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const obtenerGastosId = async (req, res) => {
  try {
    const gasto = await Gasto.findById(req.params.id);
    if (!gasto) {
      return res.status(404).json({ message: "Gasto no encontrado." });
    }
    res.json(gasto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const modificarGastos = async (req, res) => {
  try {
    const {
      cantidad,
      estado,
      cuotas,
      frecuencia,
      fechaInicio,
      nombre,
      descripcion,
      tipo,
      categoria_fk,
      cuotasAutomaticas,
    } = req.body;

    // Obtener el gasto original
    const gastoOriginal = await Gasto.findById(req.params.id);
    if (!gastoOriginal) {
      return res.status(404).json({ message: "Gasto no encontrado." });
    }

    // Calcular la diferencia en el saldo
    let diferencia = 0;
    if (estado === "pagado") {
      if (gastoOriginal.estado === "pagado") {
        diferencia = gastoOriginal.cantidad - cantidad;
      } else {
        diferencia = -cantidad;
      }
    } else if (gastoOriginal.estado === "pagado") {
      diferencia = gastoOriginal.cantidad;
    }

    // Construir el objeto de actualización solo con los campos enviados
    const updateFields = {};
    if (cantidad !== undefined) updateFields.cantidad = cantidad;
    if (estado !== undefined) updateFields.estado = estado;
    if (cuotas !== undefined) updateFields.cuotas = cuotas;
    if (frecuencia !== undefined) updateFields.frecuencia = frecuencia;
    if (fechaInicio !== undefined) updateFields.fechaInicio = fechaInicio;
    if (nombre !== undefined) updateFields.nombre = nombre;
    if (descripcion !== undefined) updateFields.descripcion = descripcion;
    if (tipo !== undefined) updateFields.tipo = tipo;
    if (categoria_fk !== undefined) updateFields.categoria_fk = categoria_fk;
    if (cuotasAutomaticas !== undefined)
      updateFields.cuotasAutomaticas =
        cuotasAutomaticas === true || cuotasAutomaticas === "true";

    // Verificar si se debe marcar como pendiente de confirmación
    if (
      updateFields.cuotasAutomaticas === false &&
      (cuotas !== undefined ? cuotas : gastoOriginal.cuotas) > 0 &&
      (fechaInicio !== undefined
        ? new Date(fechaInicio)
        : gastoOriginal.fechaInicio
      ).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)
    ) {
      updateFields.pendienteConfirmacion = true;
    }

    // Actualizar el gasto
    const gastoActualizado = await Gasto.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    // Actualizar el saldo del usuario si hay una diferencia
    if (diferencia !== 0) {
      await Usuario.findByIdAndUpdate(gastoOriginal.user_fk, {
        $inc: { saldo: diferencia },
      });
    }

    res.json(gastoActualizado);
  } catch (error) {
    console.error("Error al modificar el gasto:", error);
    res.status(400).json({ error: error.message });
  }
};

export const eliminarGastos = async (req, res) => {
  try {
    // Obtener el gasto antes de eliminarlo
    const gastoEliminado = await Gasto.findById(req.params.id);
    if (!gastoEliminado) {
      return res.status(404).json({ message: "Gasto no encontrado." });
    }

    // Eliminar el gasto
    await Gasto.findByIdAndDelete(req.params.id);

    // Actualizar el saldo del usuario si el gasto estaba pagado
    if (gastoEliminado.estado === "pagado") {
      await Usuario.findByIdAndUpdate(gastoEliminado.user_fk, {
        $inc: { saldo: gastoEliminado.cantidad },
      });
    }

    res.json(gastoEliminado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const obtenerGastosByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "El userId no es un ObjectId válido." });
    }

    const gastos = await Gasto.find({ user_fk: userId });

    if (!gastos.length) {
      return res
        .status(404)
        .json({ message: "No se encontraron gastos para este usuario." });
    }

    res.json(gastos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const obtenerGastosPorCategoria = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validar que el userId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "El userId no es un ObjectId válido." });
    }

    // Agrupar los gastos por categoría y calcular el total
    const gastosPorCategoria = await Gasto.aggregate([
      { $match: { user_fk: new mongoose.Types.ObjectId(userId) } }, // Filtrar por usuario
      {
        $group: {
          _id: "$categoria_fk", // Agrupar por categoría
          total: { $sum: "$cantidad" }, // Sumar el campo "cantidad" para cada categoría
        },
      },
      {
        $lookup: {
          from: "categorias", // Nombre de la colección de categorías
          localField: "_id", // Campo local (_id del grupo, que es categoria_fk)
          foreignField: "_id", // Campo en la colección "categorias"
          as: "categoria", // Nombre del campo donde se almacenará la categoría relacionada
        },
      },
      {
        $unwind: "$categoria", // Descomponer el array "categoria" en un objeto
      },
    ]);

    res.json(gastosPorCategoria); // Devolver los datos al cliente
  } catch (error) {
    console.error("Error al obtener los gastos por categoría:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

export const confirmarGasto = async (req, res) => {
  try {
    const gasto = await Gasto.findById(req.params.id);

    if (!gasto) {
      return res.status(404).json({ message: "Gasto no encontrado." });
    }

    // Solo permitir confirmar si está pendiente
    if (!gasto.pendienteConfirmacion) {
      return res
        .status(400)
        .json({ message: "El gasto no está pendiente de confirmación." });
    }

    // Descontar SOLO una cuota
    await Usuario.findByIdAndUpdate(gasto.user_fk, {
      $inc: { saldo: -gasto.cantidad / gasto.cuotas },
    });

    // Marcar como no pendiente y aumentar cuotasProcesadas
    gasto.pendienteConfirmacion = false;
    console.log("Cuotas procesadas antes:", gasto.cuotasProcesadas);
    gasto.cuotasProcesadas = (gasto.cuotasProcesadas || 0) + 1;
    console.log("Cuotas procesadas después:", gasto.cuotasProcesadas);
    await gasto.save();

    res.json(gasto);
  } catch (error) {
    console.error("Error al confirmar gasto:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};
