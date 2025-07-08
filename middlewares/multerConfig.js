import multer from "multer";
import path from "path";

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Verifica si la solicitud es para subir una imagen de perfil
    if (req.baseUrl.includes("usuarios")) {
      cb(null, "uploads/imagenes_perfil"); // Carpeta para imágenes de perfil
    } else {
      cb(null, "uploads/"); // Carpeta por defecto
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Filtro para validar el tipo de archivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de archivo no permitido. Solo se permiten imágenes."));
  }
};

const upload = multer({ storage, fileFilter });

export default upload;
