 "use strict";

const API_COLETAS_URL = "http://localhost:3000/api/coletas";

const formatadorQuantidade = new Intl.NumberFormat("pt-BR");
const formatadorPercentual = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
const formatadorToneladas = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const CLIENTE_MAXIMO_CARACTERES = 120;
const PESO_MAXIMO_KG = 99999999.99;

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

function formatarToneladas(pesoKg) {
  const toneladas = Number(pesoKg) / 1000;
  const valor = Number.isFinite(toneladas) ? toneladas : 0;

  return `${formatadorToneladas.format(valor)} t`;
}

function formatarPercentual(valor) {
  const numero = Number.isFinite(valor) ? valor : 0;

  return `${formatadorPercentual.format(numero)}%`;
}

function obterDataISO(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const ano = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  const texto = String(valor || "").trim();
  const dataISO = texto.match(/^(\d{4}-\d{2}-\d{2})/);

  if (dataISO) {
    return dataISO[1];
  }

  const dataBR = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (dataBR) {
    return `${dataBR[3]}-${dataBR[2]}-${dataBR[1]}`;
  }

  return "";
}

function formatarData(data) {
  const dataTexto = obterDataISO(data);

  if (!dataTexto) {
    return "—";
  }

  const [ano, mes, dia] = dataTexto.split("-");

  return `${dia}/${mes}/${ano}`;
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
  mensagemFeedback.classList.toggle(
    "feedback-message--error",
    ocorreuErro
  );
}

function calcularIndicadores(coletas) {
  const registros = Array.isArray(coletas) ? coletas : [];

  const realizadas = registros.filter(
    (coleta) => coleta.status === "Realizada"
  );

  const agendadas = registros.filter(
    (coleta) => coleta.status === "Agendada"
  );

  const pesoRealizadoKg = realizadas.reduce((soma, coleta) => {
    const peso = Number(coleta.pesoKg);

    return Number.isFinite(peso) && peso > 0
      ? soma + peso
      : soma;
  }, 0);

  const percentualRealizadas =
    registros.length === 0
      ? 0
      : (realizadas.length / registros.length) * 100;

  return {
    total: registros.length,
    quantidadeRealizadas: realizadas.length,
    percentualRealizadas,
    quantidadeAgendadas: agendadas.length,
    pesoRealizadoKg
  };
}

function calcularDadosMensais(coletasRealizadas) {
  const agora = new Date();

  const meses = Array.from({ length: 6 }, (_, indice) => {
    const data = new Date(
      agora.getFullYear(),
      agora.getMonth() - (5 - indice),
      1
    );

    const chave =
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    const rotulo = new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      year: "2-digit"
    })
      .format(data)
      .replace(".", "");

    return {
      chave,
      rotulo,
      pesoKg: 0,
      toneladas: 0
    };
  });

  const porMes = new Map(
    meses.map((mes) => [mes.chave, mes])
  );

  for (const coleta of coletasRealizadas) {
    const data = obterDataISO(coleta.dataColeta);
    const chaveMes = data.slice(0, 7);
    const mes = porMes.get(chaveMes);
    const pesoKg = Number(coleta.pesoKg);

    if (mes && Number.isFinite(pesoKg) && pesoKg > 0) {
      mes.pesoKg += pesoKg;
      mes.toneladas += pesoKg / 1000;
    }
  }

  return meses;
}

function calcularComposicaoPorResiduo(coletasRealizadas) {
  const pesoPorResiduo = new Map(
    TIPOS_RESIDUO.map((tipo) => [tipo, 0])
  );

  for (const coleta of coletasRealizadas) {
    const pesoKg = Number(coleta.pesoKg);

    if (
      pesoPorResiduo.has(coleta.tipoResiduo) &&
      Number.isFinite(pesoKg) &&
      pesoKg > 0
    ) {
      pesoPorResiduo.set(
        coleta.tipoResiduo,
        pesoPorResiduo.get(coleta.tipoResiduo) + pesoKg
      );
    }
  }

  const pesoTotalKg = [...pesoPorResiduo.values()].reduce(
    (soma, peso) => soma + peso,
    0
  );

  return [...pesoPorResiduo.entries()]
    .filter(([, pesoKg]) => pesoKg > 0)
    .map(([tipo, pesoKg]) => ({
      tipo,
      pesoKg,
      toneladas: pesoKg / 1000,
      percentual:
        pesoTotalKg === 0
          ? 0
          : (pesoKg / pesoTotalKg) * 100
    }))
    .sort((a, b) => b.pesoKg - a.pesoKg);
}

function atualizarIndicadores(coletas) {
  const registros = Array.isArray(coletas) ? coletas : [];
  const indicadores = calcularIndicadores(registros);

  const realizadas = registros.filter(
    (coleta) => coleta.status === "Realizada"
  );

  document.querySelector("#metric-total").textContent =
    formatadorQuantidade.format(indicadores.total);

  document.querySelector("#metric-completed").textContent =
    formatadorQuantidade.format(indicadores.quantidadeRealizadas);

  document.querySelector("#metric-completed-percentage").textContent =
    `${formatarPercentual(indicadores.percentualRealizadas)} do total`;

  document.querySelector("#metric-scheduled").textContent =
    formatadorQuantidade.format(indicadores.quantidadeAgendadas);

  const seloAtencao = document.querySelector(
    "#scheduled-attention-badge"
  );

  seloAtencao.hidden = indicadores.quantidadeAgendadas === 0;
  seloAtencao.textContent = "ATENÇÃO";

  document.querySelector("#metric-destined-weight").textContent =
    indicadores.pesoRealizadoKg === 0
      ? "0 t"
      : formatarToneladas(indicadores.pesoRealizadoKg);

  const barraProgresso = document.querySelector("#completed-progress");
  const trilhaProgresso = document.querySelector(".progress-track");

  const percentualLimitado = Math.min(
    indicadores.percentualRealizadas,
    100
  );

  barraProgresso.style.width = `${percentualLimitado}%`;
  trilhaProgresso.setAttribute(
    "aria-valuenow",
    percentualLimitado.toFixed(1)
  );

  atualizarCartaoAtrasadas(registros);
  desenharGraficoMensal(calcularDadosMensais(realizadas));
  desenharComposicao(calcularComposicaoPorResiduo(realizadas));
}

function atualizarCartaoAtrasadas(coletas) {
  const cartao = document.querySelector("#overdue-attention-card");
  const descricao = document.querySelector("#overdue-description");
  const lista = document.querySelector("#overdue-collections-list");
  const hoje = obterHojeLocal();

  const atrasadas = coletas.filter((coleta) => {
    const data = obterDataISO(coleta.dataColeta);

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
      : `Há ${formatadorQuantidade.format(atrasadas.length)} coletas agendadas com data passada.`;

  for (const coleta of atrasadas) {
    const item = document.createElement("li");

    item.textContent =
      `${coleta.cliente} — ${formatarData(coleta.dataColeta)}`;

    lista.append(item);
  }
}

function desenharGraficoMensal(dadosMensais) {
  const grafico = document.querySelector("#monthly-chart");

  grafico.replaceChildren();

  const maiorValor = Math.max(
    0,
    ...dadosMensais.map((mes) => mes.toneladas)
  );

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
    "Toneladas de coletas realizadas por mês nos últimos seis meses"
  );

  for (const mes of dadosMensais) {
    const coluna = document.createElement("div");
    coluna.className = "monthly-chart-column";

    const valor = document.createElement("span");
    valor.className = "monthly-chart-value";
    valor.textContent = formatarToneladas(mes.pesoKg);

    const trilha = document.createElement("div");
    trilha.className = "monthly-chart-bar-track";

    const barra = document.createElement("span");
    barra.className = "monthly-chart-bar";
    barra.style.height =
      mes.toneladas === 0
        ? "0%"
        : `${Math.max((mes.toneladas / maiorValor) * 100, 2)}%`;

    barra.setAttribute("aria-hidden", "true");
    trilha.append(barra);

    const rotulo = document.createElement("span");
    rotulo.className = "monthly-chart-label";
    rotulo.textContent = mes.rotulo;

    coluna.append(valor, trilha, rotulo);
    grafico.append(coluna);
  }
}

function desenharComposicao(composicao) {
  const grafico = document.querySelector("#composition-chart");
  const legenda = document.querySelector("#composition-legend");

  grafico.replaceChildren();
  legenda.replaceChildren();

  if (composicao.length === 0) {
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
    "Composição do peso das coletas realizadas por tipo de resíduo, em ordem decrescente"
  );

  composicao.forEach((residuo, indice) => {
    const item = document.createElement("div");
    item.className = "composition-item";

    const rotulo = document.createElement("span");
    rotulo.className = "composition-label";
    rotulo.textContent = residuo.tipo;

    const trilha = document.createElement("div");
    trilha.className = "composition-bar-track";

    const barra = document.createElement("span");
    barra.className =
      `composition-bar composition-bar--${(indice % 6) + 1}`;
    barra.style.width = `${residuo.percentual}%`;
    barra.setAttribute("aria-hidden", "true");

    trilha.append(barra);

    const valor = document.createElement("span");
    valor.className = "composition-value";
    valor.textContent =
      `${formatarToneladas(residuo.pesoKg)} · ${formatarPercentual(residuo.percentual)}`;

    item.append(rotulo, trilha, valor);
    grafico.append(item);
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
        !statusSelecionado ||
        coleta.status === statusSelecionado;

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
      const dataA = obterDataISO(a.dataColeta);
      const dataB = obterDataISO(b.dataColeta);

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
    todasAsColetas.length > 0 &&
    coletasVisiveis.length === 0;

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
  const permitidosStatus = [
    "Agendada",
    "Realizada",
    "Cancelada"
  ];

  function registrarErro(campo, mensagem) {
    campo.setAttribute("aria-invalid", "true");

    document.querySelector(`#${campo.id}-error`).textContent =
      mensagem;

    camposComErro.push(campo);
  }

  const quantidadeCaracteresCliente =
    Array.from(cliente.value.trim()).length;

  if (quantidadeCaracteresCliente < 3) {
    registrarErro(
      cliente,
      "Informe pelo menos 3 caracteres para o cliente."
    );
  } else if (
    quantidadeCaracteresCliente > CLIENTE_MAXIMO_CARACTERES
  ) {
    registrarErro(
      cliente,
      `O cliente deve ter no máximo ${CLIENTE_MAXIMO_CARACTERES} caracteres.`
    );
  }

  if (!TIPOS_RESIDUO.includes(tipoResiduo.value)) {
    registrarErro(
      tipoResiduo,
      "Selecione um tipo de resíduo válido."
    );
  }

  if (
    !Number.isFinite(pesoKg.valueAsNumber) ||
    pesoKg.valueAsNumber <= 0 ||
    pesoKg.valueAsNumber > PESO_MAXIMO_KG
  ) {
    registrarErro(
      pesoKg,
      "Informe um peso maior que zero e de até 99.999.999,99 kg."
    );
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

    document
      .querySelector(`#${campoId}`)
      .setAttribute("aria-invalid", "true");

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
    cliente: formularioColeta.elements
      .namedItem("cliente")
      .value.trim(),

    tipoResiduo: formularioColeta.elements
      .namedItem("tipoResiduo")
      .value,

    pesoKg: Number(
      formularioColeta.elements.namedItem("pesoKg").value
    ),

    dataColeta: formularioColeta.elements
      .namedItem("dataColeta")
      .value,

    status: formularioColeta.elements
      .namedItem("status")
      .value,

    observacao:
      formularioColeta.elements
        .namedItem("observacao")
        .value.trim() || null
  };

  const metodo = id ? "PUT" : "POST";

  const endereco = id
    ? `${API_COLETAS_URL}/${encodeURIComponent(id)}`
    : API_COLETAS_URL;

  const botaoSalvar =
    formularioColeta.querySelector('[type="submit"]');

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
    obterDataISO(coleta.dataColeta);

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
  const alvo = event.target;

  if (!(alvo instanceof Element)) {
    return;
  }

  const botao = alvo.closest("button");

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