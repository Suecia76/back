import express from "express";
import auth from "../middlewares/authMiddlewares.js";
import upload from "../middlewares/multerConfig.js";

import {
  obtenerCategoriasPredeterminadas,
  crearCategorias,
  obtenerCategoriasId,
  modificarCategorias,
  eliminarCategorias,
  obtenerCategoriaUser,
} from "../controllers/categoriasController.js";

const router = express.Router();

// Obtener todos los Categorias
router.get("/", obtenerCategoriasPredeterminadas);

// Obtener un categoria por el usuario
router.get("/usuario/:userId", auth, obtenerCategoriaUser);

// Crear Categorias nuevos
router.post("/", upload.single("imagen"), auth, crearCategorias);

// Obtener un categoria por su ID
router.get("/:id", obtenerCategoriasId);

// Actualizar un categoria por su ID
router.put("/:id", upload.single("imagen"), auth, modificarCategorias);

// Eliminar un categoria por su ID
router.delete("/:id", auth, eliminarCategorias);

export default router;
