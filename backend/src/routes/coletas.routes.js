const express = require("express");
const database = require("../config/database");
const { validarColeta } = require("../validators/coletas.validator");

const router = express.Router();

const TIPOS_RESIDUO = new Set([
  "Papelão",
  "Plástico",
  "Metal",
  "Vidro",
  "Óleo",
  "Eletrônico"
]);

const STATUS_VALIDOS = new Set([
  "Agendada",
  "Realizada",
  "Cancelada"
]);

const COLUNAS_COLETA = `
  id,
  cliente,
  tipo_residuo AS tipoResiduo,
  peso_kg AS pesoKg,
  DATE_FORMAT(data_coleta, '%Y-%m-%d') AS dataColeta,
  status,
  observacao
`;

function obterIdValido(valor) {
  const id = Number(valor);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

async function buscarColetaPorId(id) {
  const [linhas] = await database.execute(
    `SELECT ${COLUNAS_COLETA}
     FROM coletas
     WHERE id = ?`,
    [id]
  );

  return linhas[0] || null;
}

// GET /api/coletas
// Aceita filtros opcionais: status, tipoResiduo e cliente.
router.get("/", async (req, res, next) => {
  try {
    const partesWhere = [];
    const parametros = [];

    const { status, tipoResiduo, cliente } = req.query;

    if (status !== undefined) {
      if (typeof status !== "string" || !STATUS_VALIDOS.has(status)) {
        return res.status(400).json({
          message: "O filtro de status é inválido."
        });
      }

      partesWhere.push("status = ?");
      parametros.push(status);
    }

    if (tipoResiduo !== undefined) {
      if (
        typeof tipoResiduo !== "string" ||
        !TIPOS_RESIDUO.has(tipoResiduo)
      ) {
        return res.status(400).json({
          message: "O filtro de tipo de resíduo é inválido."
        });
      }

      partesWhere.push("tipo_residuo = ?");
      parametros.push(tipoResiduo);
    }

    if (cliente !== undefined) {
      if (typeof cliente !== "string") {
        return res.status(400).json({
          message: "O filtro de cliente é inválido."
        });
      }

      const termo = cliente.trim();

      if (termo) {
        const termoEscapado = termo.replace(/[!%_]/g, "!$&");
        partesWhere.push("cliente LIKE ? ESCAPE '!'");
        parametros.push(`%${termoEscapado}%`);
      }
    }

    const where =
      partesWhere.length > 0
        ? `WHERE ${partesWhere.join(" AND ")}`
        : "";

    const [coletas] = await database.execute(
      `SELECT ${COLUNAS_COLETA}
       FROM coletas
       ${where}
       ORDER BY data_coleta DESC, id DESC`,
      parametros
    );

    res.json(coletas);
  } catch (error) {
    next(error);
  }
});

// GET /api/coletas/:id
router.get("/:id", async (req, res, next) => {
  try {
    const id = obterIdValido(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "O identificador da coleta é inválido."
      });
    }

    const coleta = await buscarColetaPorId(id);

    if (!coleta) {
      return res.status(404).json({
        message: "Coleta não encontrada."
      });
    }

    res.json(coleta);
  } catch (error) {
    next(error);
  }
});

// POST /api/coletas
router.post("/", async (req, res, next) => {
  try {
    const resultado = validarColeta(req.body);

    if (!resultado.valido) {
      return res.status(400).json({
        message: "Verifique os campos informados.",
        errors: resultado.erros
      });
    }

    const coleta = resultado.dadosValidados;

    const [resultadoInsercao] = await database.execute(
      `INSERT INTO coletas
        (cliente, tipo_residuo, peso_kg, data_coleta, status, observacao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        coleta.cliente,
        coleta.tipoResiduo,
        coleta.pesoKg,
        coleta.dataColeta,
        coleta.status,
        coleta.observacao
      ]
    );

    const novaColeta = await buscarColetaPorId(
      resultadoInsercao.insertId
    );

    res.status(201).json({
      message: "Coleta cadastrada com sucesso.",
      coleta: novaColeta
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/coletas/:id
router.put("/:id", async (req, res, next) => {
  try {
    const id = obterIdValido(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "O identificador da coleta é inválido."
      });
    }

    const existente = await buscarColetaPorId(id);

    if (!existente) {
      return res.status(404).json({
        message: "Coleta não encontrada."
      });
    }

    const resultado = validarColeta(req.body);

    if (!resultado.valido) {
      return res.status(400).json({
        message: "Verifique os campos informados.",
        errors: resultado.erros
      });
    }

    const coleta = resultado.dadosValidados;

    await database.execute(
      `UPDATE coletas
       SET cliente = ?,
           tipo_residuo = ?,
           peso_kg = ?,
           data_coleta = ?,
           status = ?,
           observacao = ?
       WHERE id = ?`,
      [
        coleta.cliente,
        coleta.tipoResiduo,
        coleta.pesoKg,
        coleta.dataColeta,
        coleta.status,
        coleta.observacao,
        id
      ]
    );

    const coletaAtualizada = await buscarColetaPorId(id);

    res.json({
      message: "Coleta atualizada com sucesso.",
      coleta: coletaAtualizada
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/coletas/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const id = obterIdValido(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "O identificador da coleta é inválido."
      });
    }

    const [resultado] = await database.execute(
      "DELETE FROM coletas WHERE id = ?",
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        message: "Coleta não encontrada."
      });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;