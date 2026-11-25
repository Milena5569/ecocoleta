const express = require("express"); //importa o express para criar as rotas da API
const database = require("../config/database"); //importa a conexão com o banco de dados
const { validarColeta } = require("../validators/coletas.validator"); //importa a função de validação de coletas

const router = express.Router();  //cria um roteador para gerenciar as rotas relacionadas às coletas

const TIPOS_RESIDUO = new Set([ //define os tipos de resíduos válidos
    "Papelão",
    "Plástico",
    "Metal",
    "Vidro",
    "Óleo",
    "Eletrônico"
]);

const STATUS_VALIDOS = new Set([ //define os status válidos para as coletas
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
`; //define as colunas que serão retornadas nas consultas de coletas

function obterIdValido(valor) {
    const id = Number(valor);

    return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
} //função para validar se o id é um número inteiro seguro e maior que zero

async function buscarColetaPorId(id) {
const [linhas] = await database.execute(
    `SELECT ${COLUNAS_COLETA}
    FROM coletas
    WHERE id = ?`,
    [id]
); //executa a consulta no banco de dados para buscar a coleta pelo id

return linhas[0] || null;
} //função para retornar a primeira linha da consulta ou null caso não exista


router.get("/", async (req, res, next) => {
try {
    const partesWhere = [];
    const parametros = [];

    const { status, tipoResiduo, cliente } = req.query;

    if (status !== undefined) { 
        if (typeof status !== "string" || !STATUS_VALIDOS.has(status)) { //verifica se o status é uma string e se está dentro dos status válidos
        return res.status(400).json({ 
            message: "O filtro de status é inválido." 
        }); 
    }

partesWhere.push("status = ?"); 
parametros.push(status); 
} //verifica se o status foi fornecido na query e se é válido, caso contrário retorna um erro 400

    if (tipoResiduo !== undefined) {
        if (
            typeof tipoResiduo !== "string" ||
            !TIPOS_RESIDUO.has(tipoResiduo)
        ) {
        return res.status(400).json({
            message: "O filtro de tipo de resíduo é inválido."
        });
        } //verifica se o tipo de resíduo é uma string e se está dentro dos tipos válidos, caso contrário retorna um erro 400

        partesWhere.push("tipo_residuo = ?");
        parametros.push(tipoResiduo);
    } //verifica se o tipo de resíduo foi fornecido na query e se é válido, caso contrário retorna um erro 400

    if (cliente !== undefined) {
        if (typeof cliente !== "string") {
        return res.status(400).json({
            message: "O filtro de cliente é inválido."
        });
        }

    const termo = cliente.trim(); 

    if (termo) {
        const termoEscapado = termo.replace(/[!%_]/g, "!$&"); //escapa os caracteres especiais para evitar problemas na consulta SQL
        partesWhere.push("cliente LIKE ? ESCAPE '!'"); //adiciona a condição de filtro para o cliente usando LIKE e ESCAPE para tratar caracteres especiais
        parametros.push(`%${termoEscapado}%`); //adiciona o termo de pesquisa com curingas para buscar qualquer ocorrência do termo no nome do cliente
    } 
    }

    const where =
        partesWhere.length > 0 
        ? `WHERE ${partesWhere.join(" AND ")}` //monta a cláusula WHERE da consulta SQL com as condições de filtro fornecidas na query, unindo-as com AND
        : "";

    const [coletas] = await database.execute( //executa a consulta no banco de dados para buscar as coletas com os filtros aplicados
        `SELECT ${COLUNAS_COLETA}
        FROM coletas
        ${where}
        ORDER BY data_coleta DESC, id DESC`,
        parametros
    );

    res.json(coletas); //retorna as coletas encontradas como resposta em formato JSON
    } 
    catch (error) { 
        next(error); //passa o erro para o middleware de tratamento de erros do Express, que irá lidar com ele e enviar uma resposta adequada ao cliente
    }
});

router.get("/:id", async (req, res, next) => { //rota para buscar uma coleta específica pelo seu ID
    try {
    const id = obterIdValido(req.params.id); //obtém o ID da coleta a partir dos parâmetros da rota e valida se é um número inteiro seguro e maior que zero

    if (!id) {
        return res.status(400).json({ //retorna um erro 400 caso o ID seja inválido
        message: "O identificador da coleta é inválido."
        });
    }

    const coleta = await buscarColetaPorId(id); //busca a coleta no banco de dados utilizando a função buscarColetaPorId, que retorna a primeira linha da consulta ou null caso não exista

    if (!coleta) {
        return res.status(404).json({ //retorna um erro 404 caso a coleta não seja encontrada no banco de dados
        message: "Coleta não encontrada."
        });
    }

    res.json(coleta);
    } catch (error) {
    next(error);
    }
});

// POST /api/coletas
router.post("/", async (req, res, next) => { //rota para criar uma nova coleta
    try {
    const resultado = validarColeta(req.body); //valida os dados da coleta recebidos no corpo da requisição utilizando a função validarColeta, que retorna um objeto com as informações validadas e possíveis erros de validação

    if (!resultado.valido) { 
        return res.status(400).json({
        message: "Verifique os campos informados.",
        errors: resultado.erros
        });
    }

    const coleta = resultado.dadosValidados;

    const [resultadoInsercao] = await database.execute(  //executa a inserção da nova coleta no banco de dados utilizando a conexão com o banco e a query SQL de inserção, passando os valores validados como parâmetros
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

    await database.execute( //executa a atualização da coleta no banco de dados utilizando a conexão com o banco e a query SQL de atualização, passando os valores validados como parâmetros
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

module.exports = router; //exporta o roteador para ser utilizado em outros arquivos da API, permitindo que as rotas definidas neste arquivo sejam acessadas a partir do caminho "/api/coletas" no servidor Express