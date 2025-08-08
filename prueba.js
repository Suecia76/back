import mongoose from "mongoose";
import webpush from "web-push";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";
import SuscripcionPush from "./models/suscripciones.js";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
dotenv.config();

webpush.setVapidDetails(
  "mailto:tu-email@ejemplo.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const url = process.env.DB_URL;
const GOOGLE_APPLICATION_CREDENTIALS = "./service-account.json";

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

async function sendTestNotification(userId) {
  await mongoose.connect(url);

  // Buscar por ObjectId
  const suscripcion = await SuscripcionPush.findOne({
    user_fk: new mongoose.Types.ObjectId(userId),
  });
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

  // Notificación FCM HTTP v1
  if (suscripcion.fcmToken) {
    try {
      const accessToken = await getAccessToken();
      const serviceAccount = JSON.parse(
        await readFile(GOOGLE_APPLICATION_CREDENTIALS, "utf8")
      );
      const projectId = serviceAccount.project_id;

      const fcmPayload = {
        message: {
          token: suscripcion.fcmToken,
          notification: {
            title: "¡Notificación de prueba!",
            body: "Esto es una notificación push de prueba desde Finz.",
          },
          webpush: {
            notification: {
              icon: "/vite.svg",
            },
          },
        },
      };

      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fcmPayload),
        }
      );

      const data = await response.json();
      if (data.name) {
        console.log("Notificación FCM HTTP v1 enviada correctamente");
      } else {
        console.error("Error en la respuesta de FCM HTTP v1:", data);
      }
    } catch (err) {
      console.error("Error enviando notificación FCM HTTP v1:", err);
    }
  } else {
    console.log("El usuario no tiene token FCM registrado.");
  }

  process.exit();
}

// Reemplaza por el ObjectId de tu usuario
sendTestNotification("682b6be0bf34c33c567fbd3d");
