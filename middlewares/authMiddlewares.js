import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const secretKey = process.env.SECRET;

if (!secretKey) {
  console.error(
    "Error: La clave secreta (SECRET) no está definida en las variables de entorno."
  );
}

const auth = (req, res, next) => {
  const getToken = req.headers.authorization;

  if (getToken) {
    const token = getToken.split(" ")[1];

    jwt.verify(token, secretKey, (err, payload) => {
      if (err) {
        return res.status(403).json({ message: "Token no válido o expirado." });
      }

      req.user = { id: payload.id, email: payload.email };
      next();
    });
  } else {
    return res.status(401).json({ message: "Se requiere autenticación." });
  }
};

export default auth;
