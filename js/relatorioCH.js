/**
 * @file Script da página de Relatório Geral de Atribuições (Pivotado por Professor).
 * @description Busca e exibe a soma da carga horária por professor, mostrando colunas separadas para cada curso + total geral.
 * @version 3.5.0
 */
document.addEventListener("DOMContentLoaded", () => {
  // 1. CONSTANTES, VARIÁVEIS DE ESTADO E CONFIGURAÇÕES
  const API_BASE_URL = "https://serversgch-nv.onrender.com";
  const DOM = {
    tableHead: document.getElementById("geralTableHead"),
    tableBody: document.getElementById("geralTableBody"),
    tableFoot: document.getElementById("geralTableFoot"),
    chMinima: document.getElementById("chMinima"),
    chMaxima: document.getElementById("chMaxima"),
    buscaProf: document.getElementById("BuscaProf"),
    btnExportarXLS: document.getElementById("btnExportarXLS"),
    btnExportarODP: document.getElementById("btnExportarODP"),
  };

  // Controle de ordenação
  let sortColumn = "professor";
  let sortDirection = "asc";

  // Variáveis para armazenar os dados processados
  let dadosDoRelatorio = [];
  let dadosParaExportacao = [];

  // 2. FUNÇÕES DE UTILIDADE
  const fetchData = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
    }
    return response.json();
  };

  const hhmmParaMinutos = (hhmm) => {
    if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) return 0;
    const [horas, minutos] = hhmm.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  };

  const formatarMinutosParaHHMM = (totalMinutos) => {
    if (isNaN(totalMinutos) || totalMinutos < 0) return "00:00";
    const horas = Math.floor(totalMinutos / 60);
    const minutos = Math.round(totalMinutos % 60);
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
  };

  const obterStatusSuficienciaTexto = (totalMinutos) => {
    const chMin = hhmmParaMinutos(DOM.chMinima.value);
    const chMax = hhmmParaMinutos(DOM.chMaxima.value);
    if (totalMinutos < chMin) return "Abaixo";
    if (totalMinutos > chMax) return "Acima";
    return "Ok";
  };

  // 3. ORDENAR PROFESSORES
  function sortProfessores(professores) {
    return professores.sort((a, b) => {
      let valA, valB;

      if (sortColumn === "professor") {
        valA = a.professor;
        valB = b.professor;
        return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (sortColumn === "total") {
        valA = a.total;
        valB = b.total;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      if (sortColumn === "suficiencia") {
        // Converte status em valor numérico para ordenação
        const statusValue = (status) => {
          if (status === "Abaixo") return 1;
          if (status === "Ok") return 2;
          if (status === "Acima") return 3;
          return 0;
        };
        valA = statusValue(obterStatusSuficienciaTexto(a.total));
        valB = statusValue(obterStatusSuficienciaTexto(b.total));
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      // Ordenação por curso específico
      valA = a[sortColumn] || 0;
      valB = b[sortColumn] || 0;
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }

  // 4. RENDERIZAÇÃO DA TABELA
  const renderTable = (horarios) => {
    DOM.tableBody.innerHTML = "";
    DOM.tableHead.innerHTML = "";
    DOM.tableFoot.innerHTML = "";

    if (!horarios || horarios.length === 0) {
      DOM.tableBody.innerHTML =
        '<tr><td colspan="6" class="text-center">Nenhuma atribuição encontrada.</td></tr>';
      dadosParaExportacao = [];
      return;
    }

    const agrupado = {};
    const cursosSet = new Set();

    horarios.forEach((horario) => {
      horario.atribuicoes.forEach((attr) => {
        const prof = attr.professorId?.nome || "Não Atribuído";
        const curso = horario.turmaId?.cursoId?.nome || "N/A";
        cursosSet.add(curso);

        if (!agrupado[prof]) agrupado[prof] = { professor: prof, total: 0 };
        if (!agrupado[prof][curso]) agrupado[prof][curso] = 0;

        agrupado[prof][curso] += attr.chSemanalMinutos;
        agrupado[prof].total += attr.chSemanalMinutos;
      });
    });

    const cursos = Array.from(cursosSet).sort();

    // Cabeçalho com ícones
    const headers = ["professor", ...cursos, "total", "suficiencia"];
    DOM.tableHead.innerHTML = `
      <tr>
        ${headers
          .map((h) => {
            let label = h === "professor" ? "Professor" :
                        h === "total" ? "Total" :
                        h === "suficiencia" ? "Suficiência" : h;
            let icon = "";
            if (sortColumn === h) {
              icon = sortDirection === "asc" ? " ▲" : " ▼";
            }
            return `<th style="cursor:pointer" data-col="${h}">${label}${icon}</th>`;
          })
          .join("")}
      </tr>
    `;

    // Ordena professores
    let professoresOrdenados = Object.values(agrupado);
    professoresOrdenados = sortProfessores(professoresOrdenados);

    // 🔎 Filtro de busca
    let filtro = DOM.buscaProf.value.trim().toLowerCase();
    if (filtro) {
      professoresOrdenados = professoresOrdenados.filter((p) =>
        p.professor.toLowerCase().includes(filtro)
      );
    }

    if (professoresOrdenados.length === 0) {
      DOM.tableBody.innerHTML =
        '<tr><td colspan="6" class="text-center">Nenhum professor encontrado.</td></tr>';
      return;
    }

    // Corpo
    DOM.tableBody.innerHTML = professoresOrdenados
      .map(
        (prof) => `
        <tr>
          <td>${prof.professor}</td>
          ${cursos.map((c) => `<td>${formatarMinutosParaHHMM(prof[c] || 0)}</td>`).join("")}
          <td>${formatarMinutosParaHHMM(prof.total)}</td>
          <td><span class="text-${
            obterStatusSuficienciaTexto(prof.total) === "Ok"
              ? "success"
              : obterStatusSuficienciaTexto(prof.total) === "Abaixo"
              ? "danger"
              : "warning"
          }">${obterStatusSuficienciaTexto(prof.total)}</span></td>
        </tr>
      `
      )
      .join("");

    // Dados exportação
    dadosParaExportacao = professoresOrdenados.map((prof) => {
      const row = { Professor: prof.professor };
      cursos.forEach((c) => (row[c] = formatarMinutosParaHHMM(prof[c] || 0)));
      row.Total = formatarMinutosParaHHMM(prof.total);
      row.Suficiência = obterStatusSuficienciaTexto(prof.total);
      return row;
    });

    // Rodapé
    const totalGeral = { total: 0 };
    cursos.forEach((c) => (totalGeral[c] = 0));
    Object.values(agrupado).forEach((prof) => {
      cursos.forEach((c) => (totalGeral[c] += prof[c] || 0));
      totalGeral.total += prof.total;
    });

    DOM.tableFoot.innerHTML = `
      <tr class="table-secondary fw-bold">
        <td>Total Geral</td>
        ${cursos.map((c) => `<td>${formatarMinutosParaHHMM(totalGeral[c])}</td>`).join("")}
        <td>${formatarMinutosParaHHMM(totalGeral.total)}</td>
        <td></td>
      </tr>
    `;

    // Eventos de clique nos cabeçalhos
    DOM.tableHead.querySelectorAll("th").forEach((th) => {
      th.addEventListener("click", () => {
        const clickedColumn = th.getAttribute("data-col");

        if (sortColumn === clickedColumn) {
          sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
          sortColumn = clickedColumn;
          sortDirection = "asc";
        }

        renderTable(dadosDoRelatorio);
      });
    });
  };

  // 5. EXPORTAÇÃO
  function exportarParaXLSX() {
    if (dadosParaExportacao.length === 0) return alert("Não há dados para exportar.");
    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportacao);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Carga Horária Docente");
    XLSX.writeFile(workbook, "relatorio_ch_docente.xlsx");
  }

  function exportarParaODS() {
    if (dadosParaExportacao.length === 0) return alert("Não há dados para exportar.");
    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportacao);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Carga Horária Docente");
    XLSX.writeFile(workbook, "relatorio_ch_docente.ods");
  }

  // 6. PRINCIPAL
  const carregarRelatorio = async () => {
    DOM.tableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">Carregando...</td></tr>';
    try {
      const horarios = await fetchData(`${API_BASE_URL}/reports/geral`);
      dadosDoRelatorio = horarios;
      renderTable(dadosDoRelatorio);
    } catch (err) {
      DOM.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${err.message}</td></tr>`;
    }
  };

  const handleChChange = () => {
    localStorage.setItem("chMinima", DOM.chMinima.value);
    localStorage.setItem("chMaxima", DOM.chMaxima.value);
    if (dadosDoRelatorio.length > 0) renderTable(dadosDoRelatorio);
  };

  // 7. INICIALIZAÇÃO
  DOM.chMinima.value = localStorage.getItem("chMinima") || "10:00";
  DOM.chMaxima.value = localStorage.getItem("chMaxima") || "20:00";

  DOM.chMinima.addEventListener("change", handleChChange);
  DOM.chMaxima.addEventListener("change", handleChChange);
  DOM.buscaProf.addEventListener("input", () => renderTable(dadosDoRelatorio));

  DOM.btnExportarXLS.addEventListener("click", exportarParaXLSX);
  DOM.btnExportarODP.addEventListener("click", exportarParaODS);

  carregarRelatorio();
});
