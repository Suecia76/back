import express from "express";
import auth from "../middlewares/authMiddlewares.js";
import upload from "../middlewares/multerConfig.js";
import {
  obtenerUsuarios,
  obtenerUsuarioId,
  crearUsuario,
  iniciarSesionUsuario,
  modificarUsuario,
  eliminarUsuario,
  obtenerSaldoByUser,
  obtenerPendientesConfirmacion,
  obtenerMovimientosCalendario,
  guardarSuscripcionPush,
  guardarSuscripcionFCM,
  calcularResumenMensual,
} from "../controllers/usuariosController.js";

const router = express.Router();

// Obtener todos los Usuarios
router.get("/", obtenerUsuarios);

// Crear Usuarios nuevos
router.post("/", crearUsuario);

router.get("/saldo/:id", auth, obtenerSaldoByUser);

// routes/usuariosRoutes.js
router.get("/calendario/:userId", auth, obtenerMovimientosCalendario);

// Paginado de Usuarios
// router.get("/paginado", paginatedUsuarios);

// Ruta para iniciar sesión (login)
router.post("/login", iniciarSesionUsuario);

// Ruta para guardar la suscripción a notificaciones push
router.post("/suscripcion-push", guardarSuscripcionPush);

// Ruta para guardar la suscripción a FCM (Firebase Cloud Messaging)
router.post("/suscripcion-fcm", guardarSuscripcionFCM);

// Obtener un usuario por su ID
router.get("/:id", obtenerUsuarioId);

// Actualizar un usuario por su ID
router.put("/:id", upload.single("profileImage"), auth, modificarUsuario);

// Eliminar un usuario por su ID
router.delete("/:id", auth, eliminarUsuario);

router.get("/pendientes/:id", auth, obtenerPendientesConfirmacion);

router.get("/:id/resumen-mensual", auth, calcularResumenMensual);

export default router;
