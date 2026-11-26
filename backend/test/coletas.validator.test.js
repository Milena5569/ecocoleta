const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validarColeta
} = require("../src/validators/coletas.validator");

function obterHojeEmSaoPaulo() {
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

function obterAmanhaEmSaoPaulo() {
  const data = new Date(`${obterHojeEmSaoPaulo()}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + 1);

  return data.toISOString().slice(0, 10);
}

test("aceita dados válidos e remove espaços extras do cliente", () => {
  const resultado = validarColeta({
    cliente: "  Maria Silva  ",
    tipoResiduo: "Papelão",
    pesoKg: "12.5",
    dataColeta: obterHojeEmSaoPaulo(),
    status: "Agendada",
    observacao: ""
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.dadosValidados.cliente, "Maria Silva");
  assert.equal(resultado.dadosValidados.observacao, null);
});

test("rejeita dados inválidos e identifica os campos com erro", () => {
  const resultado = validarColeta({
    cliente: "AB",
    tipoResiduo: "Madeira",
    pesoKg: 0,
    dataColeta: "",
    status: "Pendente",
    observacao: 123
  });

  assert.equal(resultado.valido, false);
  assert.ok(resultado.erros.cliente);
  assert.ok(resultado.erros.tipoResiduo);
  assert.ok(resultado.erros.pesoKg);
  assert.ok(resultado.erros.dataColeta);
  assert.ok(resultado.erros.status);
  assert.ok(resultado.erros.observacao);
});

test("rejeita data futura quando o status é Realizada", () => {
  const resultado = validarColeta({
    cliente: "Empresa Verde",
    tipoResiduo: "Plástico",
    pesoKg: 25,
    dataColeta: obterAmanhaEmSaoPaulo(),
    status: "Realizada",
    observacao: ""
  });

  assert.equal(resultado.valido, false);
  assert.match(
    resultado.erros.dataColeta,
    /não pode ter data futura/
  );
});