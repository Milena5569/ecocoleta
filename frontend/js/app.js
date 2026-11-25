    type: "text/csv;charset=utf-8"


  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = endereco;
  link.download = "ecocoleta-coletas.csv";
  link.click();

  setTimeout(() => URL.revokeObjectURL(endereco), 1000);


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