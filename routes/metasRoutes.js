import express from "express";
import auth from "../middlewares/authMiddlewares.js";
import {
  obtenerMetas,
  crearMetas,
  eliminarMetas,
  modificarMetas,
  obtenerMetaPorId,
  obtenerAvancesPorMes,
} from "../controllers/metasController.js";

const router = express.Router();

// Obtener todos los Categorias
router.get("/usuario/:userId", auth, obtenerMetas);

router.get("/:id", auth, obtenerMetaPorId);

router.get("/usuario/:userId/avances-mes", obtenerAvancesPorMes);

router.post("/", auth, crearMetas);

router.delete("/:id", auth, eliminarMetas);

router.put("/:id", auth, modificarMetas);

export default router;
