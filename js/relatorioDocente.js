const API_BASE_URL = 'http://localhost:3000/api';

// Formata minutos em "Xh Ymin"
function formatMinutesToHoursMinutes(totalMinutos) {
    if (isNaN(totalMinutos) || totalMinutos < 0) return '0h 0min';
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horas}h ${minutos}min`;
}

async function fetchData(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) options.body = JSON.stringify(data);
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro na requisição: ${response.statusText}`);
    }
    return await response.json();
}

document.addEventListener('DOMContentLoaded', () => {
    const relatorioTableBody = document.getElementById('relatorioTableBody');
    const tableHeaderRow = document.getElementById('tableHeaderRow');
    const filtroGeralInput = document.getElementById('filtroGeral');
    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    const btnExportarXLS = document.getElementById('btnExportarXLS');
    const btnExportarODP = document.getElementById('btnExportarODP');
    const cargaMinimaHorasInput = document.getElementById('cargaMinimaHoras');
    const cargaMaximaHorasInput = document.getElementById('cargaMaximaHoras');

    let allDados = [];
    let cursosUnicos = [];
    // Esta nova variável vai armazenar os dados de professores filtrados e processados
    let profsFiltradosParaExportacao = []; 

    async function carregarDados() {
        relatorioTableBody.innerHTML = `<tr><td colspan="100" class="text-center">Carregando dados...</td></tr>`;

        try {
            allDados = await fetchData('cargas-horarias');
            const setCursos = new Set();
            allDados.forEach(item => {
                if (item.cursoId?.nome) setCursos.add(item.cursoId.nome);
            });
            cursosUnicos = Array.from(setCursos).sort();

            montarCabecalho();
            aplicarFiltros();
        } catch (error) {
            relatorioTableBody.innerHTML = `<tr><td colspan="100" class="text-center text-danger">Erro ao carregar dados: ${error.message}</td></tr>`;
        }
    }

    function montarCabecalho() {
        while (tableHeaderRow.children.length > 3) {
            tableHeaderRow.removeChild(tableHeaderRow.children[3]);
        }

        cursosUnicos.forEach(curso => {
            const th = document.createElement('th');
            th.textContent = curso;
            tableHeaderRow.insertBefore(th, tableHeaderRow.children[1]);
        });
    }

    function aplicarFiltros() {
        const filtroTexto = filtroGeralInput.value.toLowerCase().trim();
        const cargaMinima = parseFloat(cargaMinimaHorasInput.value) * 60;
        const cargaMaxima = parseFloat(cargaMaximaHorasInput.value) * 60;

        const profsMap = new Map();

        allDados.forEach(item => {
            const profId = item.professorId?._id || item.professorId;
            const profNome = item.professorId?.nome || 'Sem nome';

            if (!profsMap.has(profId)) {
                profsMap.set(profId, {
                    nome: profNome,
                    cursos: {},
                    totalMinutos: 0,
                    atribuicoes: []
                });
            }

            const chSemanal = item.cargaHorariaSemanalAulasAtribuida || 0;
            const duracaoMin = item.duracaoAulaMinutosAtribuida || 0;

            let totalMinutos = 0;
            if (typeof item.cargaHorariaTotalPeriodoMinutos === 'number' && item.cargaHorariaTotalPeriodoMinutos > 0) {
                totalMinutos = item.cargaHorariaTotalPeriodoMinutos;
            } else {
                totalMinutos = chSemanal * duracaoMin
            }

            const prof = profsMap.get(profId);
            prof.totalMinutos += totalMinutos;

            const cursoNome = item.cursoId?.nome || 'N/A';
            prof.cursos[cursoNome] = (prof.cursos[cursoNome] || 0) + totalMinutos;
            prof.atribuicoes.push(item);
        });

        profsFiltradosParaExportacao = Array.from(profsMap.values()).filter(prof => {
            if (!filtroTexto) return true;

            const cursosText = Object.keys(prof.cursos).join(' ').toLowerCase();
            const atribuicoesText = prof.atribuicoes.map(a =>
                (a.professorId?.nome || '') + ' ' +
                (a.disciplinaId?.nome || '') + ' ' +
                (a.cursoId?.nome || '')).join(' ').toLowerCase();

            return prof.nome.toLowerCase().includes(filtroTexto)
                || cursosText.includes(filtroTexto)
                || atribuicoesText.includes(filtroTexto);
        });

        preencherTabela(profsFiltradosParaExportacao, cargaMinima, cargaMaxima);
    }

    function preencherTabela(profs, cargaMinima, cargaMaxima) {
        relatorioTableBody.innerHTML = '';
        if (profs.length === 0) {
            relatorioTableBody.innerHTML = `<tr><td colspan="${3 + cursosUnicos.length}" class="text-center">Nenhum resultado encontrado.</td></tr>`;
            return;
        }

        profs.forEach(prof => {
            const tr = document.createElement('tr');

            const tdNome = document.createElement('td');
            tdNome.textContent = prof.nome;
            tr.appendChild(tdNome);

            cursosUnicos.forEach(curso => {
                const tdCurso = document.createElement('td');
                const minutos = prof.cursos[curso] || 0;
                tdCurso.textContent = formatMinutesToHoursMinutes(minutos);
                tr.appendChild(tdCurso);
            });

            const tdTotal = document.createElement('td');
            tdTotal.textContent = formatMinutesToHoursMinutes(prof.totalMinutos);

            const tdSuf = document.createElement('td');
            let situacao = '';
            tdTotal.classList.remove('text-danger', 'text-success', 'text-warning');
            tdSuf.classList.remove('text-danger', 'text-success', 'text-warning');

            if (prof.totalMinutos < cargaMinima) {
                situacao = 'Insuficiente';
                tdTotal.classList.add('text-danger', 'fw-bold');
                tdSuf.classList.add('text-danger', 'fw-bold');
            } else if (prof.totalMinutos > cargaMaxima) {
                situacao = 'Extrapolado';
                tdTotal.classList.add('text-warning', 'fw-bold');
                tdSuf.classList.add('text-warning', 'fw-bold');
            } else {
                situacao = 'Suficiente';
                tdTotal.classList.add('text-success', 'fw-bold');
                tdSuf.classList.add('text-success', 'fw-bold');
            }
            tdSuf.textContent = situacao;

            tr.appendChild(tdTotal);
            tr.appendChild(tdSuf);
            relatorioTableBody.appendChild(tr);
        });
    }

    // Função para exportar os dados para um arquivo de planilha .xlsx
    function exportarParaXLSX() {
        if (profsFiltradosParaExportacao.length === 0) {
            alert('Não há dados na tabela para exportar.');
            return;
        }

        // Cria o cabeçalho da planilha
        const header = ['Professor', ...cursosUnicos, 'Total CH', 'Suficiência'];

        // Mapeia os dados dos professores para o formato da planilha
        const dadosPlanilha = profsFiltradosParaExportacao.map(prof => {
            const row = [prof.nome];
            cursosUnicos.forEach(curso => {
                row.push(formatMinutesToHoursMinutes(prof.cursos[curso] || 0));
            });
            row.push(formatMinutesToHoursMinutes(prof.totalMinutos));

            const cargaMinima = parseFloat(cargaMinimaHorasInput.value) * 60;
            const cargaMaxima = parseFloat(cargaMaximaHorasInput.value) * 60;
            let situacao = '';
            if (prof.totalMinutos < cargaMinima) {
                situacao = 'Insuficiente';
            } else if (prof.totalMinutos > cargaMaxima) {
                situacao = 'Extrapolado';
            } else {
                situacao = 'Suficiente';
            }
            row.push(situacao);
            return row;
        });

        // Converte os dados para o formato de planilha e baixa o arquivo
        const worksheet = XLSX.utils.aoa_to_sheet([header, ...dadosPlanilha]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Carga Horária de Professores");
        XLSX.writeFile(workbook, "relatorio_carga_horaria_professores.xlsx");
    }

    // Função para exportar os dados para um arquivo de planilha .ods
    function exportarParaODS() {
        if (profsFiltradosParaExportacao.length === 0) {
            alert('Não há dados na tabela para exportar.');
            return;
        }
        
        // Cria o cabeçalho da planilha
        const header = ['Professor', ...cursosUnicos, 'Total CH', 'Suficiência'];

        // Mapeia os dados dos professores para o formato da planilha
        const dadosPlanilha = profsFiltradosParaExportacao.map(prof => {
            const row = [prof.nome];
            cursosUnicos.forEach(curso => {
                row.push(formatMinutesToHoursMinutes(prof.cursos[curso] || 0));
            });
            row.push(formatMinutesToHoursMinutes(prof.totalMinutos));

            const cargaMinima = parseFloat(cargaMinimaHorasInput.value) * 60;
            const cargaMaxima = parseFloat(cargaMaximaHorasInput.value) * 60;
            let situacao = '';
            if (prof.totalMinutos < cargaMinima) {
                situacao = 'Insuficiente';
            } else if (prof.totalMinutos > cargaMaxima) {
                situacao = 'Extrapolado';
            } else {
                situacao = 'Suficiente';
            }
            row.push(situacao);
            return row;
        });

        // Converte os dados para o formato de planilha e baixa o arquivo
        const worksheet = XLSX.utils.aoa_to_sheet([header, ...dadosPlanilha]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Carga Horária de Professores");
        XLSX.writeFile(workbook, "relatorio_carga_horaria_professores.ods");
    }

    // Eventos
    btnExportarODP.addEventListener('click', exportarParaODS);
    btnExportarXLS.addEventListener('click', exportarParaXLSX);
    btnGerarRelatorio.addEventListener('click', carregarDados);
    filtroGeralInput.addEventListener('input', aplicarFiltros);
    cargaMinimaHorasInput.addEventListener('input', aplicarFiltros);
    cargaMaximaHorasInput.addEventListener('input', aplicarFiltros);

    // Carregar dados inicial
    carregarDados();
});