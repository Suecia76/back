import mongoose from "mongoose";
import Meta from "../models/metasDeAhorro.js";
import Usuario from "../models/usuarios.js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.DB_URL;

async function simularAvances() {
  await mongoose.connect(url);

  const usuarios = await Usuario.find();
  const ahora = new Date();

  for (const usuario of usuarios) {
    const metas = await Meta.find({ user_fk: usuario._id });
    for (const meta of metas) {
      // Borra avances previos
      meta.avances = [];
      // Simula 3 avances: uno por cada uno de los últimos 3 meses
      for (let i = 2; i >= 0; i--) {
        const fecha = new Date(ahora);
        fecha.setMonth(ahora.getMonth() - i);
        meta.avances.push({
          cantidad: 100 * (3 - i), // 100, 200, 300
          fecha,
        });
      }
      await meta.save();
      console.log(
        `Meta ${meta.nombre} del usuario ${usuario.name} actualizada con avances`
      );
    }
  }

  await mongoose.disconnect();
  console.log("¡Listo! Avances simulados.");
}

simularAvances();
