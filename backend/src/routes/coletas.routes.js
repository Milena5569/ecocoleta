const express = require("express");
const database = require("../config/database");
const { validarColeta } = require("../validators/coletas.validator");

const router = express.Router();

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

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function buscarColetaPorId(id) {
  const [linhas] = await database.execute(
    `SELECT ${COLUNAS_COLETA} FROM coletas WHERE id = ?`,
    [id]
  );

  return linhas[0] || null;
}

// Lista todas as coletas, da mais recente para a mais antiga.
router.get("/", async (req, res, next) => {
  try {
    const [coletas] = await database.query(`
      SELECT ${COLUNAS_COLETA}
      FROM coletas
      ORDER BY data_coleta DESC, id DESC
    `);

    res.json(coletas);
  } catch (error) {
    next(error);
  }
});

// Cadastra uma coleta.
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

// Edita uma coleta. A validação é a mesma do cadastro.
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

// Exclui uma coleta.
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