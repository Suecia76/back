import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import categoriasRoutes from "./routes/categoriasRoutes.js";
import ingresosRoutes from "./routes/ingresosRoutes.js";
import gastosRoutes from "./routes/gastosRoutes.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";
import metasRoutes from "./routes/metasRoutes.js";
import notificacionesRoutes from "./routes/notificacionesRoutes.js";
import "./cronJobs.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());

const corsOptions = {
  origin: "*", // Permitir todos los orígenes
  methods: ["GET", "POST", "PUT", "DELETE"], // Métodos permitidos
  allowedHeaders: ["Content-Type", "Authorization"], // Cabeceras permitidas
};

app.use(cors(corsOptions));
app.use("/uploads", express.static(path.resolve("uploads")));

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

const url = process.env.DB_URL;

mongoose
  .connect(url)
  .then(() => {
    console.log("Conexión con Mongo exitosa!");
  })
  .catch((err) => {
    console.error("Error al conectar a MongoDB:", err);
  });

app.use("/ingresos", ingresosRoutes);
app.use("/gastos", gastosRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/categorias", categoriasRoutes);
app.use("/metas", metasRoutes);
app.use("/notificaciones", notificacionesRoutes);

// Página principal
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
