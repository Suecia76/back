import mongoose from "mongoose";
import Usuario from "../models/usuario.js";
import Meta from "../models/meta.js";
import Avance from "../models/avance.js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.DB_URL;

async function generarAvances() {
  await mongoose.connect(url);

  const usuarios = await Usuario.find();
  const ahora = new Date();

  for (const usuario of usuarios) {
    // Busca una meta del usuario
    const meta = await Meta.findOne({ user_fk: usuario._id });
    if (!meta) continue;

    // Borra avances previos de los últimos 3 meses para evitar duplicados
    const haceTresMeses = new Date(ahora);
    haceTresMeses.setMonth(ahora.getMonth() - 3);
    await Avance.deleteMany({
      meta_fk: meta._id,
      fecha: { $gte: haceTresMeses },
    });

    // Crea 3 avances, uno por cada mes
    for (let i = 2; i >= 0; i--) {
      const fecha = new Date(ahora);
      fecha.setMonth(ahora.getMonth() - i);
      await Avance.create({
        meta_fk: meta._id,
        user_fk: usuario._id,
        cantidad: 10 + i,
        fecha: fecha,
      });
    }
    console.log(`Avances generados para usuario ${usuario._id}`);
  }

  mongoose.disconnect();
}

generarAvances();
