/**
 * @file Script da página de Relatório Geral de Atribuições.
 * @description Busca e exibe uma lista completa de todas as disciplinas e seus professores atribuídos.
 * @version 2.2.0
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. CONSTANTES E CONFIGURAÇÕES
    const API_BASE_URL = 'http://localhost:3000/api';
    const DOM = {
        tableHead: document.getElementById('geralTableHead'),
        tableBody: document.getElementById('geralTableBody'),
        btnExportarXLS: document.getElementById('btnExportarXLS'),
        btnExportarODP: document.getElementById('btnExportarODP'),
    };

    let reportData = [];   // Dados brutos da API
    let sortColumn = 'Turma';
    let sortDirection = 'asc';

    // 2. FUNÇÕES DE UTILIDADE
    const fetchData = async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }
        return response.json();
    };

    const formatarMinutosParaHHMM = (totalMinutos) => {
        if (isNaN(totalMinutos) || totalMinutos < 0) return '00:00';
        const horas = Math.floor(totalMinutos / 60);
        const minutos = Math.round(totalMinutos % 60);
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    };

    // 3. ORDENAÇÃO
    const sortData = (data) => {
        return data.sort((a, b) => {
            let valA = a[sortColumn] ?? '';
            let valB = b[sortColumn] ?? '';

            // Ajusta para número quando for CH
            if (sortColumn === 'CH Semanal') {
                const toMinutes = (hhmm) => {
                    const [h, m] = hhmm.split(':').map(Number);
                    return h * 60 + m;
                };
                valA = toMinutes(valA);
                valB = toMinutes(valB);
            }

            if (typeof valA === 'string') {
                return sortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });
    };

    // 4. FUNÇÕES DE RENDERIZAÇÃO
    const renderTable = (horarios) => {
        DOM.tableBody.innerHTML = '';
        DOM.tableHead.innerHTML = '';

        if (!horarios || horarios.length === 0) {
            DOM.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma atribuição encontrada.</td></tr>';
            reportData = [];
            return;
        }

        // Normaliza dados
        reportData = horarios.flatMap(horario =>
            horario.atribuicoes.map(attr => ({
                'Turma': horario.turmaId?.nome || 'N/A',
                'Curso': horario.turmaId?.cursoId?.nome || 'N/A',
                'Disciplina': attr.disciplinaId?.nome || 'N/A',
                'Área': attr.disciplinaId?.areaDisciplina || 'N/A',
                'CH Semanal': formatarMinutosParaHHMM(attr.chSemanalMinutos),
                'Professor Atribuído': attr.professorId?.nome || 'Não Atribuído'
            }))
        );

        // Ordena antes de exibir
        const sortedData = sortData([...reportData]);

        // Cabeçalho com ícones
        const headers = Object.keys(sortedData[0]);
        DOM.tableHead.innerHTML = `
            <tr>
                ${headers.map(h => `
                    <th style="cursor:pointer" data-col="${h}">
                        ${h}
                        ${sortColumn === h ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                `).join('')}
            </tr>
        `;

        // Corpo da tabela
        DOM.tableBody.innerHTML = sortedData.map(row => `
            <tr>
                ${headers.map(h => `<td>${row[h]}</td>`).join('')}
            </tr>
        `).join('');

        // Clique nos cabeçalhos
        DOM.tableHead.querySelectorAll('th').forEach(th => {
            th.addEventListener('click', () => {
                const clickedCol = th.getAttribute('data-col');
                if (sortColumn === clickedCol) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = clickedCol;
                    sortDirection = 'asc';
                }
                renderTable(horarios); // re-render com ordenação
            });
        });
    };

    // 5. FUNÇÕES DE EXPORTAÇÃO
    function exportarParaXLSX() {
        if (!reportData.length) return alert('Não há dados para exportar.');
        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Geral");
        XLSX.writeFile(workbook, "relatorio_geral_atribuicoes.xlsx");
    }

    function exportarParaODS() {
        if (!reportData.length) return alert('Não há dados para exportar.');
        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Geral");
        XLSX.writeFile(workbook, "relatorio_geral_atribuicoes.ods");
    }

    // 6. LÓGICA PRINCIPAL
    const carregarRelatorio = async () => {
        DOM.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Carregando...</td></tr>';
        try {
            const horarios = await fetchData(`${API_BASE_URL}/reports/geral`);
            renderTable(horarios);
        } catch (err) {
            DOM.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${err.message}</td></tr>`;
        }
    };

    // 7. INICIALIZAÇÃO
    DOM.btnExportarXLS.addEventListener('click', exportarParaXLSX);
    DOM.btnExportarODP.addEventListener('click', exportarParaODS);
    
    carregarRelatorio();
});
