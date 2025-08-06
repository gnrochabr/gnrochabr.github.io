// Arquivo: ../js/cadastroDisciplina.js

// --- Configurações e Funções Auxiliares ---
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Função genérica para fazer requisições à API.
 * @param {string} endpoint - O endpoint da API (ex: 'disciplinas').
 * @param {string} method - O método HTTP (GET, POST, PUT, PATCH, DELETE).
 * @param {object} data - Os dados a serem enviados no corpo da requisição.
 * @returns {Promise<object>} Os dados da resposta da API.
 * @throws {Error} Se a requisição não for bem-sucedida.
 */
async function fetchData(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
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
 * Gera um código de pré-visualização para a disciplina.
 * @param {string} nome - O nome da disciplina.
 * @returns {string} O código gerado.
 */
function generatePreviewCode(nome) {
    if (!nome || nome.length < 4) return '';
    const prefix = nome.substring(0, 4).toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
}

// --- Funções Principais do Sistema ---
const dom = {
    form: document.getElementById('formCadastroDisciplina'),
    nome: document.getElementById('nomeDisciplina'),
    codigo: document.getElementById('codigoDisciplina'),
    cargaHoraria: document.getElementById('cargaHorariaTotalHoras'),
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

/**
 * Carrega e popula o dropdown de áreas de disciplina.
 */
async function loadAreas() {
    try {
        const areas = await fetchData('disciplinas/areas');
        
        const fixedOptions = [];
        
        dom.areaSelect.innerHTML = '<option value="" disabled selected>Selecione a área</option>';
        
        fixedOptions.forEach(area => {
            const option = new Option(area, area);
            dom.areaSelect.add(option);
        });

        areas.forEach(area => {
            if (area && !fixedOptions.includes(area) && !dom.areaSelect.querySelector(`option[value="${area}"]`)) {
                const newOption = new Option(area, area);
                dom.areaSelect.add(newOption);
            }
        });
        
        const outroOption = new Option('Outro...', 'Outro');
        dom.areaSelect.add(outroOption);

    } catch (error) {
        console.error('Erro ao carregar áreas:', error);
    }
}

/**
 * Carrega e exibe a lista de disciplinas na tabela.
 */
async function loadDisciplinas() {
    try {
        const disciplinas = await fetchData('disciplinas');
        allDisciplinas = disciplinas;
        dom.tableBody.innerHTML = '';

        if (disciplinas && disciplinas.length > 0) {
            disciplinas.forEach(disciplina => {
                const row = dom.tableBody.insertRow();
                row.innerHTML = `
                    <td>${disciplina.nome}</td>
                    <td>${disciplina.codigo}</td>
                    <td>${disciplina.cargaHorariaTotalHoras}h</td>
                    <td>${disciplina.areaDisciplina || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="window.editDisciplina('${disciplina._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.deleteDisciplina('${disciplina._id}')" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
            });
        } else {
            dom.tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma disciplina cadastrada.</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        dom.tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar disciplinas.</td></tr>';
        alert(`Erro ao carregar disciplinas: ${error.message}`);
    }
}

// Funções para exportação
function exportarParaXLSX() {
    if (allDisciplinas.length === 0) {
        alert('Não há dados de disciplinas para exportar.');
        return;
    }

    const dataForExport = allDisciplinas.map(disciplina => ({
        'Nome da Disciplina': disciplina.nome,
        'Código': disciplina.codigo,
        'Carga Horária Total (Horas)': disciplina.cargaHorariaTotalHoras,
        'Área da Disciplina': disciplina.areaDisciplina || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disciplinas Cadastradas");
    XLSX.writeFile(workbook, "disciplinas_cadastradas.xlsx");
}

function exportarParaODS() {
    if (allDisciplinas.length === 0) {
        alert('Não há dados de disciplinas para exportar.');
        return;
    }
    
    const dataForExport = allDisciplinas.map(disciplina => ({
        'Nome da Disciplina': disciplina.nome,
        'Código': disciplina.codigo,
        'Carga Horária Total (Horas)': disciplina.cargaHorariaTotalHoras,
        'Área da Disciplina': disciplina.areaDisciplina || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disciplinas Cadastradas");
    XLSX.writeFile(workbook, "disciplinas_cadastradas.ods");
}

/**
 * Reseta o formulário para o estado inicial.
 */
function resetForm() {
    dom.form.reset();
    dom.codigo.value = '';
    editingId = null;
    dom.btnSalvar.innerHTML = '<i class="fas fa-save me-2"></i> Cadastrar Disciplina';
    dom.btnSalvar.classList.remove('btn-success');
    dom.btnSalvar.classList.add('btn-warning');
    dom.btnCancelar.classList.add('d-none');
    dom.outraAreaField.style.display = 'none';
    dom.areaSelect.value = '';
}

/**
 * Preenche o formulário com dados de uma disciplina para edição.
 * @param {string} id - O ID da disciplina.
 */
window.editDisciplina = async (id) => {
    try {
        const disciplina = await fetchData(`disciplinas/${id}`);
        dom.nome.value = disciplina.nome;
        dom.codigo.value = disciplina.codigo;
        dom.cargaHoraria.value = disciplina.cargaHorariaTotalHoras;
        dom.areaSelect.value = disciplina.areaDisciplina || '';
        
        editingId = disciplina._id;
        dom.btnSalvar.innerHTML = '<i class="fas fa-save me-2"></i> Atualizar Disciplina';
        dom.btnSalvar.classList.remove('btn-warning');
        dom.btnSalvar.classList.add('btn-success');
        dom.btnCancelar.classList.remove('d-none');
        dom.outraAreaField.style.display = 'none';
    } catch (error) {
        alert(`Erro ao carregar disciplina para edição: ${error.message}`);
    }
};

/**
 * Exclui uma disciplina após confirmação.
 * @param {string} id - O ID da disciplina.
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
 * Gerencia o envio do formulário, seja para cadastro ou edição.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    let areaFinal = dom.areaSelect.value;
    if (areaFinal === 'Outro' && dom.outraAreaInput.value.trim() !== '') {
        areaFinal = dom.outraAreaInput.value.trim();
    }

    const disciplinaData = {
        nome: dom.nome.value,
        cargaHorariaTotalHoras: parseInt(dom.cargaHoraria.value),
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
 * Configura todos os event listeners da página.
 */
function setupEventListeners() {
    dom.nome.addEventListener('input', () => {
        if (!editingId) {
            dom.codigo.value = generatePreviewCode(dom.nome.value);
        }
    });

    dom.areaSelect.addEventListener('change', () => {
        if (dom.areaSelect.value === 'Outro') {
            dom.outraAreaField.style.display = 'block';
            dom.outraAreaInput.setAttribute('required', 'required');
        } else {
            dom.outraAreaField.style.display = 'none';
            dom.outraAreaInput.removeAttribute('required');
            dom.outraAreaInput.value = '';
        }
    });

    dom.form.addEventListener('submit', handleFormSubmit);
    dom.btnCancelar.addEventListener('click', resetForm);
    
    // Event listeners para os botões de exportação
    dom.btnExportarXLS.addEventListener('click', exportarParaXLSX);
    dom.btnExportarODP.addEventListener('click', exportarParaODS);
}

/**
 * Função de inicialização da página.
 */
async function init() {
    setupEventListeners();
    await loadAreas();
    await loadDisciplinas();
}

// Inicia o script quando a página é completamente carregada.
document.addEventListener('DOMContentLoaded', init);