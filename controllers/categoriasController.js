import Categoria from "../models/categorias.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

export const obtenerCategoriasPredeterminadas = async (req, res) => {
  try {
    // Obtener categorías predeterminadas desde la base de datos
    const categoriasPredeterminadas = await Categoria.find({
      predeterminada: true,
    });

    res.json(categoriasPredeterminadas);
  } catch (error) {
    console.error("Error al obtener las categorías predeterminadas:", error);
    res
      .status(500)
      .json({ error: "Error al obtener las categorías predeterminadas" });
  }
};

export const crearCategorias = async (req, res) => {
  const { nombre, user_fk } = req.body;
  console.log("Datos recibidos:", req.body);
  console.log("Archivo recibido:", req.file);

  // Validar que el user_fk sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(user_fk)) {
    return res
      .status(400)
      .json({ message: "El user_fk no es un ObjectId válido." });
  }

  // Validar que el nombre esté presente
  if (!nombre) {
    console.log("Error: El nombre de la categoría es requerido.");
    return res
      .status(400)
      .json({ message: "El nombre de la categoría es requerido" });
  }

  try {
    const imagenPath = req.file ? req.file.filename : null;
    console.log("Ruta de la imagen:", imagenPath);

    const newCategoria = new Categoria({
      nombre,
      imagen: imagenPath,
      user_fk: new mongoose.Types.ObjectId(user_fk), // Guardar el ID del usuario
    });

    await newCategoria.save();
    console.log("Categoría creada con éxito:", newCategoria);

    res.status(201).json(newCategoria);
  } catch (error) {
    console.error("Error al crear la categoría:", error);
    res.status(500).json({ message: "Error al crear la categoría" });
  }
};

export const obtenerCategoriasId = async (req, res) => {
  try {
    const categorias = await Categoria.findById(req.params.id);
    res.json(categorias);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const modificarCategorias = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    // Buscar la categoría existente
    const categoria = await Categoria.findById(id);
    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    // Actualizar el nombre
    categoria.nombre = nombre;

    // Si se subió una nueva imagen, eliminar la anterior y guardar la nueva
    if (req.file) {
      if (categoria.imagen) {
        const oldImagePath = path.resolve("uploads", categoria.imagen);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath); // Eliminar la imagen anterior
          console.log("Imagen anterior eliminada:", oldImagePath);
        }
      }
      categoria.imagen = req.file.filename; // Guardar el nombre del nuevo archivo
      console.log("Nueva imagen asignada:", req.file.filename);
    }

    await categoria.save();
    res.json(categoria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar la categoría" });
  }
};

export const eliminarCategorias = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar la categoría
    const categoria = await Categoria.findById(id);
    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    // Eliminar la imagen asociada si existe
    if (categoria.imagen) {
      const imagePath = path.resolve("uploads", categoria.imagen);
      console.log("Ruta de la imagen a eliminar:", imagePath);

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath); // Eliminar la imagen
        console.log("Imagen eliminada correctamente");
      } else {
        console.log("La imagen no existe en la ruta especificada");
      }
    }

    // Eliminar la categoría
    await Categoria.findByIdAndDelete(id);

    res.json({ message: "Categoría eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar la categoría" });
  }
};

export const obtenerCategoriaUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const categorias = await Categoria.find({
      user_fk: userId,
      predeterminada: false,
    });
    res.json(categorias);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
