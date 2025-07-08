import express from "express";
import { obtenerNotificaciones, borrarNotificacion } from "../controllers/notificacionesController.js";
const router = express.Router();

router.get("/:userId", obtenerNotificaciones);
router.delete("/:id", borrarNotificacion);

export default router;