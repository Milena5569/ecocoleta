

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const database = require("./config/database");

const app = express();

app.use(cors({
origin: process.env.FRONTEND_URL
}));

app.use(express.json());

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

app.listen(port, () => {
console.log(`API disponível em http://localhost:${port}`);
});