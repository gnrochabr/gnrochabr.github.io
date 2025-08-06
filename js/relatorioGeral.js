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
    const filtroGeralInput = document.getElementById('filtroGeral');
    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    const btnExportarXLS = document.getElementById('btnExportarXLS');
    const btnExportarODS = document.getElementById('btnExportarODS');

    let allDados = [];
    let profsProcessados = [];

    async function carregarDados() {
        relatorioTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Carregando dados...</td></tr>`;

        try {
            allDados = await fetchData('cargas-horarias');
            processarDadosEFiltrar();
        } catch (error) {
            relatorioTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar dados: ${error.message}</td></tr>`;
        }
    }

    function processarDadosEFiltrar() {
        const filtroTexto = filtroGeralInput.value.toLowerCase().trim();
        const profsMap = new Map();

        allDados.forEach(item => {
            const profId = item.professorId?._id || item.professorId;
            const profNome = item.professorId?.nome || 'Sem nome';
            const disciplinaNome = item.disciplinaId?.nome || 'Disciplina não informada';
            const disciplinaArea = item.disciplinaId?.areaDisciplina || 'Área não informada';
            const cursoNome = item.cursoId?.nome || 'Curso não informado';

            if (!profsMap.has(profId)) {
                profsMap.set(profId, {
                    nome: profNome,
                    disciplinas: new Set(),
                    areas: new Set(),
                    cursos: new Set(),
                    totalMinutos: 0,
                    id: profId
                });
            }

            const prof = profsMap.get(profId);
            prof.disciplinas.add(disciplinaNome);
            prof.areas.add(disciplinaArea);
            prof.cursos.add(cursoNome);

            const chSemanal = item.cargaHorariaSemanalAulasAtribuida || 0;
            const duracaoMin = item.duracaoAulaMinutosAtribuida || 0;

            let totalMinutos = 0;
            if (typeof item.cargaHorariaTotalPeriodoMinutos === 'number' && item.cargaHorariaTotalPeriodoMinutos > 0) {
                totalMinutos = item.cargaHorariaTotalPeriodoMinutos;
            } else {
                totalMinutos = chSemanal * duracaoMin
            }
            prof.totalMinutos += totalMinutos;
        });

        profsProcessados = Array.from(profsMap.values()).filter(prof => {
            const profDataString = [
                prof.nome,
                Array.from(prof.disciplinas).join(' '),
                Array.from(prof.areas).join(' '),
                Array.from(prof.cursos).join(' ')
            ].join(' ').toLowerCase();
            return profDataString.includes(filtroTexto);
        });

        preencherTabela(profsProcessados);
    }

    function preencherTabela(profs) {
        relatorioTableBody.innerHTML = '';
        if (profs.length === 0) {
            relatorioTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum resultado encontrado.</td></tr>`;
            return;
        }

        profs.forEach(prof => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${prof.nome}</td>
                <td>${Array.from(prof.disciplinas).join(', ')}</td>
                <td>${Array.from(prof.areas).join(', ')}</td>
                <td>${Array.from(prof.cursos).join(', ')}</td>
                <td>${formatMinutesToHoursMinutes(prof.totalMinutos)}</td>
            `;
            relatorioTableBody.appendChild(tr);
        });
    }

    function exportarParaXLSX() {
        if (profsProcessados.length === 0) {
            alert('Não há dados na tabela para exportar.');
            return;
        }

        const dadosPlanilha = profsProcessados.map(prof => ({
            'Professor': prof.nome,
            'Disciplinas': Array.from(prof.disciplinas).join(', '),
            'Áreas': Array.from(prof.areas).join(', '),
            'Cursos': Array.from(prof.cursos).join(', '),
            'Carga Horária Total': formatMinutesToHoursMinutes(prof.totalMinutos)
        }));

        const worksheet = XLSX.utils.json_to_sheet(dadosPlanilha);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Geral");
        XLSX.writeFile(workbook, "relatorio_geral_docente.xlsx");
    }

    function exportarParaODS() {
        if (profsProcessados.length === 0) {
            alert('Não há dados na tabela para exportar.');
            return;
        }
        
        const dadosPlanilha = profsProcessados.map(prof => ({
            'Professor': prof.nome,
            'Disciplinas': Array.from(prof.disciplinas).join(', '),
            'Áreas': Array.from(prof.areas).join(', '),
            'Cursos': Array.from(prof.cursos).join(', '),
            'Carga Horária Total': formatMinutesToHoursMinutes(prof.totalMinutos)
        }));

        const worksheet = XLSX.utils.json_to_sheet(dadosPlanilha);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Geral");
        XLSX.writeFile(workbook, "relatorio_geral_docente.ods");
    }

    btnExportarODS.addEventListener('click', exportarParaODS);
    btnExportarXLS.addEventListener('click', exportarParaXLSX);
    btnGerarRelatorio.addEventListener('click', carregarDados);
    filtroGeralInput.addEventListener('input', processarDadosEFiltrar);

    carregarDados();
});