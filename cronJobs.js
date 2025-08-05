import cron from "node-cron";
import Usuario from "./models/usuarios.js";
import Ingreso from "./models/ingresos.js";
import Gasto from "./models/gastos.js";
import webpush from "web-push";
import Suscripcion from "./models/suscripciones.js";
import dotenv from "dotenv";
import Meta from "./models/metasDeAhorro.js";
import Categoria from "./models/categorias.js";
import Notificacion from "./models/notificaciones.js";
import mongoose from "mongoose";
dotenv.config();

webpush.setVapidDetails(
  "mailto:tu-email@ejemplo.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const procesarIngresosYGastosFijos = async () => {
  try {
    console.log("Ejecutando tarea programada para ingresos y gastos fijos...");

    // Marcar ingresos fijos como pendientes de confirmación
    try {
      const ingresosFijos = await Ingreso.find({ tipo: "fijo" });
      for (const ingreso of ingresosFijos) {
        await Ingreso.findByIdAndUpdate(ingreso._id, {
          $set: { pendienteConfirmacion: true },
        });
        console.log(
          `Ingreso fijo marcado como pendiente: Usuario ${ingreso.user_fk}, Cantidad: ${ingreso.cantidad}`
        );
      }
    } catch (error) {
      console.error("Error al procesar ingresos fijos:", error);
    }

    // Marcar gastos fijos como pendientes de confirmación
    try {
      const gastosFijos = await Gasto.find({ tipo: "fijo", estado: "pagado" });
      for (const gasto of gastosFijos) {
        await Gasto.findByIdAndUpdate(gasto._id, {
          $set: { pendienteConfirmacion: true },
        });
        console.log(
          `Gasto fijo marcado como pendiente: Usuario ${gasto.user_fk}, Cantidad: ${gasto.cantidad}`
        );
      }
    } catch (error) {
      console.error("Error al procesar gastos fijos:", error);
    }

    console.log("Tarea programada completada.");
  } catch (error) {
    console.error("Error al ejecutar la tarea programada:", error);
  }
};

export const notificarPendientes = async () => {
  try {
    // Buscar usuarios con ingresos o gastos pendientes de confirmación
    const usuariosIngresos = await Ingreso.distinct("user_fk", {
      pendienteConfirmacion: true,
    });
    const usuariosGastos = await Gasto.distinct("user_fk", {
      pendienteConfirmacion: true,
    });
    const usuarios = Array.from(
      new Set([...usuariosIngresos, ...usuariosGastos])
    );

    for (const userId of usuarios) {
      const tieneIngresos = usuariosIngresos.includes(userId);
      const tieneGastos = usuariosGastos.includes(userId);

      let title = "¡Tienes movimientos a confirmar!";
      let body = "Revisa tus ingresos y gastos pendientes en Finz.";

      if (tieneIngresos && !tieneGastos) {
        title = "¡Tienes ingresos a confirmar!";
        body = "Revisa tus ingresos pendientes en Finz.";
      } else if (!tieneIngresos && tieneGastos) {
        title = "¡Tienes gastos a confirmar!";
        body = "Revisa tus gastos pendientes en Finz.";
      }

      const suscripcion = await Suscripcion.findOne({ user_fk: userId });
      if (
        suscripcion &&
        suscripcion.subscription &&
        suscripcion.subscription.endpoint
      ) {
        const payload = JSON.stringify({ title, body });
        try {
          await webpush.sendNotification(suscripcion.subscription, payload);
          console.log(`Notificación enviada a usuario ${userId}`);
        } catch (err) {
          console.error("Error enviando notificación push:", err);
        }
      }

      // Guardar notificación en la base de datos
      await Notificacion.create({
        user_fk: userId,
        titulo: title,
        body: body,
        imagen: "./assets/icons/alerta.svg", // Opcional
      });
    }
  } catch (error) {
    console.error("Error al notificar pendientes:", error);
  }
};

// Notificar si el usuario no ha hecho aportes a metas en los últimos 7 días
export const notificarRecordatorioMetas = async () => {
  // Suponiendo que tienes un modelo Meta y un campo updatedAt
  const hace1Mes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const metas = await Meta.find({ updatedAt: { $lt: hace1Mes } });
  for (const meta of metas) {
    const suscripcion = await Suscripcion.findOne({ user_fk: meta.user_fk });
    if (
      suscripcion &&
      suscripcion.subscription &&
      suscripcion.subscription.endpoint
    ) {
      const payload = JSON.stringify({
        title: "¡No olvides tu meta!",
        body: `Hace más de un mes que no aportas a tu meta "${meta.nombre}".`,
      });
      try {
        await webpush.sendNotification(suscripcion.subscription, payload);
      } catch (err) {
        console.error("Error enviando notificación de meta:", err);
      }
      // ➕ Guardar en la base de datos
      await Notificacion.create({
        user_fk: meta.user_fk,
        titulo: "¡No olvides tu meta!",
        body: `Hace más de un mes que no aportas a tu meta "${meta.nombre}".`,
        imagen: "./assets/icons/advertencia.svg",
      });
    }
  }
};

export const notificarSaldoBajo = async () => {
  const usuarios = await Usuario.find();
  for (const usuario of usuarios) {
    // Calcula el saldo promedio de los últimos 3 meses
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
    const ingresos = await Ingreso.aggregate([
      { $match: { user_fk: usuario._id, createdAt: { $gte: tresMesesAtras } } },
      { $group: { _id: null, total: { $sum: "$cantidad" } } },
    ]);
    const gastos = await Gasto.aggregate([
      { $match: { user_fk: usuario._id, createdAt: { $gte: tresMesesAtras } } },
      { $group: { _id: null, total: { $sum: "$cantidad" } } },
    ]);
    const saldoPromedio =
      ((ingresos[0]?.total || 0) - (gastos[0]?.total || 0)) / 3;
    const porcentaje = 0.2; // 20%
    const umbral = saldoPromedio * porcentaje;

    if (usuario.saldo < umbral) {
      const suscripcion = await Suscripcion.findOne({ user_fk: usuario._id });
      if (
        suscripcion &&
        suscripcion.subscription &&
        suscripcion.subscription.endpoint
      ) {
        const payload = JSON.stringify({
          title: "¡Saldo bajo!",
          body: `Tu saldo está por debajo del ${
            porcentaje * 100
          }% de tu saldo promedio de los últimos 3 meses.`,
        });
        try {
          await webpush.sendNotification(suscripcion.subscription, payload);
        } catch (err) {
          console.error("Error enviando notificación de saldo bajo:", err);
        }
        // ➕ Guardar en la base de datos
        await Notificacion.create({
          user_fk: usuario._id,
          titulo: "¡Saldo bajo!",
          body: `Tu saldo está por debajo del ${
            porcentaje * 100
          }% de tu saldo promedio de los últimos 3 meses.`,
          imagen: "./assets/icons/alerta.svg",
        });
      }
    }
  }
};

export const notificarGastoRecurrenteProximo = async () => {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const gastos = await Gasto.find({
    tipo: "fijo",
    fecha: {
      $gte: new Date(manana.setHours(0, 0, 0, 0)),
      $lt: new Date(manana.setHours(23, 59, 59, 999)),
    },
  });
  for (const gasto of gastos) {
    const suscripcion = await Suscripcion.findOne({ user_fk: gasto.user_fk });
    if (
      suscripcion &&
      suscripcion.subscription &&
      suscripcion.subscription.endpoint
    ) {
      const payload = JSON.stringify({
        title: "¡Gasto recurrente mañana!",
        body: `Mañana se debita tu gasto fijo: ${gasto.nombre}.`,
      });
      try {
        await webpush.sendNotification(suscripcion.subscription, payload);
      } catch (err) {
        console.error("Error enviando notificación de gasto recurrente:", err);
      }
      // ➕ Guardar en la base de datos
      await Notificacion.create({
        user_fk: gasto.user_fk,
        titulo: "¡Gasto recurrente mañana!",
        body: `Mañana se debita tu gasto fijo: ${gasto.nombre}.`,
        imagen: "./assets/icons/gasto.svg",
      });
    }
  }
};

export const notificarUsuarioSinDatos = async () => {
  const usuarios = await Usuario.find();
  for (const usuario of usuarios) {
    const tieneIngresos = await Ingreso.exists({ user_fk: usuario._id });
    const tieneGastos = await Gasto.exists({ user_fk: usuario._id });
    const tieneMetas = await Meta.exists({ user_fk: usuario._id });
    const tieneCategorias = await Categoria.exists({ user_fk: usuario._id });

    if (!tieneIngresos && !tieneGastos && !tieneMetas && !tieneCategorias) {
      const suscripcion = await Suscripcion.findOne({ user_fk: usuario._id });
      if (
        suscripcion &&
        suscripcion.subscription &&
        suscripcion.subscription.endpoint
      ) {
        const payload = JSON.stringify({
          title: "¡Comienza a usar Finz!",
          body: "Crea tu primer ingreso, gasto, meta o categoría y aprovecha todas las funciones.",
        });
        try {
          await webpush.sendNotification(suscripcion.subscription, payload);
        } catch (err) {
          console.error(
            "Error enviando notificación de usuario sin datos:",
            err
          );
        }
        // ➕ Guardar en la base de datos
        await Notificacion.create({
          user_fk: usuario._id,
          titulo: "¡Comienza a usar Finz!",
          body: "Crea tu primer ingreso, gasto, meta o categoría y aprovecha todas las funciones.",
          imagen: "./assets/icons/alerta.svg",
        });
      }
    }
  }
};

export const notificarMitadDeMes = async () => {
  const usuarios = await Usuario.find();
  for (const usuario of usuarios) {
    const suscripcion = await Suscripcion.findOne({ user_fk: usuario._id });
    if (
      suscripcion &&
      suscripcion.subscription &&
      suscripcion.subscription.endpoint
    ) {
      const payload = JSON.stringify({
        title: "¡Ya es mitad de mes!",
        body: "Sigue así, revisa tus metas y mantén el control de tus finanzas 💪",
      });
      try {
        await webpush.sendNotification(suscripcion.subscription, payload);
      } catch (err) {
        console.error("Error enviando notificación de mitad de mes:", err);
      }
      // ➕ Guardar en la base de datos
      await Notificacion.create({
        user_fk: usuario._id,
        titulo: "¡Ya es mitad de mes!",
        body: "Sigue así, revisa tus metas y mantén el control de tus finanzas 💪",
        imagen: "./assets/icons/alerta.svg",
      });
    }
  }
};

// Calcula la fecha de la cuota N
function calcularFechaCuota(fechaInicio, frecuencia, n) {
  const fecha = new Date(fechaInicio);
  if (frecuencia === "mensual") fecha.setMonth(fecha.getMonth() + n);
  if (frecuencia === "quincenal") fecha.setDate(fecha.getDate() + n * 15);
  if (frecuencia === "semanal") fecha.setDate(fecha.getDate() + n * 7);
  return fecha;
}

// Procesa cuotas de ingresos
export const procesarCuotasIngresos = async () => {
  console.log("Procesando cuotas automáticas de ingresos...");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ingresos = await Ingreso.find({
    cuotasAutomaticas: true,
    cuotasProcesadas: { $lt: "$cuotas" }, // Esto no funciona en Mongoose así
  });

  for (const ingreso of ingresos) {
    const cuotasProcesadas = ingreso.cuotasProcesadas || 0;

    if (cuotasProcesadas >= ingreso.cuotas) continue;

    // ➤ Caso especial: ingreso de una sola cuota
    if (ingreso.cuotas === 1) {
      await Usuario.findByIdAndUpdate(ingreso.user_fk, {
        $inc: { saldo: ingreso.cantidad },
      });
      await Notificacion.create({
        user_fk: ingreso.user_fk,
        titulo: "Ingreso acreditado",
        body: `Se acreditó el ingreso completo de $${ingreso.cantidad.toFixed(
          2
        )}.`,
        imagen: "./assets/icons/ingresos.svg",
      });
      ingreso.cuotasProcesadas = 1;
      ingreso.pendienteConfirmacion = false;
      await ingreso.save();
      console.log(
        `Ingreso único procesado para usuario ${ingreso.user_fk}: $${ingreso.cantidad}`
      );
      continue;
    }

    // ➤ Caso general: ingreso con múltiples cuotas
    const fechaCuota = calcularFechaCuota(
      ingreso.fechaInicio,
      ingreso.frecuencia,
      cuotasProcesadas
    );
    fechaCuota.setHours(0, 0, 0, 0);

    if (fechaCuota <= hoy) {
      await Usuario.findByIdAndUpdate(ingreso.user_fk, {
        $inc: { saldo: ingreso.cantidad / ingreso.cuotas },
      });
      await Notificacion.create({
        user_fk: ingreso.user_fk,
        titulo: "Ingreso en cuotas acreditado",
        body: `Se acreditó la cuota ${cuotasProcesadas + 1} de ${
          ingreso.cuotas
        } por $${(ingreso.cantidad / ingreso.cuotas).toFixed(2)}.`,
        imagen: "./assets/icons/ingresos.svg",
      });
      ingreso.cuotasProcesadas = cuotasProcesadas + 1;
      await ingreso.save();
      console.log(
        `Ingreso en cuotas procesado para usuario ${ingreso.user_fk}: cuota ${
          cuotasProcesadas + 1
        }/${ingreso.cuotas}`
      );
    }
  }
};

export const procesarIngresosCuotaUnica = async () => {
  console.log("Procesando ingresos automáticos de 1 sola cuota...");

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ingresos = await Ingreso.find({
    cuotas: 1,
    cuotasAutomaticas: true,
    cuotasProcesadas: { $lt: 1 },
    fechaInicio: { $lte: hoy },
  });

  for (const ingreso of ingresos) {
    await Usuario.findByIdAndUpdate(ingreso.user_fk, {
      $inc: { saldo: ingreso.cantidad },
    });

    await Notificacion.create({
      user_fk: ingreso.user_fk,
      titulo: "Ingreso acreditado",
      body: `Se acreditó el ingreso completo de $${ingreso.cantidad.toFixed(
        2
      )}.`,
      imagen: "./assets/icons/ingresos.svg",
    });

    ingreso.cuotasProcesadas = 1;
    ingreso.pendienteConfirmacion = false;
    await ingreso.save();

    console.log(
      `Ingreso automático de una sola cuota procesado: ${ingreso._id}`
    );
  }
};

// Procesa cuotas de gastos
export const procesarCuotasGastos = async () => {
  console.log("procesando cuotas de gastos automaticas");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const gastos = await Gasto.find({
    cuotas: { $gt: 1 },
    cuotasAutomaticas: true,
  });
  for (const gasto of gastos) {
    const cuotasProcesadas = gasto.cuotasProcesadas || 0;
    if (cuotasProcesadas >= gasto.cuotas) continue; // Ya procesadas todas

    // Próxima cuota a procesar
    const fechaCuota = calcularFechaCuota(
      gasto.fechaInicio,
      gasto.frecuencia,
      cuotasProcesadas
    );
    fechaCuota.setHours(0, 0, 0, 0);

    if (fechaCuota <= hoy) {
      // Descontar cuota al usuario
      await Usuario.findByIdAndUpdate(gasto.user_fk, {
        $inc: { saldo: -gasto.cantidad / gasto.cuotas },
      });
      // Notificación automática
      await Notificacion.create({
        user_fk: gasto.user_fk,
        titulo: "Gasto en cuotas descontado",
        body: `Se descontó la cuota ${cuotasProcesadas + 1} de ${
          gasto.cuotas
        } por $${(gasto.cantidad / gasto.cuotas).toFixed(2)}.`,
        imagen: "./assets/icons/gasto.svg",
      });
      // Marcar cuota como procesada
      gasto.cuotasProcesadas = cuotasProcesadas + 1;
      await gasto.save();
      console.log(
        `Gasto en cuotas procesado para usuario ${gasto.user_fk}: cuota ${
          cuotasProcesadas + 1
        }/${gasto.cuotas}`
      );
    }
  }
};

export const procesarGastosCuotaUnica = async () => {
  console.log("Procesando gastos automáticos de 1 sola cuota...");

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const gastos = await Gasto.find({
    cuotas: 1,
    cuotasAutomaticas: true,
    cuotasProcesadas: { $lt: 1 },
    fechaInicio: { $lte: hoy },
  });

  for (const gasto of gastos) {
    await Usuario.findByIdAndUpdate(gasto.user_fk, {
      $inc: { saldo: gasto.cantidad },
    });

    await Notificacion.create({
      user_fk: gasto.user_fk,
      titulo: "gasto acreditado",
      body: `Se acreditó el gasto completo de $${gasto.cantidad.toFixed(2)}.`,
      imagen: "./assets/icons/gasto.svg",
    });

    gasto.cuotasProcesadas = 1;
    gasto.pendienteConfirmacion = false;
    await gasto.save();

    console.log(`gasto automático de una sola cuota procesado: ${gasto._id}`);
  }
};

// Procesa cuotas manuales de ingresos
export const procesarCuotasManualesIngresos = async () => {
  console.log("procesando cuotas manuales de ingresos");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ingresosManuales = await Ingreso.find({
    cuotas: { $gt: 1 },
    cuotasAutomaticas: false,
    pendienteConfirmacion: { $ne: true },
  });

  for (const ingreso of ingresosManuales) {
    const cuotasProcesadas = ingreso.cuotasProcesadas || 0;
    if (cuotasProcesadas >= ingreso.cuotas) continue;

    const fechaCuota = calcularFechaCuota(
      ingreso.fechaInicio,
      ingreso.frecuencia,
      cuotasProcesadas
    );
    fechaCuota.setHours(0, 0, 0, 0);

    if (fechaCuota <= hoy) {
      ingreso.pendienteConfirmacion = true;
      await ingreso.save();
      // Notificación manual
      await Notificacion.create({
        user_fk: ingreso.user_fk,
        titulo: "Ingreso en cuotas pendiente de confirmación",
        body: `Tienes una cuota (${cuotasProcesadas + 1} de ${
          ingreso.cuotas
        }) de $${(ingreso.cantidad / ingreso.cuotas).toFixed(
          2
        )} para acreditar manualmente.`,
        imagen: "./assets/icons/alerta.svg",
      });
    }
  }
};

// Procesa cuotas manuales de gastos
export const procesarCuotasManualesGastos = async () => {
  console.log("procesando cuotas manuales de gastos");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const gastosManuales = await Gasto.find({
    cuotas: { $gt: 1 },
    cuotasAutomaticas: false,
    pendienteConfirmacion: { $ne: true },
  });

  for (const gasto of gastosManuales) {
    const cuotasProcesadas = gasto.cuotasProcesadas || 0;
    if (cuotasProcesadas >= gasto.cuotas) continue;

    const fechaCuota = calcularFechaCuota(
      gasto.fechaInicio,
      gasto.frecuencia,
      cuotasProcesadas
    );
    fechaCuota.setHours(0, 0, 0, 0);

    if (fechaCuota <= hoy) {
      gasto.pendienteConfirmacion = true;
      await gasto.save();
      // Notificación manual
      await Notificacion.create({
        user_fk: gasto.user_fk,
        titulo: "Gasto en cuotas pendiente de confirmación",
        body: `Tienes una cuota (${cuotasProcesadas + 1} de ${
          gasto.cuotas
        }) de $${(gasto.cantidad / gasto.cuotas).toFixed(
          2
        )} para descontar manualmente.`,
        imagen: "./assets/icons/alerta.svg",
      });
    }
  }
};

export const procesarMetas = async () => {
  console.log("📆 Procesando metas de ahorro...");

  try {
    const metas = await Meta.find({
      tipo: { $exists: true },
      moneda_extranjera: null,
    }).populate("user_fk");

    for (const meta of metas) {
      if (meta.moneda_extranjera) {
        console.log(`🔶 Saltando meta de divisa ${meta._id}`);
        continue;
      }

      const usuario = meta.user_fk;

      // 🟡 Verificar si la meta ya alcanzó el objetivo
      if (meta.progreso >= meta.objetivo) {
        console.log(
          `🎯 Meta "${meta.nombre}" ya alcanzada por el usuario ${usuario._id}.`
        );

        // ✅ Notificar solo una vez cuando alcanza la meta
        const yaNotificada = await Notificacion.exists({
          user_fk: usuario._id,
          titulo: "¡Meta alcanzada!",
          body: `Has alcanzado tu meta "${meta.nombre}". 🎉`,
        });

        if (!yaNotificada) {
          await Notificacion.create({
            user_fk: usuario._id,
            titulo: "¡Meta alcanzada!",
            body: `Has alcanzado tu meta "${meta.nombre}". 🎉`,
            imagen: "./assets/icons/meta_cumplida.svg",
          });
        }

        continue; // 👉 Saltar a la siguiente meta
      }

      let descuento = 0;

      // 🟢 Calcular el descuento según el tipo de meta
      if (meta.tipo.montoMensual) {
        descuento = meta.tipo.montoMensual;
      } else if (meta.tipo.porcentajeMensual) {
        descuento = (usuario.saldo * meta.tipo.porcentajeMensual) / 100;
      }

      // 🟢 Verificar saldo suficiente
      if (usuario.saldo < descuento || descuento <= 0) {
        console.log(
          `⚠️ Usuario ${usuario._id} no tiene saldo suficiente para la meta "${meta.nombre}"`
        );

        await Notificacion.create({
          user_fk: usuario._id,
          titulo: "Aporte a meta no realizado",
          body: `No se pudo aportar $${descuento.toFixed(2)} a tu meta "${
            meta.nombre
          }" porque tu saldo actual no es suficiente.`,
          imagen: "./assets/icons/alerta.svg",
        });

        continue;
      }

      // 🟢 Calcular cuánto falta para alcanzar el objetivo
      const restante = meta.objetivo - meta.progreso;

      // ⚡️ Evitar que se aporte más del objetivo
      const aporteFinal = Math.min(descuento, restante);

      usuario.saldo -= aporteFinal;
      meta.progreso += aporteFinal;

      // Guardar el avance
      meta.avances.push({
        cantidad: aporteFinal,
        fecha: new Date(),
      });

      await usuario.save();
      await meta.save();

      console.log(
        `✅ Meta "${meta.nombre}" actualizada: -$${aporteFinal.toFixed(
          2
        )} al usuario ${usuario._id}`
      );

      await Notificacion.create({
        user_fk: usuario._id,
        titulo: "Aporte a meta exitoso",
        body: `Se acreditó $${aporteFinal.toFixed(2)} a tu meta "${
          meta.nombre
        }". ¡Sigue así!`,
        imagen: "./assets/icons/meta.svg",
      });

      // 🟢 Si con este aporte se alcanza el objetivo
      if (meta.progreso >= meta.objetivo) {
        console.log(
          `🎉 Meta "${meta.nombre}" alcanzada por el usuario ${usuario._id}`
        );

        await Notificacion.create({
          user_fk: usuario._id,
          titulo: "¡Meta alcanzada!",
          body: `¡Felicidades! Has alcanzado tu meta "${meta.nombre}". 🎉`,
          imagen: "./assets/icons/meta_cumplida.svg",
        });
      }
    }
  } catch (error) {
    console.error("❌ Error al procesar metas:", error);
  }
};

export const notificarGastosSemanales = async () => {
  console.log("Aviso de gastos semanales programado...");

  const hoy = new Date();
  const primerDiaSemana = new Date(hoy);
  primerDiaSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo
  primerDiaSemana.setHours(0, 0, 0, 0);

  const ultimoDiaSemana = new Date(primerDiaSemana);
  ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 7); // Siguiente domingo
  ultimoDiaSemana.setHours(0, 0, 0, 0);

  console.log(`Buscando gastos entre ${primerDiaSemana} y ${ultimoDiaSemana}`);

  // Buscar todos los gastos programados para esta semana
  const gastosSemana = await Gasto.find({
    fechaInicio: { $gte: primerDiaSemana, $lt: ultimoDiaSemana },
  });

  console.log(`Encontrados ${gastosSemana.length} gastos programados.`);
  console.log(`Gastos: ${gastosSemana.map((g) => g.nombre).join(", ")}`);

  if (gastosSemana.length > 0) {
    console.log(
      `Hay ${gastosSemana.length} gastos programados para esta semana.`
    );

    // Agrupar los gastos por usuario
    const gastosPorUsuario = gastosSemana.reduce((acc, gasto) => {
      const userId = gasto.user_fk.toString();
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(gasto);
      return acc;
    }, {});

    for (const userId in gastosPorUsuario) {
      const gastosUsuario = gastosPorUsuario[userId];
      const totalGastos = gastosUsuario.length;
      const totalMonto = gastosUsuario.reduce(
        (sum, gasto) => sum + gasto.cantidad,
        0
      );

      const payload = JSON.stringify({
        title: "Gastos programados esta semana",
        body: `Tienes ${totalGastos} gastos programados esta semana por un total de $${totalMonto.toFixed(
          2
        )}.`,
      });

      const suscripcion = await Suscripcion.findOne({ user_fk: userId });
      if (
        suscripcion &&
        suscripcion.subscription &&
        suscripcion.subscription.endpoint
      ) {
        try {
          await webpush.sendNotification(suscripcion.subscription, payload);
          console.log(`📤 Notificación webpush enviada al usuario ${userId}`);
        } catch (err) {
          console.error(
            `❌ Error enviando notificación Web Push al usuario ${userId}:`,
            err
          );
        }
      } else {
        console.log(
          `⚠️ Usuario ${userId} no tiene suscripción activa, solo se guardará la notificación en la app`
        );
      }

      // 🔥 Guardar la notificación en la base de datos SIEMPRE
      await Notificacion.create({
        user_fk: userId,
        titulo: "Gastos programados esta semana",
        body: `Tienes ${totalGastos} gastos programados esta semana por un total de $${totalMonto.toFixed(
          2
        )}.`,
        imagen: "./assets/icons/gasto.svg",
      });
      console.log(`✅ Notificación guardada en DB para usuario ${userId}`);
    }
  } else {
    console.log("No hay gastos programados para esta semana.");
  }
};

// Notificar mitad de mes (solo el día 15 a las 9 AM)
cron.schedule("0 9 15 * *", notificarMitadDeMes);

// Notificar gastos semanales (cada domingo a las 9 AM)
cron.schedule("0 9 * * 0", notificarGastosSemanales);

// Procesar ingresos y gastos fijos (mejor cada día a las 00:00, por si hay nuevos movimientos)
cron.schedule("0 0 * * *", procesarIngresosYGastosFijos);

// Notificar pendientes (mejor cada hora, así el usuario recibe el aviso pronto)
cron.schedule("0 * * * *", notificarPendientes);

// Notificar recordatorio de metas (cada 6 horas, suficiente para no ser invasivo)
cron.schedule("0 */6 * * *", notificarRecordatorioMetas);

// Notificar saldo bajo (cada 2 horas, para no saturar pero mantener informado)
cron.schedule("0 */2 * * *", notificarSaldoBajo);

// Notificar gasto recurrente próximo (cada 6 horas, para anticipar sin ser molesto)
cron.schedule("0 */6 * * *", notificarGastoRecurrenteProximo);

// Notificar usuario sin datos (una vez al día, suficiente para este tipo de recordatorio)
cron.schedule("0 13 * * *", notificarUsuarioSinDatos);

// Procesar cuotas automáticas de ingresos y gastos (cada 15 minutos para inmediatez)

cron.schedule("*/1 * * * *", procesarCuotasIngresos);
cron.schedule("*/1 * * * *", procesarCuotasGastos);
cron.schedule("*/1 * * * *", procesarIngresosCuotaUnica);
cron.schedule("*/1 * * * *", procesarGastosCuotaUnica);

// Procesar cuotas manuales (cada 15 minutos para que el pendiente aparezca rápido)
cron.schedule("*/1 * * * *", procesarCuotasManualesIngresos);
cron.schedule("*/1 * * * *", procesarCuotasManualesGastos);

cron.schedule("*/1 * * * *", procesarMetas);

// Permite ejecutar funciones manualmente desde la terminal
if (import.meta.url === `file://${process.argv[1]}`) {
  // Conexión a la base de datos
  mongoose
    .connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Conectado a la base de datos");
      // Ejecuta el cronjob que quieras probar
      return procesarCuotasManualesIngresos();
    })
    .then(() => {
      console.log(
        "Procesamiento de cuotas automáticas de ingresos finalizado."
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
