import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt"; // Importar bcrypt para hashear contraseñas
import Usuario from "./models/usuarios.js";
import Gasto from "./models/gastos.js";
import Ingreso from "./models/ingresos.js";
import Meta from "./models/metasDeAhorro.js";
import Categoria from "./models/categorias.js";

dotenv.config();

// Conexión a la base de datos
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Conexión a la base de datos exitosa");
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error);
    process.exit(1);
  }
};

const obtenerCategoriasPredeterminadas = () => {
  // Lista manual para asegurar ortografía y rutas correctas
  const categorias = [
    { nombre: "Agua", imagen: "predeterminadas/agua" },
    { nombre: "Ahorros", imagen: "predeterminadas/ahorros" },
    { nombre: "Alquiler", imagen: "predeterminadas/alquiler" },
    { nombre: "Automóviles", imagen: "predeterminadas/automoviles" },
    { nombre: "Calzado", imagen: "predeterminadas/calzado" },
    { nombre: "Cine", imagen: "predeterminadas/cine" },
    { nombre: "Combustible", imagen: "predeterminadas/combustible" },
    { nombre: "Comida", imagen: "predeterminadas/comida" },
    {
      nombre: "Cuidado Personal",
      imagen: "predeterminadas/cuidado_personal",
    },
    { nombre: "Educación", imagen: "predeterminadas/educacion" },
    { nombre: "Fiestas", imagen: "predeterminadas/fiestas" },
    { nombre: "Internet", imagen: "predeterminadas/internet" },
    { nombre: "Inversión", imagen: "predeterminadas/inversion" },
    { nombre: "Juegos", imagen: "predeterminadas/juegos" },
    { nombre: "Luz", imagen: "predeterminadas/luz" },
    { nombre: "Mascotas", imagen: "predeterminadas/mascotas" },
    { nombre: "Medicamentos", imagen: "predeterminadas/medicamentos" },
    { nombre: "Merienda", imagen: "predeterminadas/merienda" },
    { nombre: "Multa", imagen: "predeterminadas/multa" },
    { nombre: "Ok", imagen: "predeterminadas/ok" },
    { nombre: "Pedidos", imagen: "predeterminadas/pedidos" },
    { nombre: "Peluquería", imagen: "predeterminadas/peluqueria" },
    { nombre: "Regalos", imagen: "predeterminadas/regalos" },
    { nombre: "Ropa", imagen: "predeterminadas/ropa" },
    { nombre: "Sueldo", imagen: "predeterminadas/sueldo" },
    { nombre: "Suscripciones", imagen: "predeterminadas/suscripciones" },
    { nombre: "Tiendas", imagen: "predeterminadas/tiendas" },
    {
      nombre: "Transporte Público",
      imagen: "predeterminadas/transporte_publico",
    },
    { nombre: "Vacaciones", imagen: "predeterminadas/vacaciones" },
    { nombre: "Biyuntería", imagen: "predeterminadas/biyunteria" },
    { nombre: "Cable-Streaming", imagen: "predeterminadas/cable_streaming" },
    { nombre: "Viajes", imagen: "predeterminadas/viajes" },
  ];

  return categorias.map((cat) => ({
    nombre: cat.nombre,
    imagen: cat.imagen,
    predeterminada: true,
  }));
};

// Datos iniciales
const usuariosDePrueba = [
  {
    name: "Cecilia",
    lastname: "Demo",
    age: 32,
    phonenumber: 111111111,
    email: "cecilia@demo.com",
    password: "123456",
  },
  {
    name: "Carina",
    lastname: "Demo",
    age: 29,
    phonenumber: 222222222,
    email: "carina@demo.com",
    password: "123456",
  },
  {
    name: "Bruno",
    lastname: "Demo",
    age: 27,
    phonenumber: 333333333,
    email: "bruno@demo.com",
    password: "123456",
  },
  {
    name: "Santiago",
    lastname: "Demo",
    age: 35,
    phonenumber: 444444444,
    email: "santiago@demo.com",
    password: "123456",
  },
  {
    name: "Giuliana",
    lastname: "Demo",
    age: 28,
    phonenumber: 555555555,
    email: "giuliana@demo.com",
    password: "123456",
  },
];

const gastosDePrueba = [
  {
    nombre: "Alquiler",
    descripcion: "Pago mensual del alquiler",
    cantidad: 500,
    tipo: "fijo",
    estado: "pagado",
  },
  {
    nombre: "Comida",
    descripcion: "Gastos en supermercado",
    cantidad: 200,
    tipo: "variable",
    estado: "pendiente",
  },
  {
    nombre: "Transporte",
    descripcion: "Gastos en transporte público",
    cantidad: 100,
    tipo: "variable",
    estado: "pagado",
  },
];

const ingresosDePrueba = [
  {
    nombre: "Salario",
    descripcion: "Pago mensual del trabajo",
    cantidad: 1500,
    tipo: "fijo",
  },
  {
    nombre: "Freelance",
    descripcion: "Proyecto de desarrollo web",
    cantidad: 500,
    tipo: "variable",
  },
  {
    nombre: "Venta",
    descripcion: "Venta de productos",
    cantidad: 300,
    tipo: "variable",
  },
];

const metasDePrueba = [
  {
    nombre: "Viaje a Europa",
    descripcion: "Ahorro para un viaje a Europa",
    objetivo: 5000,
    progreso: 1000,
    tipo: { fecha: null, montoMensual: 500, porcentajeMensual: null },
  },
  {
    nombre: "Comprar una bicicleta",
    descripcion: "Ahorro para una bicicleta nueva",
    objetivo: 800,
    progreso: 200,
    tipo: { fecha: null, montoMensual: 100, porcentajeMensual: null },
  },
  {
    nombre: "Fondo de emergencia",
    descripcion: "Ahorro para emergencias",
    objetivo: 3000,
    progreso: 500,
    tipo: { fecha: null, montoMensual: 300, porcentajeMensual: null },
  },
];

// Función para hashear contraseñas
const hashearContraseñas = async (usuarios) => {
  const usuariosHasheados = [];
  for (const usuario of usuarios) {
    const salt = await bcrypt.genSalt(10); // Generar un salt
    const hashedPassword = await bcrypt.hash(usuario.password, salt); // Hashear la contraseña
    usuariosHasheados.push({ ...usuario, password: hashedPassword }); // Reemplazar la contraseña con la hasheada
  }
  return usuariosHasheados;
};

// Función para insertar datos
const seedDatabase = async () => {
  try {
    // Limpiar las colecciones
    await Usuario.deleteMany();
    await Gasto.deleteMany();
    await Ingreso.deleteMany();
    await Meta.deleteMany();
    await Categoria.deleteMany();

    // Hashear las contraseñas de los usuarios de prueba
    const usuariosHasheados = await hashearContraseñas(usuariosDePrueba);

    // Insertar usuarios de prueba
    const usuarios = await Usuario.insertMany(usuariosHasheados);
    console.log("Usuarios de prueba insertados:", usuarios);

    // Insertar categorías predeterminadas
    const categoriasPredeterminadas = obtenerCategoriasPredeterminadas();
    const categoriasInsertadas = await Categoria.insertMany(
      categoriasPredeterminadas
    );
    console.log("Categorías predeterminadas insertadas:", categoriasInsertadas);

    // Insertar gastos, ingresos y metas para cada usuario
    for (const [index, usuario] of usuarios.entries()) {
      // Selecciona varias categorías si existen
      const cat1 = categoriasInsertadas[0]?._id || null;
      const cat2 = categoriasInsertadas[1]?._id || cat1;
      const cat3 = categoriasInsertadas[2]?._id || cat1;
      const cat4 = categoriasInsertadas[3]?._id || cat1;

      // Fechas variadas
      const hoy = new Date();
      const hace1dias = new Date(hoy);
      hace1dias.setDate(hoy.getDate() - 1);
      const hace2dias = new Date(hoy);
      hace2dias.setDate(hoy.getDate() - 2);
      const hace3dias = new Date(hoy);
      hace3dias.setDate(hoy.getDate() - 3);
      const hace4dias = new Date(hoy);
      hace4dias.setDate(hoy.getDate() - 4);
      const hace5dias = new Date(hoy);
      hace5dias.setDate(hoy.getDate() - 5);
      const hace6dias = new Date(hoy);
      hace6dias.setDate(hoy.getDate() - 6);
      const hace7dias = new Date(hoy);
      hace7dias.setDate(hoy.getDate() - 7);
      const hace10dias = new Date(hoy);
      hace10dias.setDate(hoy.getDate() - 10);
      const hace15dias = new Date(hoy);
      hace15dias.setDate(hoy.getDate() - 15);
      const mesPasado = new Date(hoy);
      mesPasado.setMonth(hoy.getMonth() - 1);

      // GASTOS VARIADOS
      const gastos = [
        // Fijo, pagado, hoy
        {
          nombre: "Alquiler",
          descripcion: "Pago mensual del alquiler",
          cantidad: 500,
          tipo: "fijo",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hoy,
          categoria_fk: cat1,
        },
        // Variable, pendiente, hace 3 días
        {
          nombre: "Comida",
          descripcion: "Gastos en supermercado",
          cantidad: 200,
          tipo: "variable",
          estado: "pendiente",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace3dias,
          categoria_fk: cat2,
        },
        // En cuotas automáticas, hace 7 días
        {
          nombre: "Electrodoméstico",
          descripcion: "Compra en cuotas automáticas",
          cantidad: 1200,
          tipo: "variable",
          estado: "pagado",
          cuotas: 3,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace7dias,
          categoria_fk: cat3,
        },
        // En cuotas manuales, hace 15 días
        {
          nombre: "Seguro auto",
          descripcion: "Pago en cuotas manuales",
          cantidad: 900,
          tipo: "variable",
          estado: "pendiente",
          cuotas: 3,
          frecuencia: "mensual",
          cuotasAutomaticas: false,
          pendienteConfirmacion: true,
          fechaInicio: hace15dias,
          categoria_fk: cat4,
        },
        // Extra: Transporte, mes pasado
        {
          nombre: "Transporte",
          descripcion: "Gastos en transporte público",
          cantidad: 100,
          tipo: "variable",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: mesPasado,
          categoria_fk: cat2,
        },
        // Extra: Salidas, hoy
        {
          nombre: "Salidas",
          descripcion: "Cine y restaurantes",
          cantidad: 150,
          tipo: "variable",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hoy,
          categoria_fk: cat3,
        },
        // NUEVOS GASTOS PARA EL GRÁFICO
        {
          nombre: "Farmacia",
          descripcion: "Medicamentos",
          cantidad: 80,
          tipo: "variable",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace1dias,
          categoria_fk: cat4,
        },
        {
          nombre: "Ropa",
          descripcion: "Compra de ropa",
          cantidad: 300,
          tipo: "variable",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace2dias,
          categoria_fk: cat1,
        },
        {
          nombre: "Supermercado",
          descripcion: "Compra mensual",
          cantidad: 400,
          tipo: "variable",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace4dias,
          categoria_fk: cat2,
        },
        {
          nombre: "Regalos",
          descripcion: "Regalos de cumpleaños",
          cantidad: 250,
          tipo: "variable",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace5dias,
          categoria_fk: cat3,
        },
        {
          nombre: "Mascotas",
          descripcion: "Veterinaria y comida",
          cantidad: 120,
          tipo: "variable",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace6dias,
          categoria_fk: cat4,
        },
        {
          nombre: "Servicios",
          descripcion: "Luz, agua y gas",
          cantidad: 350,
          tipo: "fijo",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace10dias,
          categoria_fk: cat1,
        },
      ].map((gasto) => ({
        ...gasto,
        user_fk: usuario._id,
      }));

      const gastosInsertados = await Gasto.insertMany(gastos);
      console.log(
        `Gastos insertados para ${usuario.email}: `,
        gastosInsertados
      );

      // INGRESOS VARIADOS
      const ingresos = [
        // Fijo, hoy
        {
          nombre: "Salario",
          descripcion: "Pago mensual del trabajo",
          cantidad: 1500,
          tipo: "fijo",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hoy,
          categoria_fk: cat1,
        },
        // Variable, hace 3 días
        {
          nombre: "Freelance",
          descripcion: "Proyecto de desarrollo web",
          cantidad: 500,
          tipo: "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace3dias,
          categoria_fk: cat2,
        },
        // En cuotas automáticas, hace 7 días
        {
          nombre: "Venta en cuotas automáticas",
          descripcion: "Ingreso en 3 cuotas automáticas",
          cantidad: 900,
          tipo: "variable",
          cuotas: 3,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace7dias,
          categoria_fk: cat3,
        },
        // En cuotas manuales, hace 15 días
        {
          nombre: "Venta en cuotas manuales",
          descripcion: "Ingreso en 3 cuotas manuales",
          cantidad: 600,
          tipo: "variable",
          cuotas: 3,
          frecuencia: "mensual",
          cuotasAutomaticas: false,
          pendienteConfirmacion: true,
          fechaInicio: hace15dias,
          categoria_fk: cat4,
        },
        // Extra: Devolución, mes pasado
        {
          nombre: "Devolución",
          descripcion: "Reembolso de compra",
          cantidad: 250,
          tipo: "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: mesPasado,
          categoria_fk: cat2,
        },
        // Extra: Premio, hoy
        {
          nombre: "Premio",
          descripcion: "Premio por concurso",
          cantidad: 300,
          tipo: "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hoy,
          categoria_fk: cat3,
        },
        // NUEVOS INGRESOS PARA EL GRÁFICO
        {
          nombre: "Venta online",
          descripcion: "Venta de productos online",
          cantidad: 400,
          tipo: "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace1dias,
          categoria_fk: cat4,
        },
        {
          nombre: "Devolución AFIP",
          descripcion: "Devolución de impuestos",
          cantidad: 200,
          tipo: "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace2dias,
          categoria_fk: cat1,
        },
        {
          nombre: "Regalía",
          descripcion: "Regalía de libro",
          cantidad: 350,
          tipo: "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace4dias,
          categoria_fk: cat2,
        },
        {
          nombre: "Bono",
          descripcion: "Bono anual",
          cantidad: 800,
          tipo: "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace5dias,
          categoria_fk: cat3,
        },
        {
          nombre: "Intereses",
          descripcion: "Intereses de plazo fijo",
          cantidad: 120,
          tipo: "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace6dias,
          categoria_fk: cat4,
        },
        {
          nombre: "Reembolso obra social",
          descripcion: "Reembolso de gastos médicos",
          cantidad: 180,
          tipo: "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: hace10dias,
          categoria_fk: cat1,
        },
      ].map((ingreso) => ({
        ...ingreso,
        user_fk: usuario._id,
      }));

      await Ingreso.insertMany(ingresos);

      // Meta de ejemplo para cada usuario
      const meta = {
        nombre: "Viaje a Europa",
        descripcion: "Ahorro para un viaje a Europa",
        objetivo: 5000,
        progreso: 1000,
        tipo: { fecha: null, montoMensual: 500, porcentajeMensual: null },
        user_fk: usuario._id,
      };
      const metaInsertada = await Meta.create(meta);
      console.log(`Meta insertada para ${usuario.email}: `, metaInsertada);

      // Generar ingresos y gastos diarios para los últimos 12 días
      for (let i = 0; i < 12; i++) {
        const fecha = new Date();
        fecha.setHours(0, 0, 0, 0);
        fecha.setDate(fecha.getDate() - i);

        // Alternar categorías
        const catGasto = [cat1, cat2, cat3, cat4][i % 4];
        const catIngreso = [cat4, cat3, cat2, cat1][i % 4];

        // Gasto diario
        await Gasto.create({
          nombre: `Gasto diario`,
          descripcion: `Gasto automático generado para demo`,
          cantidad: 100 + Math.floor(Math.random() * 200), // monto entre 100 y 299
          tipo: i % 2 === 0 ? "fijo" : "variable",
          estado: "pagado",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: fecha,
          categoria_fk: catGasto,
          user_fk: usuario._id,
        });

        // Ingreso diario
        await Ingreso.create({
          nombre: `Ingreso diario`,
          descripcion: `Ingreso automático generado para demo`,
          cantidad: 200 + Math.floor(Math.random() * 300), // monto entre 200 y 499
          tipo: i % 2 === 0 ? "fijo" : "variable",
          cuotas: 1,
          frecuencia: "mensual",
          cuotasAutomaticas: true,
          pendienteConfirmacion: false,
          fechaInicio: fecha,
          categoria_fk: catIngreso,
          user_fk: usuario._id,
        });
      }
    }

    console.log("Base de datos inicializada correctamente");
    process.exit();
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
    process.exit(1);
  }
};

// Ejecutar el script
const runSeed = async () => {
  await connectDB();
  await seedDatabase();
};

runSeed();
