import Usuario from "../models/usuarios.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import Ingreso from "../models/ingresos.js";
import Gasto from "../models/gastos.js";
import Suscripcion from "../models/suscripciones.js";

dotenv.config();

const secretKey = process.env.SECRET;

export const obtenerUsuarios = async (req, res) => {
  try {
    let users = await Usuario.find(); // Busca todos los usuarios en MongoDB
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

export const obtenerUsuarioId = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await Usuario.findById(userId); // Busca un usuario por su ID
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: "Usuario no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el usuario" });
  }
};

export const crearUsuario = async (req, res) => {
  const { name, password, phonenumber, age, lastname, email } = req.body;
  console.log("Datos recibidos:", req.body);
  if (!password) {
    return res.status(400).json({ message: "Contraseña es requerida" });
  }
  try {
    const salt = await bcrypt.genSalt(10);

    // Encripta la contraseña con el salt generado
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new Usuario({
      name,
      phonenumber,
      age,
      lastname,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === 11000) {
      // Código 11000 indica error de clave duplicada
      res.status(400).json({ message: "El email ya está registrado" });
    } else {
      console.error(error);
      res.status(500).json({ message: "Error al crear el usuario" });
    }
  }
};

export const iniciarSesionUsuario = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Usuario.findOne({ email }); // Busca un usuario por su email
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, secretKey, {
      expiresIn: "7d",
    });
    console.log(token);
    console.log("Email recibido:", email);
    console.log("Usuario encontrado:", user);
    console.log("Contraseña válida:", validPassword);

    // Devolver tanto el token como los datos del usuario
    res.status(200).json({
      token: token,
      usuario: {
        _id: user._id,
        email: user.email,
        name: user.name,
        // role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión" });
    console.error("Error interno en el servidor:", error);
  }
};

export const modificarUsuario = async (req, res) => {
  const userId = req.params.id;
  const { name, email, password } = req.body;
  const profileImage = req.file ? req.file.filename : null;

  try {
    const user = await Usuario.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Eliminar la imagen anterior si existe y se subió una nueva
    if (profileImage && user.image) {
      const oldImagePath = path.resolve("uploads/imagenes_perfil", user.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath); // Eliminar la imagen anterior
      }
    }

    // Actualizar los campos si están presentes en el body
    user.name = name || user.name;
    user.email = email || user.email;
    if (password) {
      user.password = await bcrypt.hash(password, 10); // Encriptar la nueva contraseña
    }
    if (profileImage) {
      user.profileImage = profileImage; // Guardar la nueva imagen de perfil
    }

    await user.save();
    res.status(200).json({ user });
  } catch (error) {
    console.error("Error al actualizar el usuario:", error);
    res.status(500).json({ message: "Error al actualizar el usuario" });
  }
};

export const eliminarUsuario = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await Usuario.findByIdAndDelete(userId); // Elimina el usuario por ID
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.status(204).send(); // 204 No Content
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el usuario" });
  }
};

export const obtenerSaldoByUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "El ID del usuario es requerido." });
    }

    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.status(200).json({ saldo: usuario.saldo });
  } catch (error) {
    console.error("Error al obtener el saldo del usuario:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

export const obtenerPendientesConfirmacion = async (req, res) => {
  try {
    const { id } = req.params;

    const ingresosPendientes = await Ingreso.find({
      user_fk: id,
      pendienteConfirmacion: true,
    });

    const gastosPendientes = await Gasto.find({
      user_fk: id,
      pendienteConfirmacion: true,
    });

    res.json({ ingresosPendientes, gastosPendientes });
  } catch (error) {
    console.error("Error al obtener pendientes de confirmación:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

export const obtenerMovimientosCalendario = async (req, res) => {
  try {
    const { userId } = req.params;

    // Obtener todos los ingresos y gastos del usuario
    const ingresos = await Ingreso.find({ user_fk: userId });
    const gastos = await Gasto.find({ user_fk: userId });

    // Expande los movimientos fijos y en cuotas
    const movimientos = [];

    // Procesar ingresos
    ingresos.forEach((ingreso) => {
      if (ingreso.tipo === "fijo") {
        // Repetir cada mes hasta hoy o hasta una fecha límite (ejemplo: 12 meses)
        const start = new Date(ingreso.createdAt);
        const limite = new Date();
        limite.setMonth(limite.getMonth() + 12); // muestra 12 meses a futuro

        let fecha = new Date(start);
        while (fecha <= limite) {
          movimientos.push({
            ...ingreso.toObject(),
            fecha: new Date(fecha),
            tipoMovimiento: "ingreso",
          });
          fecha.setMonth(fecha.getMonth() + 1);
        }
      } else {
        movimientos.push({
          ...ingreso.toObject(),
          fecha: ingreso.createdAt,
          tipoMovimiento: "ingreso",
        });
      }
    });

    // Procesar gastos
    gastos.forEach((gasto) => {
      if (gasto.tipo === "fijo") {
        const start = new Date(gasto.createdAt);
        const limite = new Date();
        limite.setMonth(limite.getMonth() + 12); // muestra 12 meses a futuro
        let fecha = new Date(start);
        while (fecha <= limite) {
          movimientos.push({
            ...gasto.toObject(),
            fecha: new Date(fecha),
            tipoMovimiento: "gasto",
          });
          fecha.setMonth(fecha.getMonth() + 1);
        }
      } else if (gasto.cuotas && gasto.cuotas > 1) {
        // Gastos en cuotas: repartir en cuotas mensuales
        const start = new Date(gasto.createdAt);
        for (let i = 0; i < gasto.cuotas; i++) {
          const fechaCuota = new Date(start);
          fechaCuota.setMonth(fechaCuota.getMonth() + i);
          movimientos.push({
            ...gasto.toObject(),
            fecha: fechaCuota,
            tipoMovimiento: "gasto",
            cuota: i + 1,
          });
        }
      } else {
        movimientos.push({
          ...gasto.toObject(),
          fecha: gasto.createdAt,
          tipoMovimiento: "gasto",
        });
      }
    });

    res.json(movimientos);
  } catch (error) {
    console.error("Error al obtener movimientos para calendario:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

export const guardarSuscripcionPush = async (req, res) => {
  try {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    // Guarda o actualiza la suscripción del usuario
    const suscripcion = await Suscripcion.findOneAndUpdate(
      { user_fk: userId },
      { subscription },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: "Suscripción guardada", suscripcion });
  } catch (error) {
    console.error("Error al guardar la suscripción push:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const guardarSuscripcionFCM = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    // Guarda o actualiza la suscripción FCM del usuario
    const suscripcion = await Suscripcion.findOneAndUpdate(
      { user_fk: userId },
      { fcmToken },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: "Token FCM guardado", suscripcion });
  } catch (error) {
    console.error("Error al guardar el token FCM:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const calcularResumenMensual = async (req, res) => {
  try {
    const userId = req.params.id;

    // 📌 Buscar usuario
    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // 📅 Rango del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(
      startOfMonth.getFullYear(),
      startOfMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // 📌 Traer solo movimientos activos y confirmados
    const [gastos, ingresos] = await Promise.all([
      Gasto.find({
        user_fk: userId,
        fechaInicio: { $lte: endOfMonth },
        pendienteConfirmacion: false,
      }),
      Ingreso.find({
        user_fk: userId,
        fechaInicio: { $lte: endOfMonth },
        pendienteConfirmacion: false,
      }),
    ]);

    // 📌 Calcular cuota correspondiente a este periodo
    const calcularCuotaMes = (movimiento) => {
      const totalCuotas = movimiento.cuotas || 1;
      const inicio = new Date(movimiento.fechaInicio);

      let periodosPasados;

      switch (movimiento.frecuencia) {
        case "semanal":
          periodosPasados = Math.floor(
            (startOfMonth - inicio) / (7 * 24 * 60 * 60 * 1000)
          );
          break;
        case "quincenal":
          periodosPasados = Math.floor(
            (startOfMonth - inicio) / (15 * 24 * 60 * 60 * 1000)
          );
          break;
        case "mensual":
        default:
          periodosPasados =
            (startOfMonth.getFullYear() - inicio.getFullYear()) * 12 +
            (startOfMonth.getMonth() - inicio.getMonth());
          break;
      }

      const cuotaActual = periodosPasados + 1; // porque la primera cuota es 1

      // 🛑 No contar si:
      if (
        cuotaActual <= 0 || // aún no empieza
        cuotaActual > totalCuotas // ya terminaron todas las cuotas
      ) {
        return 0;
      }

      return movimiento.cantidad / totalCuotas;
    };

    // 📊 Calcular totales del mes
    const totalGastosMes = gastos.reduce(
      (total, gasto) => total + calcularCuotaMes(gasto),
      0
    );
    const totalIngresosMes = ingresos.reduce(
      (total, ingreso) => total + calcularCuotaMes(ingreso),
      0
    );

    // 📌 Sumar al saldo actual
    const disponible = usuario.saldo + totalIngresosMes - totalGastosMes;

    res.json({
      saldoActual: usuario.saldo,
      totalIngresosMes,
      totalGastosMes,
      disponible,
    });
  } catch (error) {
    console.error("Error al calcular resumen mensual:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};
