import mongoose from "mongoose";
import webpush from "web-push";
import fetch from "node-fetch";
import SuscripcionPush from "./models/suscripciones.js";
import dotenv from "dotenv";
dotenv.config();

webpush.setVapidDetails(
  "mailto:tu-email@ejemplo.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const url = process.env.DB_URL;
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

async function sendTestNotification(userId) {
  await mongoose.connect(url);

  const suscripcion = await SuscripcionPush.findOne({ user_fk: userId });
  if (!suscripcion) {
    console.log("No se encontró suscripción para el usuario");
    process.exit();
  }

  const payload = JSON.stringify({
    title: "¡Notificación de prueba!",
    body: "Esto es una notificación push de prueba desde Finz.",
  });

  // Notificación web-push
  if (suscripcion.subscription) {
    try {
      await webpush.sendNotification(suscripcion.subscription, payload);
      console.log("Notificación web-push enviada correctamente");
    } catch (err) {
      console.error("Error enviando notificación web-push:", err);
    }
  }

  // Notificación FCM
  if (suscripcion.fcmToken && FCM_SERVER_KEY) {
    try {
      const fcmPayload = {
        to: suscripcion.fcmToken,
        notification: {
          title: "¡Notificación de prueba!",
          body: "Esto es una notificación push de prueba desde Finz.",
          icon: "/vite.svg",
        },
      };

      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: "key=" + FCM_SERVER_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmPayload),
      });

      const data = await response.json();
      if (data.success === 1 || data.message_id) {
        console.log("Notificación FCM enviada correctamente");
      } else {
        console.error("Error en la respuesta de FCM:", data);
      }
    } catch (err) {
      console.error("Error enviando notificación FCM:", err);
    }
  } else if (!suscripcion.fcmToken) {
    console.log("El usuario no tiene token FCM registrado.");
  } else if (!FCM_SERVER_KEY) {
    console.log("No se encontró FCM_SERVER_KEY en las variables de entorno.");
  }

  process.exit();
}

sendTestNotification("684af9925b56ce8088e1c8ba");
