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

atualizarIndicadores([]);