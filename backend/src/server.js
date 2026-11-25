//recepcionista da API

require("dotenv").config();

const coletasRoutes = require("./routes/coletas.routes");
const express = require("express");
const cors = require("cors");
const database = require("./config/database");

const app = express();

app.use(cors({
origin: process.env.FRONTEND_URL
}));

app.use(express.json());
app.use("/api/coletas", coletasRoutes);

app.get("/api/health", async (req, res) => {
try {
await database.query("SELECT 1");

res.json({
status: "ok",
database: "connected"
});
} catch (error) {
console.error("Falha ao conectar ao banco:", error.message);

res.status(500).json({
status: "error",
database: "disconnected"
});
}
});

const port = process.env.PORT || 3000;
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "Endpoint da API não encontrado."
  });
});

app.use((error, req, res, next) => {
  console.error("Erro na API:", error.message);

  res.status(500).json({
    message: "Ocorreu um erro interno. Tente novamente."
  });
});

app.listen(port, () => {
console.log(`API disponível em http://localhost:${port}`);
});