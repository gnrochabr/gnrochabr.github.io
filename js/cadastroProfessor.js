// Arquivo: ../js/cadastroProfessor.js

// Constantes e variáveis globais
const API_BASE_URL = 'http://localhost:3000/api';
const DOM = {
    formCadastroProfessor: document.getElementById('formCadastroProfessor'),
    nomeProfessor: document.getElementById('nomeProfessor'),
    siapeProfessor: document.getElementById('siapeProfessor'),
    emailInstitucionalProfessor: document.getElementById('emailInstitucionalProfessor'),
    telefoneProfessor: document.getElementById('telefoneProfessor'),
    titulacaoMaxima: document.getElementById('titulacaoMaxima'),
    cursoLotacao: document.getElementById('cursoLotacao'),
    disciplinaArea: document.getElementById('disciplinaArea'),
    professoresTableBody: document.querySelector('#formCadastroProfessor + h3 + .table-responsive tbody'),
    btnSalvarProfessor: document.getElementById('btnSalvarProfessor'),
    btnCancelarEdicaoProfessor: document.getElementById('btnCancelarEdicaoProfessor'),
    btnExportarXLS: document.getElementById('btnExportarXLS'),
    btnExportarODS: document.getElementById('btnExportarODP'),
    tableHeaders: document.querySelectorAll('#formCadastroProfessor + h3 + .table-responsive th.sortable')
};

// Estado da aplicação
let state = {
    editingId: null,
    allCursos: [],
    allProfessores: [],
    sortColumn: 'nome',
    sortDirection: 'asc'
};

// Mapeador para exportação
const PROFESSOR_EXPORT_MAPPER = professor => ({
    'Nome': professor.nome,
    'SIAPE': professor.siape,
    'Email': professor.emailInstitucional,
    'Titulação': professor.titulacaoMaxima,
    'Áreas de Atuação': Array.isArray(professor.areasDeAtuacao) ? professor.areasDeAtuacao.join(', ') : 'N/A',
    'Curso de Lotação': professor.cursoLotacaoId?.nome || 'N/A'
});

/**
 * Realiza requisições à API.
 * @param {string} endpoint - O endpoint da API.
 * @param {string} [method='GET'] - O método HTTP.
 * @param {object|null} [data=null] - O corpo da requisição.
 * @returns {Promise<object>} - Os dados da resposta da API.
 */
async function fetchData(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro na requisição: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na operação:', error);
        alert(`Erro: ${error.message}`);
        throw error;
    }
}

/**
 * Popula o dropdown de cursos de lotação.
 */
async function populateCursosLotacao() {
    try {
        state.allCursos = await fetchData('cursos');
        const cursosOrdenados = state.allCursos.sort((a, b) => a.nome.localeCompare(b.nome));
        DOM.cursoLotacao.innerHTML = '<option selected disabled value="">Selecione o curso de lotação</option>';
        cursosOrdenados.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso._id;
            option.textContent = curso.nome;
            DOM.cursoLotacao.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar cursos para lotação:', error);
        alert('Erro ao carregar cursos de lotação.');
    }
}

/**
 * Popula o select de áreas de atuação.
 */
async function populateAreasAtuacao() {
    try {
        const areas = await fetchData('disciplinas/areas');
        const areasOrdenadas = areas.sort((a, b) => a.localeCompare(b));
        DOM.disciplinaArea.innerHTML = '<option selected disabled value="">Selecione as áreas de atuação (segure Ctrl para selecionar mais de uma)</option>';
        areasOrdenadas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            DOM.disciplinaArea.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar áreas de atuação:', error);
        alert('Erro ao carregar áreas de atuação.');
    }
}

/**
 * Carrega e exibe os professores na tabela.
 */
async function loadProfessores() {
    try {
        state.allProfessores = await fetchData('professores');
        DOM.professoresTableBody.innerHTML = '';

        if (state.allProfessores && state.allProfessores.length > 0) {
            state.allProfessores.sort((a, b) => {
                let aValue = a[state.sortColumn];
                let bValue = b[state.sortColumn];

                if (state.sortColumn === 'cursoLotacaoId') {
                    aValue = a.cursoLotacaoId?.nome || '';
                    bValue = b.cursoLotacaoId?.nome || '';
                } else if (state.sortColumn === 'areasDeAtuacao') {
                    aValue = Array.isArray(a.areasDeAtuacao) ? a.areasDeAtuacao.join(', ') : '';
                    bValue = Array.isArray(b.areasDeAtuacao) ? b.areasDeAtuacao.join(', ') : '';
                }

                const direction = state.sortDirection === 'asc' ? 1 : -1;
                return (typeof aValue === 'number' ? aValue - bValue : (aValue || '').localeCompare(bValue || '')) * direction;
            });

            state.allProfessores.forEach(professor => {
                const row = DOM.professoresTableBody.insertRow();
                const areasDisplay = Array.isArray(professor.areasDeAtuacao) ? professor.areasDeAtuacao.join(', ') : 'N/A';
                const cursoNome = professor.cursoLotacaoId?.nome || 'N/A';

                row.innerHTML = `
                    <td>${professor.nome}</td>
                    <td>${professor.siape}</td>
                    <td>${professor.emailInstitucional}</td>
                    <td>${professor.titulacaoMaxima}</td>
                    <td>${areasDisplay}</td>
                    <td>${cursoNome}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editProfessor('${professor._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProfessor('${professor._id}')" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
            });
        } else {
            DOM.professoresTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum professor cadastrado.</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao carregar professores:', error);
        DOM.professoresTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar professores.</td></tr>';
    }
}

/**
 * Lida com a ordenação da tabela.
 * @param {string} column - A coluna a ser ordenada.
 */
function sortTableProfessores(column) {
    if (state.sortColumn === column) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortColumn = column;
        state.sortDirection = 'asc';
    }
    updateSortIcons();
    loadProfessores();
}

/**
 * Atualiza os ícones de ordenação nos cabeçalhos da tabela.
 */
function updateSortIcons() {
    DOM.tableHeaders.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.getAttribute('data-column') === state.sortColumn) {
            header.classList.add(`sort-${state.sortDirection}`);
        }
    });
}

/**
 * Exporta os dados da tabela para um arquivo.
 * @param {string} format - O formato do arquivo ('xlsx' ou 'ods').
 */
function exportData(format) {
    if (state.allProfessores.length === 0) {
        alert('Não há dados de professores para exportar.');
        return;
    }

    const dataForExport = state.allProfessores.map(PROFESSOR_EXPORT_MAPPER);
    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Professores Cadastrados");
    XLSX.writeFile(workbook, `professores_cadastrados.${format}`);
}

/**
 * Reseta o formulário para o estado inicial.
 */
function resetForm() {
    DOM.formCadastroProfessor.reset();
    state.editingId = null;
    DOM.btnSalvarProfessor.innerHTML = '<i class="fas fa-save me-2"></i> Cadastrar Professor';
    DOM.btnSalvarProfessor.classList.remove('btn-primary');
    DOM.btnSalvarProfessor.classList.add('btn-success');
    DOM.btnCancelarEdicaoProfessor.classList.add('d-none');
    Array.from(DOM.disciplinaArea.options).forEach(option => option.selected = false);
}

/**
 * Carrega os dados de um professor no formulário para edição.
 * @param {string} id - O ID do professor a ser editado.
 */
window.editProfessor = async (id) => {
    try {
        const professor = await fetchData(`professores/${id}`);
        DOM.nomeProfessor.value = professor.nome;
        DOM.siapeProfessor.value = professor.siape;
        DOM.emailInstitucionalProfessor.value = professor.emailInstitucional;
        DOM.telefoneProfessor.value = professor.telefone || '';
        DOM.titulacaoMaxima.value = professor.titulacaoMaxima;
        DOM.cursoLotacao.value = professor.cursoLotacaoId?._id || '';

        if (Array.isArray(professor.areasDeAtuacao)) {
            Array.from(DOM.disciplinaArea.options).forEach(option => {
                option.selected = professor.areasDeAtuacao.includes(option.value);
            });
        }

        state.editingId = professor._id;
        DOM.btnSalvarProfessor.innerHTML = '<i class="fas fa-save me-2"></i> Atualizar Professor';
        DOM.btnSalvarProfessor.classList.remove('btn-success');
        DOM.btnSalvarProfessor.classList.add('btn-primary');
        DOM.btnCancelarEdicaoProfessor.classList.remove('d-none');
    } catch (error) {
        console.error('Erro ao carregar professor para edição:', error);
        alert(`Erro ao carregar professor para edição: ${error.message}`);
    }
};

/**
 * Exclui um professor do banco de dados.
 * @param {string} id - O ID do professor a ser excluído.
 */
window.deleteProfessor = async (id) => {
    if (confirm('Tem certeza que deseja excluir este professor? Esta ação é irreversível.')) {
        try {
            await fetchData(`professores/${id}`, 'DELETE');
            alert('Professor excluído com sucesso!');
            loadProfessores();
        } catch (error) {
            console.error('Erro ao excluir professor:', error);
            alert(`Erro ao excluir professor: ${error.message}`);
        }
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    DOM.formCadastroProfessor.addEventListener('submit', async (event) => {
        event.preventDefault();
        const areasSelecionadas = Array.from(DOM.disciplinaArea.selectedOptions).map(option => option.value);
        const professorData = {
            nome: DOM.nomeProfessor.value,
            siape: DOM.siapeProfessor.value,
            emailInstitucional: DOM.emailInstitucionalProfessor.value,
            telefone: DOM.telefoneProfessor.value,
            titulacaoMaxima: DOM.titulacaoMaxima.value,
            cursoLotacaoId: DOM.cursoLotacao.value,
            areasDeAtuacao: areasSelecionadas
        };

        try {
            if (state.editingId) {
                await fetchData(`professores/${state.editingId}`, 'PATCH', professorData);
                alert('Professor atualizado com sucesso!');
            } else {
                await fetchData('professores', 'POST', professorData);
                alert('Professor cadastrado com sucesso!');
            }
            resetForm();
            loadProfessores();
        } catch (error) {
            console.error('Erro ao salvar professor:', error);
            alert(`Erro ao salvar professor: ${error.message}`);
        }
    });

    DOM.btnCancelarEdicaoProfessor.addEventListener('click', resetForm);
    DOM.btnExportarXLS.addEventListener('click', () => exportData('xlsx'));
    DOM.btnExportarODS.addEventListener('click', () => exportData('ods'));
    
    DOM.tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            if (column) {
                sortTableProfessores(column);
            }
        });
    });

    // Carregar dados iniciais
    await populateCursosLotacao();
    await populateAreasAtuacao();
    await loadProfessores();
});