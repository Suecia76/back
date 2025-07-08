import express from "express";
import auth from "../middlewares/authMiddlewares.js";
import {
  obtenerIngresos,
  crearIngresos,
  paginadoIngresos,
  obtenerIngresosId,
  modificarIngresos,
  eliminarIngresos,
  obtenerIngresosByUser,
  confirmarIngreso,
} from "../controllers/ingresosController.js";

const router = express.Router();

// Obtener todos los Ingresos
router.get("/", obtenerIngresos);

// Crear Ingresos nuevos
router.post("/", auth, crearIngresos);

// Confirmar Ingreso
router.post("/:id/confirmar", auth, confirmarIngreso);

// Paginado de Ingresos
router.get("/paginado", paginadoIngresos);

// Obtener un ingreso por su ID
router.get("/:id", obtenerIngresosId);

router.get("/usuario/:userId", obtenerIngresosByUser);

// Actualizar un ingreso por su ID
router.put("/:id", auth, modificarIngresos);

// Eliminar un ingreso por su ID
router.delete("/:id", auth, eliminarIngresos);

export default router;
