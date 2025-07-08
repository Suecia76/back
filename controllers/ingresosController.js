import Ingreso from "../models/ingresos.js";
import mongoose from "mongoose";
import Usuario from "../models/usuarios.js";

export const obtenerIngresos = async (req, res) => {
  try {
    const ingresos = await Ingreso.find();
    res.json(ingresos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const crearIngresos = async (req, res) => {
  try {
    const {
      user_fk,
      categoria_fk,
      nombre = "Ingreso sin nombre",
      descripcion = "Sin descripción",
      cantidad = 0,
      tipo = "variable",
      cuotas = 1,
      frecuencia = "mensual",
      fechaInicio,
      cuotasAutomaticas = true,
    } = req.body;

    console.log(cuotasAutomaticas);
    // Validar que los datos requeridos estén presentes
    if (!user_fk || !categoria_fk || !cantidad || !tipo) {
      return res.status(400).json({ message: "Faltan datos requeridos." });
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

    // Validar tipo
    if (!["fijo", "variable"].includes(tipo)) {
      return res
        .status(400)
        .json({ message: "El tipo debe ser 'fijo' o 'variable'." });
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

    // Crear el nuevo ingreso
    const nuevoIngreso = new Ingreso({
      user_fk: new mongoose.Types.ObjectId(user_fk),
      categoria_fk: new mongoose.Types.ObjectId(categoria_fk),
      nombre,
      descripcion,
      cantidad: cantidad > 0 ? cantidad : 0,
      tipo,
      cuotas: cuotasFinal,
      frecuencia: frecuenciaFinal,
      fechaInicio: fechaInicioFinal,
      cuotasAutomaticas: cuotasAutomaticas,
      pendienteConfirmacion,
    });

    const ingresoGuardado = await nuevoIngreso.save();

    // Solo acreditar el saldo si:
    // - Es sin cuotas (cuotasFinal === 1)
    // - O es en cuotas automáticas y la fecha de inicio es hoy o anterior (primera cuota automática)
    if (
      cuotasFinal === 1 ||
      (cuotasAutomaticas === true &&
        cuotasFinal > 1 &&
        fechaInicioFinal.setHours(0, 0, 0, 0) <=
          new Date().setHours(0, 0, 0, 0))
    ) {
      // Acreditar solo UNA cuota
      await Usuario.findByIdAndUpdate(user_fk, {
        $inc: { saldo: cantidad / cuotasFinal },
      });
    }

    res.status(201).json({
      message: "Ingreso creado exitosamente.",
      ingreso: ingresoGuardado,
      detalles: {
        cuotasAplicadas: ingresoGuardado.cuotas,
        frecuenciaAplicada: ingresoGuardado.frecuencia,
        fechaInicioAplicada: ingresoGuardado.fechaInicio,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

export const paginadoIngresos = async (req, res) => {
  try {
    //declare la pagina y el limite de documentos que aparecen en la peticion
    //doy la opcion de que me pasen los limites y las paginas y sino me pasan nada tiene un valor por defecto
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 10;

    //declaro skip, que lo que hace es restar la pagina actual por 1 y y mutltiplicar por el limite
    //así me va a dar la cantidad de documentos a saltear
    const skip = (pagina - 1) * limite;

    //luego declaro ingresos en el que busco los ingresos existentes y salteo la cantidad calculada anteriormente y limito
    //cuantos quiero que aparezcan
    const ingresos = await Ingreso.find().skip(skip).limit(limite);

    //luego calculo la cantidad de ingresos existentes con la funcion countDocuments
    const totalIngresos = await Ingreso.countDocuments();

    //para luego poder calcular cuantas paginas hay
    const totalPaginas = Math.ceil(totalIngresos / limite);

    //por ultimo devuelvo los ingresos, la pagina, el total de pagina y el total de ingresos
    res.json({
      ingresos,
      pagina: pagina,
      numeroPaginas: totalPaginas,
      totalIngresos,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const obtenerIngresosId = async (req, res) => {
  try {
    const ingreso = await Ingreso.findById(req.params.id);
    if (!ingreso) {
      return res.status(404);
    }
    res.json(ingreso);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const obtenerIngresosByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "El userId no es un ObjectId válido." });
    }

    const ingresos = await Ingreso.find({ user_fk: userId });

    if (!ingresos.length) {
      return res
        .status(404)
        .json({ message: "No se encontraron ingresos para este usuario." });
    }

    res.json(ingresos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const modificarIngresos = async (req, res) => {
  try {
    const {
      cantidad,
      cuotas,
      frecuencia,
      fechaInicio,
      nombre,
      descripcion,
      tipo,
      categoria_fk,
      cuotasAutomaticas,
    } = req.body;

    // Obtener el ingreso original
    const ingresoOriginal = await Ingreso.findById(req.params.id);
    if (!ingresoOriginal) {
      return res.status(404).json({ message: "Ingreso no encontrado." });
    }

    // Calcular la diferencia entre el valor original y el nuevo
    let diferencia = 0;
    if (cantidad !== undefined) {
      diferencia = cantidad - ingresoOriginal.cantidad;
    }

    // Construir el objeto de actualización solo con los campos enviados
    const updateFields = {};
    if (cantidad !== undefined) updateFields.cantidad = cantidad;
    if (cuotas !== undefined) updateFields.cuotas = cuotas;
    if (frecuencia !== undefined) updateFields.frecuencia = frecuencia;
    if (fechaInicio !== undefined) updateFields.fechaInicio = fechaInicio;
    if (nombre !== undefined) updateFields.nombre = nombre;
    if (descripcion !== undefined) updateFields.descripcion = descripcion;
    if (tipo !== undefined) updateFields.tipo = tipo;
    if (categoria_fk !== undefined) updateFields.categoria_fk = categoria_fk;

    // Convertir cuotasAutomaticas a booleano si viene definido
    if (cuotasAutomaticas !== undefined)
      updateFields.cuotasAutomaticas = String(cuotasAutomaticas) === "true";

    // Si se cambia a manual y la fecha de inicio es hoy o anterior, poner pendienteConfirmacion en true
    if (
      updateFields.cuotasAutomaticas === false &&
      (cuotas !== undefined ? cuotas : ingresoOriginal.cuotas) > 0 &&
      (fechaInicio !== undefined
        ? new Date(fechaInicio)
        : ingresoOriginal.fechaInicio
      ).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)
    ) {
      updateFields.pendienteConfirmacion = true;
    }

    // Actualizar el ingreso
    const ingresoActualizado = await Ingreso.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    // Actualizar el saldo del usuario si la cantidad cambió
    if (diferencia !== 0) {
      await Usuario.findByIdAndUpdate(ingresoOriginal.user_fk, {
        $inc: { saldo: diferencia },
      });
    }

    res.json(ingresoActualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const eliminarIngresos = async (req, res) => {
  try {
    // Obtener el ingreso antes de eliminarlo
    const ingresoEliminado = await Ingreso.findById(req.params.id);
    if (!ingresoEliminado) {
      return res.status(404).json({ message: "Ingreso no encontrado." });
    }

    // Eliminar el ingreso
    await Ingreso.findByIdAndDelete(req.params.id);

    // Actualizar el saldo del usuario
    await Usuario.findByIdAndUpdate(ingresoEliminado.user_fk, {
      $inc: { saldo: -ingresoEliminado.cantidad },
    });

    res.json(ingresoEliminado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const confirmarIngreso = async (req, res) => {
  try {
    const ingreso = await Ingreso.findById(req.params.id);

    if (!ingreso) {
      return res.status(404).json({ message: "Ingreso no encontrado." });
    }

    // Solo permitir confirmar si está pendiente
    if (!ingreso.pendienteConfirmacion) {
      return res
        .status(400)
        .json({ message: "El ingreso no está pendiente de confirmación." });
    }

    // Acreditar SOLO una cuota
    await Usuario.findByIdAndUpdate(ingreso.user_fk, {
      $inc: { saldo: ingreso.cantidad / ingreso.cuotas },
    });

    // Marcar como no pendiente y aumentar cuotasProcesadas
    ingreso.pendienteConfirmacion = false;
    ingreso.cuotasProcesadas = (ingreso.cuotasProcesadas || 0) + 1;
    await ingreso.save();

    res.json(ingreso);
  } catch (error) {
    console.error("Error al confirmar ingreso:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};
