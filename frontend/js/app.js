"use strict";

const API_COLETAS_URL = "http://localhost:3000/api/coletas";

const formatarQuantidade = new Intl.NumberFormat("pt-BR");
const formatarPercentual = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1
});
const formatarToneladas = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const TIPOS_RESIDUO = [
  "Papelão",
  "Plástico",
  "Metal",
  "Vidro",
  "Óleo",
  "Eletrônico"
];

const elementoCarregamento = document.querySelector("#collections-loading");
const elementoErroCarregamento = document.querySelector("#collections-error");
const mensagemErroCarregamento = document.querySelector(
  "#collections-error-message"
);
const mensagemGeralFormulario = document.querySelector("#form-general-error");
const mensagemFeedback = document.querySelector("#feedback-message");

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

let todasAsColetas = [];
let idDaColetaParaExcluir = null;

function formatarData(data) {
  const dataTexto = String(data || "").slice(0, 10);
  const partes = dataTexto.split("-");

  if (partes.length !== 3 || partes.some((parte) => !parte)) {
    return "—";
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterHojeLocal() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function mostrarFeedback(mensagem, ocorreuErro = false) {
  mensagemFeedback.textContent = mensagem;
  mensagemFeedback.hidden = false;
  mensagemFeedback.classList.toggle("feedback-message--error", ocorreuErro);
}

function atualizarIndicadores(coletas) {
  const registros = Array.isArray(coletas) ? coletas : [];

  const realizadas = registros.filter(
    (coleta) => coleta.status === "Realizada"
  );

  const agendadas = registros.filter(
    (coleta) => coleta.status === "Agendada"
  );

  const total = registros.length;
  const percentual = total === 0 ? 0 : (realizadas.length / total) * 100;

  const pesoRealizadoKg = realizadas.reduce((soma, coleta) => {
    const peso = Number(coleta.pesoKg);
    return Number.isFinite(peso) ? soma + peso : soma;
  }, 0);

  document.querySelector("#metric-total").textContent =
    formatarQuantidade.format(total);

  document.querySelector("#metric-completed").textContent =
    formatarQuantidade.format(realizadas.length);

  document.querySelector("#metric-completed-percentage").textContent =
    total === 0
      ? "0%"
      : `${formatarPercentual.format(percentual)}% do total`;

  document.querySelector("#metric-scheduled").textContent =
    formatarQuantidade.format(agendadas.length);

  const seloAtencao = document.querySelector("#scheduled-attention-badge");
  seloAtencao.hidden = agendadas.length === 0;
  seloAtencao.textContent = "ATENÇÃO";

  const toneladas = pesoRealizadoKg / 1000;

  document.querySelector("#metric-destined-weight").textContent =
    pesoRealizadoKg === 0
      ? "0 t"
      : `${formatarToneladas.format(toneladas)} t`;

  const barraProgresso = document.querySelector("#completed-progress");
  const trilhaProgresso = document.querySelector(".progress-track");

  barraProgresso.style.width = `${Math.min(percentual, 100)}%`;
  trilhaProgresso.setAttribute("aria-valuenow", percentual.toFixed(1));

  atualizarCartaoAtrasadas(registros);
  desenharGraficoMensal(realizadas);
  desenharComposicao(realizadas);
}

function atualizarCartaoAtrasadas(coletas) {
  const cartao = document.querySelector("#overdue-attention-card");
  const descricao = document.querySelector("#overdue-description");
  const lista = document.querySelector("#overdue-collections-list");
  const hoje = obterHojeLocal();

  const atrasadas = coletas.filter((coleta) => {
    const data = String(coleta.dataColeta || "").slice(0, 10);

    return (
      coleta.status === "Agendada" &&
      data !== "" &&
      data < hoje
    );
  });

  lista.replaceChildren();
  cartao.hidden = atrasadas.length === 0;

  if (atrasadas.length === 0) {
    descricao.textContent = "";
    return;
  }

  descricao.textContent =
    atrasadas.length === 1
      ? "Há uma coleta agendada com data passada."
      : `Há ${formatarQuantidade.format(atrasadas.length)} coletas agendadas com data passada.`;

  for (const coleta of atrasadas) {
    const item = document.createElement("li");
    item.textContent =
      `${coleta.cliente} — ${formatarData(coleta.dataColeta)}`;
    lista.append(item);
  }
}

function desenharGraficoMensal(coletasRealizadas) {
  const grafico = document.querySelector("#monthly-chart");
  grafico.replaceChildren();

  const agora = new Date();

  const meses = Array.from({ length: 6 }, (_, indice) => {
    const data = new Date(
      agora.getFullYear(),
      agora.getMonth() - (5 - indice),
      1
    );

    const chave =
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    const nome = new Intl.DateTimeFormat("pt-BR", {
      month: "short"
    }).format(data);

    return {
      chave,
      nome: nome.replace(".", ""),
      toneladas: 0
    };
  });

  const porMes = new Map(meses.map((mes) => [mes.chave, mes]));

  for (const coleta of coletasRealizadas) {
    const chave = String(coleta.dataColeta || "").slice(0, 7);
    const mes = porMes.get(chave);
    const peso = Number(coleta.pesoKg);

    if (mes && Number.isFinite(peso)) {
      mes.toneladas += peso / 1000;
    }
  }

  const maiorValor = Math.max(...meses.map((mes) => mes.toneladas));

  if (maiorValor === 0) {
    grafico.textContent =
      "Ainda não há coletas realizadas para exibir.";
    grafico.setAttribute(
      "aria-label",
      "Sem coletas realizadas nos últimos seis meses"
    );
    return;
  }

  grafico.setAttribute(
    "aria-label",
    "Gráfico de toneladas de coletas realizadas nos últimos seis meses"
  );

  for (const mes of meses) {
    const coluna = document.createElement("div");
    coluna.className = "monthly-chart-column";

    const valor = document.createElement("span");
    valor.className = "monthly-chart-value";
    valor.textContent =
      `${formatarToneladas.format(mes.toneladas)} t`;

    const trilha = document.createElement("div");
    trilha.className = "monthly-chart-bar-track";

    const barra = document.createElement("span");
    barra.className = "monthly-chart-bar";
    barra.style.height =
      `${(mes.toneladas / maiorValor) * 100}%`;
    barra.setAttribute("aria-hidden", "true");

    trilha.append(barra);

    const rotulo = document.createElement("span");
    rotulo.className = "monthly-chart-label";
    rotulo.textContent = mes.nome;

    coluna.append(valor, trilha, rotulo);
    grafico.append(coluna);
  }
}

function desenharComposicao(coletasRealizadas) {
  const grafico = document.querySelector("#composition-chart");
  const legenda = document.querySelector("#composition-legend");

  grafico.replaceChildren();
  legenda.replaceChildren();

  const totais = new Map(
    TIPOS_RESIDUO.map((tipo) => [tipo, 0])
  );

  for (const coleta of coletasRealizadas) {
    const peso = Number(coleta.pesoKg);

    if (totais.has(coleta.tipoResiduo) && Number.isFinite(peso)) {
      totais.set(
        coleta.tipoResiduo,
        totais.get(coleta.tipoResiduo) + peso
      );
    }
  }

  const pesoTotal = [...totais.values()].reduce(
    (soma, peso) => soma + peso,
    0
  );

  if (pesoTotal === 0) {
    grafico.textContent =
      "Ainda não há resíduos destinados para exibir.";
    grafico.setAttribute(
      "aria-label",
      "Sem composição de resíduos para exibir"
    );
    return;
  }

  grafico.setAttribute(
    "aria-label",
    "Composição do peso das coletas realizadas por tipo de resíduo"
  );

  TIPOS_RESIDUO.forEach((tipo, indice) => {
    const peso = totais.get(tipo);

    if (peso === 0) {
      return;
    }

    const percentual = (peso / pesoTotal) * 100;

    const item = document.createElement("div");
    item.className = "composition-item";

    const rotulo = document.createElement("span");
    rotulo.className = "composition-label";
    rotulo.textContent = tipo;

    const trilha = document.createElement("div");
    trilha.className = "composition-bar-track";

    const barra = document.createElement("span");
    barra.className = `composition-bar composition-bar--${indice + 1}`;
    barra.style.width = `${percentual}%`;

    trilha.append(barra);

    const valor = document.createElement("span");
    valor.className = "composition-value";
    valor.textContent =
      `${formatarPercentual.format(percentual)}%`;

    item.append(rotulo, trilha, valor);
    grafico.append(item);

    const itemLegenda = document.createElement("li");
    itemLegenda.className = "chart-legend-item";

    const marcador = document.createElement("span");
    marcador.className =
      `chart-legend-marker chart-legend-marker--${indice + 1}`;
    marcador.setAttribute("aria-hidden", "true");

    const textoLegenda = document.createElement("span");
    textoLegenda.textContent =
      `${tipo}: ${formatarToneladas.format(peso / 1000)} t`;

    itemLegenda.append(marcador, textoLegenda);
    legenda.append(itemLegenda);
  });
}

function obterColetasFiltradas() {
  const nomePesquisado = normalizarTexto(buscaCliente.value.trim());
  const statusSelecionado = filtroStatus.value;
  const residuoSelecionado = filtroResiduo.value;

  return todasAsColetas
    .filter((coleta) => {
      const correspondeAoNome =
        normalizarTexto(coleta.cliente).includes(nomePesquisado);

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

      return (
        dataB.localeCompare(dataA) ||
        Number(b.id) - Number(a.id)
      );
    });
}

function desenharTabela(coletas) {
  corpoTabela.replaceChildren();

  for (const coleta of coletas) {
    const linha = modeloLinha.content.cloneNode(true);
    const elementoLinha = linha.querySelector("tr");

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
      `status-badge--${normalizarTexto(coleta.status).replace(/\s/g, "-")}`
    );

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

    elementoLinha.dataset.collectionId = String(coleta.id);
    corpoTabela.append(linha);
  }
}

function atualizarListaDeColetas(coletas) {
  elementoCarregamento.hidden = true;
  elementoErroCarregamento.hidden = true;
  todasAsColetas = Array.isArray(coletas) ? coletas : [];

  atualizarIndicadores(todasAsColetas);

  const coletasVisiveis = obterColetasFiltradas();
  const naoHaColetas = todasAsColetas.length === 0;
  const naoHaResultados =
    todasAsColetas.length > 0 && coletasVisiveis.length === 0;

  estadoListaVazia.hidden = !naoHaColetas;
  estadoSemResultados.hidden = !naoHaResultados;
  tabelaContainer.hidden = naoHaColetas || naoHaResultados;

  desenharTabela(coletasVisiveis);
}

function mostrarErroAoCarregar(mensagem) {
  elementoCarregamento.hidden = true;
  elementoErroCarregamento.hidden = false;
  estadoListaVazia.hidden = true;
  estadoSemResultados.hidden = true;
  tabelaContainer.hidden = true;
  mensagemErroCarregamento.textContent = mensagem;
}

async function lerResposta(response) {
  return response.json().catch(() => ({}));
}

async function carregarColetas() {
  elementoCarregamento.hidden = false;
  elementoErroCarregamento.hidden = true;
  estadoListaVazia.hidden = true;
  estadoSemResultados.hidden = true;
  tabelaContainer.hidden = true;

  try {
    const response = await fetch(API_COLETAS_URL);

    if (!response.ok) {
      throw new Error("Não foi possível carregar as coletas.");
    }

    const coletas = await response.json();

    if (!Array.isArray(coletas)) {
      throw new Error("A resposta da API está em formato inesperado.");
    }

    atualizarListaDeColetas(coletas);
  } catch (error) {
    console.error("Erro ao carregar coletas:", error);
    mostrarErroAoCarregar(
      "Não foi possível carregar as coletas. Verifique a conexão e tente novamente."
    );
  }
}

function limparErrosFormulario() {
  const campos = [
    ["client-name", "client-name-error"],
    ["waste-type", "waste-type-error"],
    ["weight-kg", "weight-kg-error"],
    ["collection-date", "collection-date-error"],
    ["collection-status", "collection-status-error"],
    ["observation", "observation-error"]
  ];

  for (const [campoId, erroId] of campos) {
    const campo = document.querySelector(`#${campoId}`);
    campo.setAttribute("aria-invalid", "false");
    document.querySelector(`#${erroId}`).textContent = "";
  }

  mensagemGeralFormulario.textContent = "";
  mensagemGeralFormulario.hidden = true;
}

function validarFormularioColeta() {
  limparErrosFormulario();

  const cliente = document.querySelector("#client-name");
  const tipoResiduo = document.querySelector("#waste-type");
  const pesoKg = document.querySelector("#weight-kg");
  const dataColeta = document.querySelector("#collection-date");
  const status = document.querySelector("#collection-status");

  const camposComErro = [];
  const permitidosStatus = ["Agendada", "Realizada", "Cancelada"];

  function registrarErro(campo, mensagem) {
    campo.setAttribute("aria-invalid", "true");
    document.querySelector(`#${campo.id}-error`).textContent = mensagem;
    camposComErro.push(campo);
  }

  if (Array.from(cliente.value.trim()).length < 3) {
    registrarErro(
      cliente,
      "Informe pelo menos 3 caracteres para o cliente."
    );
  }

  if (!TIPOS_RESIDUO.includes(tipoResiduo.value)) {
    registrarErro(tipoResiduo, "Selecione um tipo de resíduo válido.");
  }

  if (!Number.isFinite(pesoKg.valueAsNumber) || pesoKg.valueAsNumber <= 0) {
    registrarErro(pesoKg, "Informe um peso válido maior que zero.");
  }

  if (!dataColeta.value) {
    registrarErro(dataColeta, "Informe a data da coleta.");
  }

  if (!permitidosStatus.includes(status.value)) {
    registrarErro(status, "Selecione um status válido.");
  }

  if (
    status.value === "Realizada" &&
    dataColeta.value &&
    dataColeta.value > obterHojeLocal()
  ) {
    registrarErro(
      dataColeta,
      "Uma coleta realizada não pode ter data futura."
    );
  }

  if (camposComErro.length > 0) {
    camposComErro[0].focus();
    return false;
  }

  return true;
}

function mostrarErrosDaApi(erros) {
  const campos = {
    cliente: ["client-name", "client-name-error"],
    tipoResiduo: ["waste-type", "waste-type-error"],
    pesoKg: ["weight-kg", "weight-kg-error"],
    dataColeta: ["collection-date", "collection-date-error"],
    status: ["collection-status", "collection-status-error"],
    observacao: ["observation", "observation-error"]
  };

  let possuiErroDeCampo = false;

  for (const [nomeCampo, mensagem] of Object.entries(erros || {})) {
    const identificadores = campos[nomeCampo];

    if (!identificadores) {
      continue;
    }

    const [campoId, erroId] = identificadores;

    document.querySelector(`#${campoId}`).setAttribute("aria-invalid", "true");
    document.querySelector(`#${erroId}`).textContent = mensagem;
    possuiErroDeCampo = true;
  }

  if (!possuiErroDeCampo) {
    mensagemGeralFormulario.textContent =
      "Não foi possível salvar. Confira os dados e tente novamente.";
    mensagemGeralFormulario.hidden = false;
  }
}

async function salvarColeta(event) {
  event.preventDefault();

  if (!validarFormularioColeta()) {
    return;
  }

  const id = formularioColeta.elements.namedItem("id").value;

  const dados = {
    cliente: formularioColeta.elements.namedItem("cliente").value.trim(),
    tipoResiduo: formularioColeta.elements.namedItem("tipoResiduo").value,
    pesoKg: Number(
      formularioColeta.elements.namedItem("pesoKg").value
    ),
    dataColeta: formularioColeta.elements.namedItem("dataColeta").value,
    status: formularioColeta.elements.namedItem("status").value,
    observacao:
      formularioColeta.elements.namedItem("observacao").value.trim() || null
  };

  const metodo = id ? "PUT" : "POST";
  const endereco = id
    ? `${API_COLETAS_URL}/${encodeURIComponent(id)}`
    : API_COLETAS_URL;

  const botaoSalvar = formularioColeta.querySelector('[type="submit"]');
  botaoSalvar.disabled = true;
  mensagemGeralFormulario.hidden = true;

  try {
    const response = await fetch(endereco, {
      method: metodo,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dados)
    });

    const resposta = await lerResposta(response);

    if (!response.ok) {
      mostrarErrosDaApi(resposta.errors);

      if (resposta.message && !resposta.errors) {
        mensagemGeralFormulario.textContent = resposta.message;
        mensagemGeralFormulario.hidden = false;
      }

      return;
    }

    dialogoColeta.close();
    formularioColeta.reset();
    limparErrosFormulario();

    await carregarColetas();

    mostrarFeedback(
      id
        ? "Coleta atualizada com sucesso."
        : "Coleta cadastrada com sucesso."
    );
  } catch (error) {
    console.error("Erro ao salvar coleta:", error);
    mensagemGeralFormulario.textContent =
      "Não foi possível salvar. Os dados continuam no formulário; tente novamente.";
    mensagemGeralFormulario.hidden = false;
  } finally {
    botaoSalvar.disabled = false;
  }
}

function abrirFormularioDeCadastro() {
  formularioColeta.reset();
  formularioColeta.elements.namedItem("id").value = "";
  formularioColeta.elements.namedItem("status").value = "Agendada";
  limparErrosFormulario();

  document.querySelector("#collection-dialog-title").textContent =
    "Nova coleta";

  dialogoColeta.querySelector('[type="submit"]').textContent =
    "Salvar coleta";

  dialogoColeta.showModal();
}

function abrirFormularioDeEdicao(id) {
  const coleta = todasAsColetas.find(
    (registro) => String(registro.id) === String(id)
  );

  if (!coleta) {
    return;
  }

  limparErrosFormulario();

  formularioColeta.elements.namedItem("id").value = coleta.id;
  formularioColeta.elements.namedItem("cliente").value =
    coleta.cliente || "";
  formularioColeta.elements.namedItem("tipoResiduo").value =
    coleta.tipoResiduo || "";
  formularioColeta.elements.namedItem("pesoKg").value =
    coleta.pesoKg ?? "";
  formularioColeta.elements.namedItem("dataColeta").value =
    String(coleta.dataColeta || "").slice(0, 10);
  formularioColeta.elements.namedItem("status").value =
    coleta.status || "Agendada";
  formularioColeta.elements.namedItem("observacao").value =
    coleta.observacao || "";

  document.querySelector("#collection-dialog-title").textContent =
    "Editar coleta";

  dialogoColeta.querySelector('[type="submit"]').textContent =
    "Salvar alterações";

  dialogoColeta.showModal();
}

async function confirmarExclusao() {
  if (!idDaColetaParaExcluir) {
    return;
  }

  try {
    const response = await fetch(
      `${API_COLETAS_URL}/${encodeURIComponent(idDaColetaParaExcluir)}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      const resposta = await lerResposta(response);
      throw new Error(
        resposta.message || "Não foi possível excluir a coleta."
      );
    }

    dialogoExclusao.close();
    idDaColetaParaExcluir = null;

    await carregarColetas();
    mostrarFeedback("Coleta excluída com sucesso.");
  } catch (error) {
    console.error("Erro ao excluir coleta:", error);
    mostrarFeedback(error.message, true);
  }
}

function exportarColetasCsv() {
  const cabecalho = [
    "Cliente",
    "Tipo de resíduo",
    "Peso (kg)",
    "Data da coleta",
    "Status",
    "Observação"
  ];

  const linhas = obterColetasFiltradas().map((coleta) => [
    coleta.cliente,
    coleta.tipoResiduo,
    coleta.pesoKg,
    formatarData(coleta.dataColeta),
    coleta.status,
    coleta.observacao
  ]);

  function escaparCsv(valor) {
    let texto = String(valor ?? "");

    if (/^[=+\-@\t\r]/.test(texto)) {
      texto = `'${texto}`;
    }

    return `"${texto.replace(/"/g, '""')}"`;
  }

  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.map(escaparCsv).join(";"))
    .join("\r\n");

  const arquivo = new Blob(["\uFEFF", conteudo], {
    type: "text/csv;charset=utf-8"
  });

  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = endereco;
  link.download = "ecocoleta-coletas.csv";
  link.click();

  setTimeout(() => URL.revokeObjectURL(endereco), 1000);
}

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

formularioColeta.addEventListener("submit", salvarColeta);

formularioColeta.addEventListener("input", (event) => {
  const campo = event.target;
  const erro = document.querySelector(`#${campo.id}-error`);

  if (!erro) {
    return;
  }

  campo.setAttribute("aria-invalid", "false");
  erro.textContent = "";
});

document
  .querySelector("#export-csv-button")
  .addEventListener("click", exportarColetasCsv);

document.addEventListener("click", (event) => {
  const botao = event.target.closest("button");

  if (!botao) {
    return;
  }

  if (botao.matches("[data-view-target]")) {
    const telaAlvo = botao.dataset.viewTarget;

    document.querySelectorAll(".screen").forEach((tela) => {
      tela.hidden = tela.id !== telaAlvo;
    });

    document.querySelectorAll("[data-view-target]").forEach((item) => {
      const ativo = item === botao;

      item.classList.toggle("is-active", ativo);

      if (ativo) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });

    return;
  }

  const acao = botao.dataset.action;

  if (!acao) {
    return;
  }

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

    document.querySelector("#delete-confirmation-message").textContent =
      coleta
        ? `Confirma a exclusão da coleta de ${coleta.cliente}?`
        : "Confirma a exclusão deste registro?";

    dialogoExclusao.showModal();
  }

  if (acao === "cancel-delete") {
    idDaColetaParaExcluir = null;
    dialogoExclusao.close();
  }

  if (acao === "confirm-delete") {
    confirmarExclusao();
  }

  if (acao === "retry-load") {
    carregarColetas();
  }
});

carregarColetas();