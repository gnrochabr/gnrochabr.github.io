// Arquivo: ../js/cadastroDisciplina.js

// URL base da sua API.
const API_BASE_URL = 'https://serversgchnv.onrender.com/api';

// Variáveis de estado para ordenação da tabela.
let sortColumnDisciplinas = 'nome'; 
let sortDirectionDisciplinas = 'asc'; 

// Cache para a lista de cursos.
let allCursos = [];

// Elementos do DOM referenciados.
const dom = {
    form: document.getElementById('formCadastroDisciplina'),
    nome: document.getElementById('nomeDisciplina'),
    cursoSelect: document.getElementById('cursoDisciplina'),
    codigo: document.getElementById('codigoDisciplina'),
    cargaHoraria: document.getElementById('cargaHorariaTotalHoras'),
    duracaoAulaMinutos: document.getElementById('duracaoAulaMinutos'),
    totalAulas: document.getElementById('totalAulas'),
    areaSelect: document.getElementById('areaDisciplina'),
    outraAreaField: document.getElementById('outraAreaField'),
    outraAreaInput: document.getElementById('outraArea'),
    tableBody: document.querySelector('table tbody'),
    btnSalvar: document.getElementById('btnSalvarDisciplina'),
    btnCancelar: document.getElementById('btnCancelarEdicao'),
    btnExportarXLS: document.getElementById('btnExportarXLS'),
    btnExportarODP: document.getElementById('btnExportarODP'),
};

let allDisciplinas = [];
let editingId = null;

// --- Funções Principais ---

/**
 * Realiza requisições à API de forma genérica.
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
        console.error(`Erro na operação ${method} para ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Gera um código de pré-visualização para a disciplina com base no nome e no ID do curso.
 */
async function generatePreviewCode(nome, cursoId) {
    if (!nome || nome.length < 4 || !cursoId) {
        return '';
    }

    try {
        const curso = await fetchData(`cursos/${cursoId}`);
        const codigoCurso = curso.codigo;
        const prefixoDisciplina = nome.substring(0, 4).toUpperCase();
        
        return `${prefixoDisciplina}.${codigoCurso}`;
    } catch (error) {
        console.error('Erro ao gerar código da disciplina:', error);
        return '';
    }
}

/**
 * Calcula e exibe o total de aulas com base na carga horária e duração da aula.
 */
function calculateTotalAulas() {
    const cargaHorariaHoras = parseFloat(dom.cargaHoraria.value);
    const duracaoAulaMinutos = parseFloat(dom.duracaoAulaMinutos.value);

    if (cargaHorariaHoras > 0 && duracaoAulaMinutos > 0) {
        const cargaHorariaMinutos = cargaHorariaHoras * 60;
        const totalAulas = Math.round(cargaHorariaMinutos / duracaoAulaMinutos);
        dom.totalAulas.textContent = totalAulas;
    } else {
        dom.totalAulas.textContent = '0';
    }
}

/**
 * Carrega a lista de cursos da API e preenche o dropdown.
 */
async function loadCursos() {
    try {
        const cursos = await fetchData('cursos');
        allCursos = cursos;
        dom.cursoSelect.innerHTML = '<option value="" disabled selected>Selecione o curso</option>';
        if (cursos && cursos.length > 0) {
            cursos.forEach(curso => {
                const option = new Option(curso.nome, curso._id);
                dom.cursoSelect.add(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        alert('Erro ao carregar a lista de cursos. Verifique a conexão com a API.');
    }
}

/**
 * Carrega as áreas de disciplina da API e preenche o dropdown.
 */
async function loadAreas() {
    try {
        const areas = await fetchData('disciplinas/areas');
        dom.areaSelect.innerHTML = '<option value="" disabled selected>Selecione a área</option>';
        areas.forEach(area => {
            if (area) {
                const newOption = new Option(area, area);
                dom.areaSelect.add(newOption);
            }
        });
        dom.areaSelect.add(new Option('Outro...', 'Outro'));
    } catch (error) {
        console.error('Erro ao carregar áreas:', error);
    }
}

/**
 * Encontra o nome do curso a partir do seu ID.
 */
function getCursoNameById(id) {
    const curso = allCursos.find(c => c._id === id);
    return curso ? curso.nome : 'N/A';
}

/**
 * Carrega a lista de disciplinas da API, ordena e exibe na tabela.
 */
async function loadDisciplinas() {
    try {
        const disciplinas = await fetchData('disciplinas');
        allDisciplinas = disciplinas.map(d => ({
            ...d,
            cursoNome: getCursoNameById(d.curso) 
        }));
        dom.tableBody.innerHTML = '';

        if (allDisciplinas && allDisciplinas.length > 0) {
            allDisciplinas.sort((a, b) => {
                let aValue = a[sortColumnDisciplinas] || '';
                let bValue = b[sortColumnDisciplinas] || '';
                if (sortColumnDisciplinas === 'curso') {
                    aValue = a.cursoNome || '';
                    bValue = b.cursoNome || '';
                }
                const direction = sortDirectionDisciplinas === 'asc' ? 1 : -1;
                return (typeof aValue === 'number' ? aValue - bValue : aValue.localeCompare(bValue)) * direction;
            });

            allDisciplinas.forEach(disciplina => {
                const row = dom.tableBody.insertRow();
                row.innerHTML = `
                    <td>${disciplina.nome}</td>
                    <td>${disciplina.cursoNome}</td>
                    <td>${disciplina.areaDisciplina || 'N/A'}</td>
                    <td>${disciplina.duracaoAulaMinutos}min</td>
                    <td>${disciplina.cargaHorariaTotalHoras}h</td>
                    <td>${disciplina.totalAulas}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="window.editDisciplina('${disciplina._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.deleteDisciplina('${disciplina._id}')" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
            });
        } else {
            dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma disciplina cadastrada.</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar disciplinas.</td></tr>';
        alert(`Erro ao carregar disciplinas: ${error.message}`);
    }
}

/**
 * Alterna a direção da ordenação da tabela.
 */
function sortTableDisciplinas(column) {
    if (sortColumnDisciplinas === column) {
        sortDirectionDisciplinas = sortDirectionDisciplinas === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumnDisciplinas = column;
        sortDirectionDisciplinas = 'asc';
    }
    loadDisciplinas();
}

/**
 * Exporta os dados da tabela para um arquivo XLS.
 */
function exportarParaXLSX() {
    if (allDisciplinas.length === 0) {
        alert('Não há dados de disciplinas para exportar.');
        return;
    }
    const dataForExport = allDisciplinas.map(disciplina => ({
        'Nome da Disciplina': disciplina.nome,
        'Curso': disciplina.cursoNome || 'N/A',
        'Área': disciplina.areaDisciplina || 'N/A',
        'CH por Aula (min)': disciplina.duracaoAulaMinutos,
        'Carga Horária Total (Horas)': disciplina.cargaHorariaTotalHoras,
        'Total de Aulas': disciplina.totalAulas
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disciplinas Cadastradas");
    XLSX.writeFile(workbook, "disciplinas_cadastradas.xlsx");
}

/**
 * Exporta os dados da tabela para um arquivo ODS.
 */
function exportarParaODS() {
    if (allDisciplinas.length === 0) {
        alert('Não há dados de disciplinas para exportar.');
        return;
    }
    const dataForExport = allDisciplinas.map(disciplina => ({
        'Nome da Disciplina': disciplina.nome,
        'Curso': disciplina.cursoNome || 'N/A',
        'Área': disciplina.areaDisciplina || 'N/A',
        'CH por Aula (min)': disciplina.duracaoAulaMinutos,
        'Carga Horária Total (Horas)': disciplina.cargaHorariaTotalHoras,
        'Total de Aulas': disciplina.totalAulas
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disciplinas Cadastradas");
    XLSX.writeFile(workbook, "disciplinas_cadastradas.ods");
}

/**
 * Limpa o formulário e o prepara para um novo cadastro.
 */
function resetForm() {
    dom.form.reset();
    dom.codigo.value = '';
    dom.totalAulas.textContent = '0';
    editingId = null;
    dom.btnSalvar.innerHTML = '<i class="fas fa-save me-2"></i> Cadastrar Disciplina';
    dom.btnSalvar.classList.remove('btn-success');
    dom.btnSalvar.classList.add('btn-warning');
    dom.btnCancelar.classList.add('d-none');
    dom.outraAreaField.style.display = 'none';
    dom.areaSelect.value = '';
    dom.cursoSelect.value = '';
}

/**
 * Carrega os dados de uma disciplina no formulário para edição.
 */
window.editDisciplina = async (id) => {
    try {
        const disciplina = await fetchData(`disciplinas/${id}`);
        dom.nome.value = disciplina.nome;
        dom.cursoSelect.value = disciplina.curso || ''; 
        dom.codigo.value = disciplina.codigo;
        dom.cargaHoraria.value = disciplina.cargaHorariaTotalHoras;
        dom.duracaoAulaMinutos.value = disciplina.duracaoAulaMinutos;
        dom.totalAulas.textContent = disciplina.totalAulas;
        dom.areaSelect.value = disciplina.areaDisciplina || '';
        
        // Se a área for 'Outro', exibe e preenche o campo.
        if (disciplina.areaDisciplina && !dom.areaSelect.querySelector(`option[value='${disciplina.areaDisciplina}']`)) {
            dom.areaSelect.value = 'Outro';
            dom.outraAreaField.style.display = 'block';
            dom.outraAreaInput.value = disciplina.areaDisciplina;
        } else {
            dom.outraAreaField.style.display = 'none';
            dom.outraAreaInput.value = '';
        }

        editingId = disciplina._id;
        dom.btnSalvar.innerHTML = '<i class="fas fa-save me-2"></i> Atualizar Disciplina';
        dom.btnSalvar.classList.remove('btn-warning');
        dom.btnSalvar.classList.add('btn-success');
        dom.btnCancelar.classList.remove('d-none');
    } catch (error) {
        alert(`Erro ao carregar disciplina para edição: ${error.message}`);
    }
};

/**
 * Exclui uma disciplina após a confirmação do usuário.
 */
window.deleteDisciplina = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta disciplina? Esta ação é irreversível.')) {
        try {
            await fetchData(`disciplinas/${id}`, 'DELETE');
            alert('Disciplina excluída com sucesso!');
            await loadDisciplinas();
            await loadAreas(); 
        } catch (error) {
            alert(`Erro ao excluir disciplina: ${error.message}`);
        }
    }
};

/**
 * Lida com o envio do formulário, salvando ou atualizando uma disciplina.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    let areaFinal = dom.areaSelect.value;
    if (areaFinal === 'Outro') {
        if (dom.outraAreaInput.value.trim() === '') {
             alert('Por favor, especifique a nova área.');
             return;
        }
        areaFinal = dom.outraAreaInput.value.trim();
    }
    
    if (!dom.cursoSelect.value) {
        alert('Por favor, selecione um curso.');
        return;
    }

    const disciplinaData = {
        nome: dom.nome.value,
        curso: dom.cursoSelect.value, 
        cargaHorariaTotalHoras: parseInt(dom.cargaHoraria.value),
        duracaoAulaMinutos: parseInt(dom.duracaoAulaMinutos.value),
        areaDisciplina: areaFinal
    };

    if (!editingId) {
        disciplinaData.codigo = dom.codigo.value;
    }

    try {
        if (editingId) {
            await fetchData(`disciplinas/${editingId}`, 'PATCH', disciplinaData);
            alert('Disciplina atualizada com sucesso!');
        } else {
            await fetchData('disciplinas', 'POST', disciplinaData);
            alert('Disciplina cadastrada com sucesso!');
        }

        resetForm();
        await loadAreas(); 
        await loadDisciplinas();
    } catch (error) {
        alert(`Erro ao salvar disciplina: ${error.message}`);
    }
}

/**
 * Configura todos os ouvintes de eventos da página.
 */
function setupEventListeners() {
    const updateCodigo = async () => {
        const nome = dom.nome.value;
        const cursoId = dom.cursoSelect.value;
        if (!editingId) {
            dom.codigo.value = await generatePreviewCode(nome, cursoId);
        }
    };
    
    dom.nome.addEventListener('input', updateCodigo);
    dom.cursoSelect.addEventListener('change', updateCodigo);
    dom.cargaHoraria.addEventListener('input', calculateTotalAulas);
    dom.duracaoAulaMinutos.addEventListener('input', calculateTotalAulas);
    
    dom.areaSelect.addEventListener('change', () => {
        dom.outraAreaField.style.display = dom.areaSelect.value === 'Outro' ? 'block' : 'none';
    });

    dom.form.addEventListener('submit', handleFormSubmit);
    dom.btnCancelar.addEventListener('click', resetForm);
    dom.btnExportarXLS.addEventListener('click', exportarParaXLSX);
    dom.btnExportarODP.addEventListener('click', exportarParaODS);
    document.querySelectorAll('#formCadastroDisciplina + h3 + .table-responsive th.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            if (column) {
                sortTableDisciplinas(column);
            }
        });
    });
}

/**
 * Função principal de inicialização da página.
 */
async function init() {
    setupEventListeners();
    await loadCursos();
    await loadAreas();
    await loadDisciplinas();
}

// Inicia o script quando a página é carregada.
document.addEventListener('DOMContentLoaded', init);
