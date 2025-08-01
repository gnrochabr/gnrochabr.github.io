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
    const btnExportarPdf = document.getElementById('btnExportarPdf');
    const cargaMinimaHorasInput = document.getElementById('cargaMinimaHoras');
    const cargaMaximaHorasInput = document.getElementById('cargaMaximaHoras');

    let allDados = [];
    let cursosUnicos = []; // Changed from disciplinasUnicas

    async function carregarDados() {
        relatorioTableBody.innerHTML = `<tr><td colspan="100" class="text-center">Carregando dados...</td></tr>`;

        try {
            // Ajuste o endpoint conforme sua API
            allDados = await fetchData('cargas-horarias');

            // Obter lista única de cursos para montar colunas dinâmicas
            const setCursos = new Set();
            allDados.forEach(item => {
                if (item.cursoId?.nome) setCursos.add(item.cursoId.nome); // Changed from disciplinaId
            });
            cursosUnicos = Array.from(setCursos).sort(); // Changed from disciplinasUnicas

            montarCabecalho();
            aplicarFiltros();
        } catch (error) {
            relatorioTableBody.innerHTML = `<tr><td colspan="100" class="text-center text-danger">Erro ao carregar dados: ${error.message}</td></tr>`;
        }
    }

    function montarCabecalho() {
        // Limpa colunas além das fixas (Professor, Total CH, Suficiência)
        while (tableHeaderRow.children.length > 3) {
            tableHeaderRow.removeChild(tableHeaderRow.children[3]);
        }

        // Insere colunas de curso após "Professor" e antes de "Total CH"
        cursosUnicos.forEach(curso => { // Changed from disciplinasUnicas
            const th = document.createElement('th');
            th.textContent = curso; // Changed from disciplina
            tableHeaderRow.insertBefore(th, tableHeaderRow.children[1]); // inserir antes do Total CH (2ª coluna)
        });
    }

    function aplicarFiltros() {
        const filtroTexto = filtroGeralInput.value.toLowerCase().trim();
        const cargaMinima = parseFloat(cargaMinimaHorasInput.value) * 60;
        const cargaMaxima = parseFloat(cargaMaximaHorasInput.value) * 60;

        // Agrupa dados por professor
        const profsMap = new Map();

        allDados.forEach(item => {
            const profId = item.professorId?._id || item.professorId;
            const profNome = item.professorId?.nome || 'Sem nome';

            if (!profsMap.has(profId)) {
                profsMap.set(profId, {
                    nome: profNome,
                    cursos: {}, // Changed from disciplinas: {}
                    totalMinutos: 0,
                    atribuicoes: []
                });
            }

            // Cálculo corrigido do total minutos:
            const chSemanal = item.cargaHorariaSemanalAulasAtribuida || 0;
            const duracaoMin = item.duracaoAulaMinutosAtribuida || 0;

            let totalMinutos = 0;
            if (typeof item.cargaHorariaTotalPeriodoMinutos === 'number' && item.cargaHorariaTotalPeriodoMinutos > 0) {
                totalMinutos = item.cargaHorariaTotalPeriodoMinutos;
            } else {
                totalMinutos = chSemanal * duracaoMin
            }

            // Soma total e por curso
            const prof = profsMap.get(profId);
            prof.totalMinutos += totalMinutos;

            const cursoNome = item.cursoId?.nome || 'N/A'; // Changed from disciplinaId
            prof.cursos[cursoNome] = (prof.cursos[cursoNome] || 0) + totalMinutos; // Changed from disciplinas
            prof.atribuicoes.push(item);
        });

        // Filtra por texto na busca (professor, disciplina, curso)
        let profsFiltrados = Array.from(profsMap.values()).filter(prof => {
            if (!filtroTexto) return true;

            const cursosText = Object.keys(prof.cursos).join(' ').toLowerCase(); // Changed from disciplinasText
            const atribuicoesText = prof.atribuicoes.map(a =>
                (a.professorId?.nome || '') + ' ' +
                (a.disciplinaId?.nome || '') + ' ' +
                (a.cursoId?.nome || '')).join(' ').toLowerCase();

            return prof.nome.toLowerCase().includes(filtroTexto)
                || cursosText.includes(filtroTexto) // Changed from disciplinasText
                || atribuicoesText.includes(filtroTexto);
        });

        preencherTabela(profsFiltrados, cargaMinima, cargaMaxima);
    }

    function preencherTabela(profs, cargaMinima, cargaMaxima) {
        relatorioTableBody.innerHTML = '';
        if (profs.length === 0) {
            relatorioTableBody.innerHTML = `<tr><td colspan="${3 + cursosUnicos.length}" class="text-center">Nenhum resultado encontrado.</td></tr>`; // Changed from disciplinasUnicas
            return;
        }

        profs.forEach(prof => {
            const tr = document.createElement('tr');

            // Nome professor
            const tdNome = document.createElement('td');
            tdNome.textContent = prof.nome;
            tr.appendChild(tdNome);

            // Colunas por curso
            cursosUnicos.forEach(curso => { // Changed from disciplinasUnicas
                const tdCurso = document.createElement('td'); // Changed from tdDisc
                const minutos = prof.cursos[curso] || 0; // Changed from prof.disciplinas
                tdCurso.textContent = formatMinutesToHoursMinutes(minutos); // Changed from tdDisc
                tr.appendChild(tdCurso); // Changed from tdDisc
            });

            // Total CH atribuída
            const tdTotal = document.createElement('td');
            tdTotal.textContent = formatMinutesToHoursMinutes(prof.totalMinutos);

            // Suficiência e estilização conforme mínimo e máximo
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

    // Eventos
    btnGerarRelatorio.addEventListener('click', carregarDados);
    filtroGeralInput.addEventListener('input', aplicarFiltros);
    cargaMinimaHorasInput.addEventListener('input', aplicarFiltros);
    cargaMaximaHorasInput.addEventListener('input', aplicarFiltros);

    // Carregar dados inicial
    carregarDados();

    // Exportar PDF
    btnExportarPdf.addEventListener('click', () => {
        const element = document.getElementById('relatorioTable');
        const opt = {
            margin: 0.5,
            filename: 'relatorio_carga_horaria_docente.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
        };
        html2pdf().set(opt).from(element).save();
    });
});