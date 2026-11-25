"use strict";

const formatarQuantidade = new Intl.NumberFormat("pt-BR");

const formatarPercentual = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1
});

const formatarToneladas = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function atualizarIndicadores(coletas) {
  const registros = Array.isArray(coletas) ? coletas : [];

  const totalColetas = registros.length;

  const coletasRealizadas = registros.filter(
    (coleta) => coleta.status === "Realizada"
  );

  const coletasAgendadas = registros.filter(
    (coleta) => coleta.status === "Agendada"
  );

  const percentualRealizadas =
    totalColetas === 0
      ? 0
      : (coletasRealizadas.length / totalColetas) * 100;

  const pesoRealizadoKg = coletasRealizadas.reduce((soma, coleta) => {
    const peso = Number(coleta.pesoKg);

    return Number.isFinite(peso) ? soma + peso : soma;
  }, 0);

  const pesoRealizadoToneladas = pesoRealizadoKg / 1000;

  document.querySelector("#metric-total").textContent =
    formatarQuantidade.format(totalColetas);

  document.querySelector("#metric-completed").textContent =
    formatarQuantidade.format(coletasRealizadas.length);

  document.querySelector("#metric-completed-percentage").textContent =
    totalColetas === 0
      ? "0%"
      : `${formatarPercentual.format(percentualRealizadas)}% do total`;

  document.querySelector("#metric-scheduled").textContent =
    formatarQuantidade.format(coletasAgendadas.length);

  document.querySelector("#scheduled-attention-badge").hidden =
    coletasAgendadas.length === 0;

  const pesoFormatado =
    pesoRealizadoKg === 0
      ? "0 t"
      : `${formatarToneladas.format(pesoRealizadoToneladas)} t`;

  document.querySelector("#metric-destined-weight").textContent =
    pesoFormatado;

  const barraProgresso = document.querySelector("#completed-progress");
  const trilhaProgresso = document.querySelector(".progress-track");

  barraProgresso.style.width = `${percentualRealizadas}%`;
  trilhaProgresso.setAttribute(
    "aria-valuenow",
    percentualRealizadas.toFixed(1)
  );
}

let todasAsColetas = [];
let idDaColetaParaExcluir = null;

const corpoTabela = document.querySelector("#collections-table-body");
const modeloLinha = document.querySelector("#collection-row-template");
const tabelaContainer = document.querySelector("#collections-table-container");
const estadoListaVazia = document.querySelector("#collections-empty");
const estadoSemResultados = document.querySelector("#filters-empty");

const buscaCliente = document.querySelector("#search-client");
const filtroStatus = document.querySelector("#filter-status");
const filtroResiduo = document.querySelector("#filter-waste-type");
const formularioFiltros = document.querySelector("#filters-form");

const dialogoColeta = document.querySelector("#collection-dialog");
const formularioColeta = document.querySelector("#collection-form");
const dialogoExclusao = document.querySelector("#delete-dialog");

function formatarData(data) {
  const dataTexto = String(data || "").slice(0, 10);
  const partes = dataTexto.split("-");

  if (partes.length !== 3) {
    return "—";
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterColetasFiltradas() {
  const nomePesquisado = buscaCliente.value
    .trim()
    .toLocaleLowerCase("pt-BR");

  const statusSelecionado = filtroStatus.value;
  const residuoSelecionado = filtroResiduo.value;

  return todasAsColetas
    .filter((coleta) => {
      const nomeCliente = String(coleta.cliente || "")
        .toLocaleLowerCase("pt-BR");

      const correspondeAoNome =
        nomeCliente.includes(nomePesquisado);

      const correspondeAoStatus =
        !statusSelecionado || coleta.status === statusSelecionado;

      const correspondeAoResiduo =
        !residuoSelecionado ||
        coleta.tipoResiduo === residuoSelecionado;

      return (
        correspondeAoNome &&
        correspondeAoStatus &&
        correspondeAoResiduo
      );
    })
    .sort((a, b) => {
      const dataA = String(a.dataColeta || "").slice(0, 10);
      const dataB = String(b.dataColeta || "").slice(0, 10);

      return dataB.localeCompare(dataA);
    });
}

function desenharTabela(coletas) {
  corpoTabela.replaceChildren();

  for (const coleta of coletas) {
    const linha = modeloLinha.content.cloneNode(true);
    const linhaElemento = linha.querySelector("tr");

    linha.querySelector('[data-field="cliente"]').textContent =
      coleta.cliente || "—";

    linha.querySelector('[data-field="tipoResiduo"]').textContent =
      coleta.tipoResiduo || "—";

    const peso = Number(coleta.pesoKg);
    linha.querySelector('[data-field="pesoKg"]').textContent =
      Number.isFinite(peso)
        ? `${peso.toLocaleString("pt-BR")} kg`
        : "—";

    linha.querySelector('[data-field="dataColeta"]').textContent =
      formatarData(coleta.dataColeta);

    const status = linha.querySelector('[data-field="status"]');
    status.textContent = coleta.status || "—";
    status.classList.add(
      `status-badge--${String(coleta.status || "").toLowerCase()}`
    );

    linhaElemento.dataset.collectionId = String(coleta.id);

    const botaoEditar = linha.querySelector('[data-action="edit"]');
    botaoEditar.dataset.collectionId = String(coleta.id);
    botaoEditar.setAttribute(
      "aria-label",
      `Editar coleta de ${coleta.cliente || "cliente"}`
    );

    const botaoExcluir = linha.querySelector('[data-action="delete"]');
    botaoExcluir.dataset.collectionId = String(coleta.id);
    botaoExcluir.setAttribute(
      "aria-label",
      `Excluir coleta de ${coleta.cliente || "cliente"}`
    );

    corpoTabela.append(linha);
  }
}

function atualizarListaDeColetas(coletas) {
  todasAsColetas = Array.isArray(coletas) ? coletas : [];

  atualizarIndicadores(todasAsColetas);

  const coletasVisiveis = obterColetasFiltradas();
  const naoHaColetas = todasAsColetas.length === 0;
  const naoHaResultados =
    todasAsColetas.length > 0 && coletasVisiveis.length === 0;

  estadoListaVazia.hidden = !naoHaColetas;
  estadoSemResultados.hidden = !naoHaResultados;
  tabelaContainer.hidden =
    naoHaColetas || naoHaResultados;

  desenharTabela(coletasVisiveis);
}

function criarConteudoCsv(valor) {
  let texto = String(valor ?? "");

  // Evita que valores digitados sejam interpretados como fórmulas no Excel.
  if (/^[=+\-@\t\r]/.test(texto)) {
    texto = `'${texto}`;
  }

  return `"${texto.replaceAll('"', '""')}"`;
}

function exportarColetasCsv() {
  const coletasVisiveis = obterColetasFiltradas();

  const cabecalho = [
    "Cliente",
    "Tipo de resíduo",
    "Peso (kg)",
    "Data da coleta",
    "Status",
    "Observação"
  ];

  const linhas = coletasVisiveis.map((coleta) => [
    coleta.cliente,
    coleta.tipoResiduo,
    coleta.pesoKg,
    formatarData(coleta.dataColeta),
    coleta.status,
    coleta.observacao
  ]);

  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.map(criarConteudoCsv).join(";"))
    .join("\r\n");

  const arquivo = new Blob(
    ["\uFEFF", conteudo],
    { type: "text/csv;charset=utf-8" }
  );

  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = endereco;
  link.download = "ecocoleta-coletas.csv";
  link.click();

  URL.revokeObjectURL(endereco);
}

function abrirFormularioDeEdicao(id) {
  const coleta = todasAsColetas.find(
    (registro) => String(registro.id) === String(id)
  );

  if (!coleta) {
    return;
  }

  formularioColeta.elements.id.value = coleta.id;
  formularioColeta.elements.cliente.value = coleta.cliente || "";
  formularioColeta.elements.tipoResiduo.value =
    coleta.tipoResiduo || "";
  formularioColeta.elements.pesoKg.value =
    coleta.pesoKg ?? "";
  formularioColeta.elements.dataColeta.value =
    String(coleta.dataColeta || "").slice(0, 10);
  formularioColeta.elements.status.value =
    coleta.status || "Agendada";
  formularioColeta.elements.observacao.value =
    coleta.observacao || "";

  document.querySelector("#collection-dialog-title").textContent =
    "Editar coleta";

  dialogoColeta
    .querySelector('[type="submit"]')
    .textContent = "Salvar alterações";

  dialogoColeta.showModal();
}

function abrirFormularioDeCadastro() {
  formularioColeta.reset();
  formularioColeta.elements.id.value = "";
  formularioColeta.elements.status.value = "Agendada";

  document.querySelector("#collection-dialog-title").textContent =
    "Nova coleta";

  dialogoColeta
    .querySelector('[type="submit"]')
    .textContent = "Salvar coleta";

  dialogoColeta.showModal();
}

document.querySelectorAll("[data-action]").forEach((botao) => {
  botao.addEventListener("click", () => {
    const acao = botao.dataset.action;

    if (acao === "open-create-dialog") {
      abrirFormularioDeCadastro();
    }

    if (acao === "close-collection-dialog") {
      dialogoColeta.close();
    }

    if (acao === "edit") {
      abrirFormularioDeEdicao(botao.dataset.collectionId);
    }

    if (acao === "delete") {
      idDaColetaParaExcluir = botao.dataset.collectionId;

      const coleta = todasAsColetas.find(
        (registro) =>
          String(registro.id) === String(idDaColetaParaExcluir)
      );

      document.querySelector(
        "#delete-confirmation-message"
      ).textContent = coleta
        ? `Confirma a exclusão da coleta de ${coleta.cliente}?`
        : "Confirma a exclusão deste registro?";

      dialogoExclusao.showModal();
    }

    if (acao === "cancel-delete") {
      idDaColetaParaExcluir = null;
      dialogoExclusao.close();
    }
  });
});

buscaCliente.addEventListener("input", () => {
  atualizarListaDeColetas(todasAsColetas);
});

filtroStatus.addEventListener("change", () => {
  atualizarListaDeColetas(todasAsColetas);
});

filtroResiduo.addEventListener("change", () => {
  atualizarListaDeColetas(todasAsColetas);
});

formularioFiltros.addEventListener("reset", () => {
  setTimeout(() => {
    atualizarListaDeColetas(todasAsColetas);
  }, 0);
});

document
  .querySelector("#export-csv-button")
  .addEventListener("click", exportarColetasCsv);

atualizarListaDeColetas([]);

function validarFormularioColeta() {
  const cliente = document.querySelector("#client-name");
  const tipoResiduo = document.querySelector("#waste-type");
  const pesoKg = document.querySelector("#weight-kg");
  const dataColeta = document.querySelector("#collection-date");
  const status = document.querySelector("#collection-status");

  const campos = [
    ["client-name", "client-name-error"],
    ["waste-type", "waste-type-error"],
    ["weight-kg", "weight-kg-error"],
    ["collection-date", "collection-date-error"],
    ["collection-status", "collection-status-error"]
  ];

  for (const [campoId, erroId] of campos) {
    document.querySelector(`#${campoId}`).setAttribute("aria-invalid", "false");
    document.querySelector(`#${erroId}`).textContent = "";
  }

  const mensagens = [];

  function marcarErro(campo, mensagem) {
    const erroId = `${campo.id}-error`;

    campo.setAttribute("aria-invalid", "true");
    document.querySelector(`#${erroId}`).textContent = mensagem;
    mensagens.push(campo);
  }

  if (cliente.value.trim().length < 3) {
    marcarErro(cliente, "Informe pelo menos 3 caracteres para o cliente.");
  }

  if (!tipoResiduo.value) {
    marcarErro(tipoResiduo, "Selecione o tipo de resíduo.");
  }

  if (!Number.isFinite(pesoKg.valueAsNumber) || pesoKg.valueAsNumber <= 0) {
    marcarErro(pesoKg, "Informe um peso maior que zero.");
  }

  if (!dataColeta.value) {
    marcarErro(dataColeta, "Informe a data da coleta.");
  }

  if (!status.value) {
    marcarErro(status, "Selecione o status da coleta.");
  }

  const agora = new Date();
  const hojeLocal = [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0")
  ].join("-");

  if (
    status.value === "Realizada" &&
    dataColeta.value &&
    dataColeta.value > hojeLocal
  ) {
    marcarErro(dataColeta, "Uma coleta realizada não pode ter data futura.");
  }

  if (mensagens.length > 0) {
    mensagens[0].focus();
    return false;
  }

  return true;
}

document
  .querySelector("#collection-form")
  .addEventListener("input", (evento) => {
    const campo = evento.target;
    const erro = document.querySelector(`#${campo.id}-error`);

    if (!erro) {
      return;
    }

    campo.setAttribute("aria-invalid", "false");
    erro.textContent = "";
  });