import express from "express";
import auth from "../middlewares/authMiddlewares.js";
import {
  obtenerGastos,
  crearGastos,
  paginadoGastos,
  obtenerGastosId,
  modificarGastos,
  eliminarGastos,
  obtenerGastosByUser,
  obtenerGastosPorCategoria,
  confirmarGasto,
} from "../controllers/gastosController.js";

const router = express.Router();

// Obtener todos los Gastos
router.get("/", obtenerGastos);

// Crear Gastos nuevos
router.post("/", auth, crearGastos);

// Confirmar Gasto
router.post("/:id/confirmar", auth, confirmarGasto);

// Paginado de Gastos
router.get("/paginado", paginadoGastos);

// Obtener un gasto por su ID
router.get("/:id", obtenerGastosId);

router.get("/usuario/:userId", obtenerGastosByUser);

// Actualizar un gasto por su ID
router.put("/:id", auth, modificarGastos);

// Eliminar un gasto por su ID
router.delete("/:id", auth, eliminarGastos);

router.get("/usuario/:userId/categorias", auth, obtenerGastosPorCategoria);

export default router;
