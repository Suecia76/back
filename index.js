import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import categoriasRoutes from "./routes/categoriasRoutes.js";
import ingresosRoutes from "./routes/ingresosRoutes.js";
import gastosRoutes from "./routes/gastosRoutes.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";
import metasRoutes from "./routes/metasRoutes.js";
import notificacionesRoutes from "./routes/notificacionesRoutes.js";
import "./cronJobs.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

const app = express();

app.use(express.json());

const corsOptions = {
  origin: "https://finz-front.vercel.app/", // Permitir todos los orígenes
  methods: ["GET", "POST", "PUT", "DELETE"], // Métodos permitidos
  allowedHeaders: ["Content-Type", "Authorization"], // Cabeceras permitidas
};

app.use(cors(corsOptions));
app.use("/uploads", cors(), express.static(path.resolve("uploads")));

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
