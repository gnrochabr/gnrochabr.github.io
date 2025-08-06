const API_BASE_URL = 'http://localhost:3000/api';

async function fetchData(endpoint) {
    const url = `${API_BASE_URL}/${endpoint}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro na rede: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar dados da API:", error);
        throw new Error(`Não foi possível conectar ao servidor. Verifique se o servidor está rodando em ${API_BASE_URL}.`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const relatorioTableBody = document.getElementById('relatorioTableBody');
    const filtroAreaInput = document.getElementById('filtroArea');
    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    const btnExportarPlanilha = document.getElementById('btnExportarPlanilha');
    const btnExportarOds = document.getElementById('btnExportarOds');

    let allDisciplinas = [];
    let areasProcessadas = [];

    // Função para carregar os dados da API na inicialização
    async function carregarDadosIniciais() {
        relatorioTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Carregando dados...</td></tr>`;

        try {
            allDisciplinas = await fetchData('disciplinas');
            aplicarFiltroArea();
        } catch (error) {
            relatorioTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    // Função para aplicar o filtro e renderizar a tabela
    function aplicarFiltroArea() {
        const filtroTexto = filtroAreaInput.value.toLowerCase().trim();
        const areaMap = new Map();

        allDisciplinas.forEach(disciplina => {
            const area = disciplina.areaDisciplina?.trim() || 'Área não informada';
            const nomeDisciplina = disciplina.nome || 'Disciplina desconhecida';
            const cargaHoraria = disciplina.cargaHorariaTotalHoras || 0;

            if (!areaMap.has(area)) {
                areaMap.set(area, {
                    totalHoras: 0,
                    disciplinas: new Set()
                });
            }
            const areaData = areaMap.get(area);
            areaData.totalHoras += cargaHoraria;
            areaData.disciplinas.add(nomeDisciplina);
        });

        areasProcessadas = Array.from(areaMap.entries())
            .filter(([area]) => area.toLowerCase().includes(filtroTexto))
            .map(([area, dados]) => ({
                area,
                totalHoras: dados.totalHoras,
                qtdDisciplinas: dados.disciplinas.size,
                listaDisciplinas: Array.from(dados.disciplinas).sort().join(', ')
            }));

        preencherTabela(areasProcessadas);
    }

    // Função para preencher a tabela HTML
    function preencherTabela(areas) {
        relatorioTableBody.innerHTML = '';
        if (areas.length === 0) {
            relatorioTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum resultado encontrado.</td></tr>`;
            return;
        }

        areas.forEach(areaData => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${areaData.area}</td>
                <td>${areaData.qtdDisciplinas}</td>
                <td>${areaData.totalHoras}h</td>
                <td>${areaData.listaDisciplinas}</td>
            `;
            relatorioTableBody.appendChild(tr);
        });
    }

    // Função para exportar os dados para um arquivo de planilha .xlsx
    function exportarParaXLSX() {
        if (areasProcessadas.length === 0) {
            alert('Não há dados na tabela para exportar.');
            return;
        }

        const dadosPlanilha = areasProcessadas.map(area => ({
            'Área Disciplinar': area.area,
            'Quantidade de Disciplinas': area.qtdDisciplinas,
            'Carga Horária Total': `${area.totalHoras}h`,
            'Disciplinas': area.listaDisciplinas,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dadosPlanilha);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório por Área");

        XLSX.writeFile(workbook, "relatorio_areas_disciplinares.xlsx");
    }

    // Função para exportar os dados para um arquivo de planilha .ods
    function exportarParaODS() {
        if (areasProcessadas.length === 0) {
            alert('Não há dados na tabela para exportar.');
            return;
        }

        const dadosPlanilha = areasProcessadas.map(area => ({
            'Área Disciplinar': area.area,
            'Quantidade de Disciplinas': area.qtdDisciplinas,
            'Carga Horária Total': `${area.totalHoras}h`,
            'Disciplinas': area.listaDisciplinas,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dadosPlanilha);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório por Área");

        // Use o terceiro parâmetro para definir o tipo de arquivo
        XLSX.writeFile(workbook, "relatorio_areas_disciplinares.ods");
    }

    // Event listeners
    btnGerarRelatorio.addEventListener('click', aplicarFiltroArea);
    filtroAreaInput.addEventListener('input', aplicarFiltroArea);
    btnExportarPlanilha.addEventListener('click', exportarParaXLSX);
    btnExportarOds.addEventListener('click', exportarParaODS);

    // Inicia o carregamento dos dados
    carregarDadosIniciais();
});