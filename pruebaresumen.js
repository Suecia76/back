import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Usuario from "./models/usuarios.js";
import Gasto from "./models/gastos.js";
import Ingreso from "./models/ingresos.js";
import Meta from "./models/metasDeAhorro.js";
import Categoria from "./models/categorias.js";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Conectado a la base de datos");
  } catch (error) {
    console.error("❌ Error de conexión:", error);
    process.exit(1);
  }
};

const seedOneUser = async () => {
  try {
    // 🧹 Limpiar colecciones
    await Promise.all([
      Usuario.deleteMany(),
      Gasto.deleteMany(),
      Ingreso.deleteMany(),
      Meta.deleteMany(),
      Categoria.deleteMany(),
    ]);

    // 👤 Crear usuario demo
    const passwordHashed = await bcrypt.hash("123456", 10);
    const user = await Usuario.create({
      name: "Diego",
      lastname: "Tester",
      age: 30,
      phonenumber: 123456789,
      email: "diego@test.com",
      password: passwordHashed,
      saldo: 2000,
    });
    console.log("👤 Usuario creado:", user.email);

    // 📂 Crear categorías demo
    const categorias = await Categoria.insertMany([
      {
        nombre: "Alquiler",
        imagen: "predeterminadas/alquiler",
        predeterminada: true,
      },
      {
        nombre: "Comida",
        imagen: "predeterminadas/comida",
        predeterminada: true,
      },
      {
        nombre: "Transporte",
        imagen: "predeterminadas/transporte",
        predeterminada: true,
      },
      {
        nombre: "Entretenimiento",
        imagen: "predeterminadas/entretenimiento",
        predeterminada: true,
      },
    ]);
    console.log("📂 Categorías creadas");

    const [cat1, cat2, cat3, cat4] = categorias.map((c) => c._id);

    // 📅 Fechas variadas
    const hoy = new Date();
    const hace5dias = new Date(hoy);
    hace5dias.setDate(hoy.getDate() - 5);
    const hace15dias = new Date(hoy);
    hace15dias.setDate(hoy.getDate() - 15);
    const mesPasado = new Date(hoy);
    mesPasado.setMonth(hoy.getMonth() - 1);

    // 💸 Crear gastos
    const gastos = [
      {
        nombre: "Alquiler",
        descripcion: "Pago mensual",
        cantidad: 1200,
        tipo: "fijo",
        estado: "pagado",
        cuotas: 1,
        frecuencia: "mensual",
        pendienteConfirmacion: false,
        fechaInicio: hoy,
        user_fk: user._id,
        categoria_fk: cat1,
      },
      {
        nombre: "Comida",
        descripcion: "Compras en supermercado",
        cantidad: 300,
        tipo: "variable",
        estado: "pendiente",
        cuotas: 1,
        frecuencia: "mensual",
        pendienteConfirmacion: false,
        fechaInicio: hace5dias,
        user_fk: user._id,
        categoria_fk: cat2,
      },
      {
        nombre: "Electrodomésticos",
        descripcion: "Compra en cuotas",
        cantidad: 900,
        tipo: "variable",
        estado: "pagado",
        cuotas: 3,
        frecuencia: "mensual",
        pendienteConfirmacion: false,
        fechaInicio: hace15dias,
        user_fk: user._id,
        categoria_fk: cat3,
      },
      {
        nombre: "Salidas",
        descripcion: "Cine y restaurantes",
        cantidad: 150,
        tipo: "variable",
        estado: "pagado",
        cuotas: 1,
        frecuencia: "mensual",
        pendienteConfirmacion: false,
        fechaInicio: mesPasado,
        user_fk: user._id,
        categoria_fk: cat4,
      },
    ];
    await Gasto.insertMany(gastos);
    console.log("💸 Gastos creados");

    // 💰 Crear ingresos
    const ingresos = [
      {
        nombre: "Salario",
        descripcion: "Pago mensual del trabajo",
        cantidad: 2500,
        tipo: "fijo",
        cuotas: 1,
        frecuencia: "mensual",
        pendienteConfirmacion: false,
        fechaInicio: hoy,
        user_fk: user._id,
        categoria_fk: cat1,
      },
      {
        nombre: "Venta online",
        descripcion: "Ingresos por ventas en internet",
        cantidad: 600,
        tipo: "variable",
        cuotas: 2,
        frecuencia: "mensual",
        pendienteConfirmacion: false,
        fechaInicio: hace5dias,
        user_fk: user._id,
        categoria_fk: cat2,
      },
      {
        nombre: "Devolución",
        descripcion: "Reembolso por devolución",
        cantidad: 150,
        tipo: "variable",
        cuotas: 1,
        frecuencia: "mensual",
        pendienteConfirmacion: false,
        fechaInicio: mesPasado,
        user_fk: user._id,
        categoria_fk: cat3,
      },
    ];
    await Ingreso.insertMany(ingresos);
    console.log("💰 Ingresos creados");

    // 🎯 Meta de ahorro
    const meta = {
      nombre: "Viaje a Japón",
      descripcion: "Ahorro para un viaje",
      objetivo: 10000,
      progreso: 2500,
      tipo: { fecha: null, montoMensual: 800 },
      user_fk: user._id,
    };
    await Meta.create(meta);
    console.log("🎯 Meta creada");

    console.log("🎉 Seed completado con éxito");
    process.exit();
  } catch (err) {
    console.error("❌ Error en el seed:", err);
    process.exit(1);
  }
};

// 🚀 Ejecutar
(async () => {
  await connectDB();
  await seedOneUser();
})();
