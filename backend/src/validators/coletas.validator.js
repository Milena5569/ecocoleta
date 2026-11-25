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

function obterDataAtualEmSaoPaulo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const data = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value])
  );

  return `${data.year}-${data.month}-${data.day}`;
}

function dataExiste(data) {
  if (
    typeof data !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    return false;
  }

  const [ano, mes, dia] = data.split("-").map(Number);
  const dataCalculada = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    dataCalculada.getUTCFullYear() === ano &&
    dataCalculada.getUTCMonth() === mes - 1 &&
    dataCalculada.getUTCDate() === dia
  );
}

function validarColeta(entrada) {
  const dados =
    entrada && typeof entrada === "object" && !Array.isArray(entrada)
      ? entrada
      : {};

  const erros = {};

  const cliente =
    typeof dados.cliente === "string" ? dados.cliente.trim() : "";

  if (Array.from(cliente).length < 3) {
    erros.cliente = "Informe um cliente com pelo menos 3 caracteres.";
  }

  const tipoResiduo = dados.tipoResiduo;

  if (!TIPOS_RESIDUO.has(tipoResiduo)) {
    erros.tipoResiduo = "Selecione um tipo de resíduo válido.";
  }

  const pesoKg =
    dados.pesoKg === "" || dados.pesoKg === null
      ? NaN
      : Number(dados.pesoKg);

  if (!Number.isFinite(pesoKg) || pesoKg <= 0) {
    erros.pesoKg = "Informe um peso válido maior que zero.";
  }

  const dataColeta = dados.dataColeta;

  if (!dataExiste(dataColeta)) {
    erros.dataColeta = "Informe uma data válida.";
  }

  const status = dados.status;

  if (!STATUS_VALIDOS.has(status)) {
    erros.status = "Selecione um status válido.";
  }

  if (
    status === "Realizada" &&
    dataExiste(dataColeta) &&
    dataColeta > obterDataAtualEmSaoPaulo()
  ) {
    erros.dataColeta =
      "Uma coleta realizada não pode ter data futura.";
  }

  if (
    dados.observacao !== undefined &&
    dados.observacao !== null &&
    typeof dados.observacao !== "string"
  ) {
    erros.observacao = "A observação deve ser um texto.";
  }

  const observacao =
    typeof dados.observacao === "string"
      ? dados.observacao.trim() || null
      : null;

  return {
    valido: Object.keys(erros).length === 0,
    erros,
    dadosValidados: {
      cliente,
      tipoResiduo,
      pesoKg,
      dataColeta,
      status,
      observacao
    }
  };
}

module.exports = {
  validarColeta
};