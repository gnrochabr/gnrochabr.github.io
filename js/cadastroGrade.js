/**
 * Script para a página de Cadastro e Gerenciamento de Grades Curriculares.
 * @version 2.4.0 Corrigida a lógica de unicidade e nomenclatura da grade.
 */
document.addEventListener('DOMContentLoaded', () => {

    const CONSTANTS = {
        API_BASE_URL: 'https://serversgch-nv.onrender.com/api',
        OFERTA_ANUAL: 'Anual',
        OFERTA_SEMESTRAL: 'Semestral',
        OUTRAS_OFERTAS: 'Outro'
    };

    const DOM = {
        formSelecaoGrade: document.getElementById('formSelecaoGrade'),
        cursoSelect: document.getElementById('cursoGH'),
        turmaSelect: document.getElementById('TurmaGH'),
        periodoLetivoSelect: document.getElementById('periodoLetivoGH'),
        anoHomologacaoInput: document.getElementById('anoHomologacaoGH'),
        versaoInput: document.getElementById('versaoGH'),
        tabelaGradeContainer: document.getElementById('tabelaGradeContainer'),
        nomeGradeSpan: document.getElementById('nomeGrade'),
        gradeHorariosTableBody: document.getElementById('gradeHorariosTableBody'),
        addDisciplinaBtn: document.getElementById('addDisciplinaBtn'),
        saveGradeBtn: document.getElementById('saveGradeBtn'),
        deleteGradeBtn: document.getElementById('deleteGradeBtn'),
        alertPlaceholder: document.getElementById('liveAlertPlaceholder'),
    };

    const state = {
        allCursos: [],
        allDisciplinas: [],
        currentGrade: null,
    };

    // ====================================================
    // FUNÇÕES DE UTILIDADE E API
    // ====================================================

    function showMessage(message, type = 'info') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <div>${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
        DOM.alertPlaceholder.innerHTML = '';
        DOM.alertPlaceholder.append(wrapper);
        setTimeout(() => wrapper.remove(), 5000);
    }

    async function fetchData(endpoint, method = 'GET', data = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (data) options.body = JSON.stringify(data);
        const response = await fetch(`${CONSTANTS.API_BASE_URL}/${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'Erro na requisição');
        }
        return response.status === 204 ? null : response.json();
    }

    // ====================================================
    // FUNÇÕES DE MANIPULAÇÃO DO DOM
    // ====================================================

    function populateDropdown(selectElement, items, defaultText) {
        selectElement.innerHTML = `<option selected disabled value="">${defaultText}</option>`;
        items.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(item => {
            selectElement.innerHTML += `<option value="${item._id}">${item.nome}</option>`;
        });
    }

    function generateTermOptions(count, suffix) {
        let options = '';
        if(count!= null){
        for (let i = 1; i <= count; i++) {
            const text = `${i}º ${suffix}`;
            options += `<option value="${text}">${text}</option>`;
        }
         }
        else{
            options += `<option value="${suffix}">${suffix}</option>`;
        }
        return options;
    }

    function updateTurmasDropdown() {
        const selectedCursoId = DOM.cursoSelect.value;
        const selectedCurso = state.allCursos.find(c => c._id === selectedCursoId);
        DOM.turmaSelect.innerHTML = '';
        DOM.turmaSelect.disabled = true;
        if (!selectedCurso) {
            DOM.turmaSelect.innerHTML = '<option selected disabled value="">Primeiro, selecione um curso</option>';
            return;
        }
        let options = '<option selected disabled value="">Selecione a turma</option>';
        const serializacao = selectedCurso?.serializacao;
        if (serializacao === CONSTANTS.OFERTA_ANUAL) {
            options += generateTermOptions(4, 'Ano');
        } else if (serializacao === CONSTANTS.OFERTA_SEMESTRAL) {
            options += generateTermOptions(12, 'Período');
        } else if(serializacao === CONSTANTS.OUTRAS_OFERTAS){
            options += generateTermOptions(null,'Grade Única');
        }   
        else {
            options = '<option selected disabled value="">Serialização do curso não especificada</option>';
            DOM.turmaSelect.innerHTML = options;
            return;
        }
        DOM.turmaSelect.innerHTML = options;
        DOM.turmaSelect.disabled = false;
    }

    function resetGradeView() {
        state.currentGrade = null;
        DOM.tabelaGradeContainer.style.display = 'none';
        DOM.deleteGradeBtn.style.display = 'none';
        DOM.gradeHorariosTableBody.innerHTML = '';
        DOM.formSelecaoGrade.reset();
        updateTurmasDropdown();
        DOM.anoHomologacaoInput.value = new Date().getFullYear();
    }
    
    function populateFormWithGradeData(grade) {
        if (!grade) return;
        DOM.cursoSelect.value = grade.cursoId?._id || grade.cursoId;
        updateTurmasDropdown();
        DOM.turmaSelect.value = grade.serieAno;
        DOM.periodoLetivoSelect.value = grade.periodoLetivo;
        DOM.anoHomologacaoInput.value = grade.anoHomologacao;
        DOM.versaoInput.value = grade.versao;
    }
    
    function renderGradeTable() {
        const disciplinasValidas = state.currentGrade?.disciplinas?.filter(d => d.disciplinaId) || [];
        DOM.gradeHorariosTableBody.innerHTML = disciplinasValidas.map(({ disciplinaId, aulasSemanais }) => `
            <tr data-disciplina-id="${disciplinaId._id}">
                <td class="disciplina-nome">${disciplinaId.nome}</td>
                <td class="aulas-semanais-valor">${aulasSemanais}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1 edit-btn" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" title="Excluir"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    function createDisciplinaDropdown(selectedId = null) {
        const optionsHtml = state.allDisciplinas.sort((a, b) => a.nome.localeCompare(b.nome))
            .map(d => `<option value="${d._id}" ${d._id === selectedId ? 'selected' : ''}>${d.nome}</option>`).join('');
        return `<select class="form-select select-disciplina"><option value="">Selecione...</option>${optionsHtml}</select>`;
    }

    function enterEditMode(row) {
        const disciplinaId = row.dataset.disciplinaId;
        const aulasSemanais = row.querySelector('.aulas-semanais-valor').textContent;
        row.querySelector('.disciplina-nome').innerHTML = createDisciplinaDropdown(disciplinaId);
        row.querySelector('.aulas-semanais-valor').innerHTML = `<input type="number" class="form-control aulas-semanais-input" value="${aulasSemanais}" min="1" required>`;
        row.querySelector('td:last-child').innerHTML = `
            <button class="btn btn-sm btn-success save-edit-btn" title="Salvar"><i class="fas fa-check"></i></button>
            <button class="btn btn-sm btn-secondary cancel-edit-btn" title="Cancelar"><i class="fas fa-times"></i></button>
        `;
    }

    function addNewRow() {
        if (!state.currentGrade) return showMessage('Por favor, gere uma grade primeiro.', 'warning');
        if (DOM.gradeHorariosTableBody.querySelector('.save-new-btn')) return showMessage('Salve a nova disciplina antes de adicionar outra.', 'warning');
        const newRow = DOM.gradeHorariosTableBody.insertRow();
        newRow.innerHTML = `
            <td class="disciplina-nome">${createDisciplinaDropdown()}</td>
            <td class="aulas-semanais-valor"><input type="number" class="form-control aulas-semanais-input" value="2" min="1" required></td>
            <td>
                <button class="btn btn-sm btn-success save-new-btn" title="Salvar"><i class="fas fa-check"></i></button>
                <button class="btn btn-sm btn-secondary cancel-new-btn" title="Cancelar"><i class="fas fa-times"></i></button>
            </td>
        `;
    }

    // ====================================================
    // LÓGICA DE NEGÓCIO E DADOS
    // ====================================================

    function getGradeDataFromForm() {
        const cursoId = DOM.cursoSelect.value;
        const curso = state.allCursos.find(c => c._id === cursoId);
        if (!curso) return null;

        const serieAno = DOM.turmaSelect.value;
        const periodoLetivo = DOM.periodoLetivoSelect.value;
        const anoHomologacao = DOM.anoHomologacaoInput.value;
        const versao = DOM.versaoInput.value;
        
       const nome = `${curso.nome} - ${serieAno} - ${periodoLetivo} - ${anoHomologacao}.V${versao}`;


        return {
            cursoId,
            serieAno,
            periodoLetivo,
            anoHomologacao: parseInt(anoHomologacao),
            versao: parseInt(versao),
            nome,
        };
    }
    
    async function saveGrade() {
        if (!state.currentGrade) return showMessage('Nenhuma grade para salvar.', 'warning');
        if (DOM.gradeHorariosTableBody.querySelector('input')) {
            return showMessage('Por favor, salve ou cancele as edições em andamento na tabela.', 'warning');
        }
        const formData = getGradeDataFromForm();
        if (!formData) return showMessage('Curso inválido selecionado.', 'danger');
        Object.assign(state.currentGrade, formData);
        const payload = {
            ...state.currentGrade,
            disciplinas: state.currentGrade.disciplinas.map(d => ({
                disciplinaId: d.disciplinaId._id,
                aulasSemanais: d.aulasSemanais
            }))
        };
        try {
            const isExistingGrade = !!state.currentGrade._id;
            const method = isExistingGrade ? 'PATCH' : 'POST';
            const endpoint = isExistingGrade ? `grades/${state.currentGrade._id}` : 'grades';
            const savedGrade = await fetchData(endpoint, method, payload);
            state.currentGrade = await fetchData(`grades/${savedGrade._id}`);
            showMessage('Grade salva com sucesso!', 'success');
            renderGradeTable();
            populateFormWithGradeData(state.currentGrade);
            DOM.deleteGradeBtn.style.display = 'inline-block';
        } catch (error) {
            showMessage(`Erro ao salvar a grade: ${error.message}`, 'danger');
        }
    }
    
    // ====================================================
    // MANIPULADORES DE EVENTOS (EVENT HANDLERS)
    // ====================================================

    async function handleFormSubmit(event) {
        event.preventDefault();
        const gradeData = getGradeDataFromForm();
        if (!gradeData || !gradeData.cursoId || !gradeData.serieAno || !gradeData.periodoLetivo) {
            return showMessage('Preencha todos os campos do formulário para continuar.', 'warning');
        }
        DOM.nomeGradeSpan.textContent = gradeData.nome;
        try {
            // --- CORRIGIDO: Busca por uma grade existente agora usa os campos corretos, sem o 'nome' ---
            const { cursoId, serieAno, periodoLetivo, anoHomologacao, versao } = gradeData;
            const queryParams = new URLSearchParams({ cursoId, serieAno, periodoLetivo, anoHomologacao, versao });
            const existingGrades = await fetchData(`grades?${queryParams}`);
            
            if (existingGrades.length > 0) {
                state.currentGrade = existingGrades[0];
                showMessage('Versão de grade existente carregada com sucesso!', 'success');
                populateFormWithGradeData(state.currentGrade);
                DOM.deleteGradeBtn.style.display = 'inline-block';
            } else {
                state.currentGrade = { ...gradeData, disciplinas: [] };
                showMessage('Nenhuma versão de grade encontrada. Você pode criar uma nova abaixo.', 'info');
                DOM.deleteGradeBtn.style.display = 'none';
            }
            renderGradeTable();
            DOM.tabelaGradeContainer.style.display = 'block';
        } catch (error) {
            showMessage(`Erro ao carregar a grade: ${error.message}`, 'danger');
        }
    }

    async function handleDeleteGrade() {
        if (!state.currentGrade?._id) {
            return showMessage('Nenhuma grade salva para excluir.', 'warning');
        }
        if (confirm('TEM CERTEZA que deseja excluir permanentemente esta grade?')) {
            try {
                await fetchData(`grades/${state.currentGrade._id}`, 'DELETE');
                showMessage('Grade excluída com sucesso!', 'success');
                resetGradeView();
            } catch (error) {
                showMessage(`Erro ao excluir a grade: ${error.message}`, 'danger');
            }
        }
    }
    
    function handleTableClick(event) {
        const button = event.target.closest('button');
        if (!button) return;
        const row = button.closest('tr');
        const disciplinaIdOriginal = row.dataset.disciplinaId;
        if (button.classList.contains('delete-btn')) {
            state.currentGrade.disciplinas = state.currentGrade.disciplinas.filter(d => d.disciplinaId._id !== disciplinaIdOriginal);
            renderGradeTable();
            showMessage('Disciplina removida. Clique em "Salvar Grade" para confirmar.', 'info');
        } else if (button.classList.contains('edit-btn')) {
            enterEditMode(row);
        } else if (button.classList.contains('cancel-edit-btn') || button.classList.contains('cancel-new-btn')) {
            renderGradeTable();
        } else if (button.classList.contains('save-new-btn') || button.classList.contains('save-edit-btn')) {
            const selectedDisciplinaId = row.querySelector('.select-disciplina').value;
            const aulasSemanais = parseInt(row.querySelector('.aulas-semanais-input').value);
            if (!selectedDisciplinaId || isNaN(aulasSemanais) || aulasSemanais < 1) {
                return showMessage('Selecione uma disciplina e um número válido de aulas.', 'warning');
            }
            const disciplinaData = state.allDisciplinas.find(d => d._id === selectedDisciplinaId);
            const newEntry = { disciplinaId: disciplinaData, aulasSemanais };
            if (button.classList.contains('save-edit-btn')) {
                const index = state.currentGrade.disciplinas.findIndex(d => d.disciplinaId._id === disciplinaIdOriginal);
                if (index > -1) state.currentGrade.disciplinas[index] = newEntry;
            } else {
                state.currentGrade.disciplinas.push(newEntry);
            }
            renderGradeTable();
        }
    }

    // ====================================================
    // INICIALIZAÇÃO DA APLICAÇÃO
    // ====================================================

    async function init() {
        DOM.anoHomologacaoInput.value = new Date().getFullYear();
        DOM.formSelecaoGrade.addEventListener('submit', handleFormSubmit);
        DOM.addDisciplinaBtn.addEventListener('click', addNewRow);
        DOM.saveGradeBtn.addEventListener('click', saveGrade);
        DOM.deleteGradeBtn.addEventListener('click', handleDeleteGrade);
        DOM.gradeHorariosTableBody.addEventListener('click', handleTableClick);
        DOM.cursoSelect.addEventListener('change', updateTurmasDropdown);
        try {
            [state.allCursos, state.allDisciplinas] = await Promise.all([
                fetchData('cursos'),
                fetchData('disciplinas')
            ]);
            populateDropdown(DOM.cursoSelect, state.allCursos, 'Selecione o curso');
        } catch (error) {
            showMessage(`Erro fatal ao carregar dados iniciais: ${error.message}`, 'danger');
            DOM.formSelecaoGrade.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
        }
    }

    init();
});
