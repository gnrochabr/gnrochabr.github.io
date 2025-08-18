const API_BASE_URL = 'https://serversgch-nv.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    const formSelecaoHorario = document.getElementById('formSelecaoHorario');
    const cursoSelect = document.getElementById('cursoSelect');
    const periodoLetivoSelect = document.getElementById('periodoLetivoSelect');
    const turmaSelect = document.getElementById('turmaSelect');
    const gradeSelect = document.getElementById('gradeSelect');
    const atribuicaoContainer = document.getElementById('atribuicaoContainer');
    const infoGradeTurmaSpan = document.getElementById('infoGradeTurma');
    const atribuicaoTableBody = document.getElementById('atribuicaoTableBody');
    const saveAtribuicaoBtn = document.getElementById('saveAtribuicaoBtn');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const deleteAtribuicaoBtn = document.getElementById('deleteAtribuicaoBtn');
    const alertPlaceholder = document.getElementById('liveAlertPlaceholder');

    let allCursos = [];
    let allGrades = [];
    let allTurmas = [];
    let allProfessores = [];
    let filteredTurmasByCurso = [];
    let filteredGradesByCurso = [];
    let currentGrade = null;
    let currentTurma = null;
    let existingAtribuicaoId = null;

    const showMessage = (message, type = 'info') => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <div>${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
        alertPlaceholder.append(wrapper);
        setTimeout(() => wrapper.remove(), 5000);
    };

    async function fetchData(endpoint, method = 'GET', data = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (data) options.body = JSON.stringify(data);
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try { errorData = JSON.parse(errorText); } catch { }
                throw new Error(errorData?.message || response.statusText);
            }
            return await response.json();
        } catch (error) {
            console.error('Erro na operação fetchData:', error);
            throw error;
        }
    }

    function populateDropdown(selectElement, items, defaultText, textKey = 'nome', valueKey = '_id') {
        if (!selectElement) return;
        selectElement.innerHTML = `<option selected disabled value="">${defaultText}</option>`;
        selectElement.disabled = !items || items.length === 0;
        if (items?.length) {
            items.sort((a, b) => (a[textKey] || '').localeCompare(b[textKey] || ''));
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item[valueKey];
                option.textContent = item[textKey];
                selectElement.appendChild(option);
            });
        }
    }

    async function loadInitialData() {
        try {
            allCursos = await fetchData('cursos');
            allGrades = await fetchData('grades');
            allTurmas = await fetchData('turmas');
            allProfessores = await fetchData('professores');
            populateDropdown(cursoSelect, allCursos, 'Selecione o Curso');
        } catch (error) {
            showMessage('Erro ao carregar dados iniciais.', 'danger');
        }
    }

    function createProfessorDropdown(professores, disciplinaArea, selectedId = null) {
        let html = `<select class="form-select professor-select" required><option value="">Selecione o professor</option>`;
        professores
            .filter(p => Array.isArray(p.areasDeAtuacao) && p.areasDeAtuacao.includes(disciplinaArea))
            .forEach(p => {
                // Compara os IDs para pré-selecionar o professor correto
                const selected = (p._id && selectedId && p._id.toString() === selectedId.toString()) ? 'selected' : '';
                html += `<option value="${p._id}" ${selected}>${p.nome}</option>`;
            });
        html += `</select>`;
        return html;
    }

    cursoSelect.addEventListener('change', () => {
        const cursoId = cursoSelect.value;
        filteredTurmasByCurso = allTurmas.filter(t => t.cursoId?._id === cursoId);
        filteredGradesByCurso = allGrades.filter(g => g.cursoId?._id === cursoId);

        const periodosUnicos = [...new Set(filteredTurmasByCurso.map(t => t.periodoLetivo))];
        populateDropdown(periodoLetivoSelect, periodosUnicos.map(p => ({ nome: p, _id: p })), 'Selecione o Período', 'nome', '_id');

        turmaSelect.innerHTML = '<option selected disabled value="">Selecione o Período primeiro</option>';
        turmaSelect.disabled = true;

        populateDropdown(gradeSelect, filteredGradesByCurso, 'Selecione a Grade');

        saveAtribuicaoBtn.style.display = 'block';
        saveChangesBtn.style.display = 'none';
        deleteAtribuicaoBtn.style.display = 'none';
        atribuicaoContainer.style.display = 'none';
    });

    periodoLetivoSelect.addEventListener('change', () => {
        const periodoLetivoTurma = periodoLetivoSelect.value;
        const turmasPorPeriodo = filteredTurmasByCurso.filter(t => t.periodoLetivo.toString() === periodoLetivoTurma.toString());
        populateDropdown(turmaSelect, turmasPorPeriodo, 'Selecione a Turma');
    });

    async function checkExistingAtribuicao(turmaId, gradeId) {
        try {
            const result = await fetchData(`horarios?turmaId=${turmaId}&gradeId=${gradeId}`);
            return (result && result.length > 0) ? result[0] : null;
        } catch (error) {
            console.error('Erro ao verificar atribuição existente:', error);
            return null;
        }
    }

    // ===================================================================
    // FUNÇÃO RENDERATRIBUICAOTABLE REFATORADA
    // ===================================================================
    function renderAtribuicaoTable(grade, professores, atribuicao = null) {
        atribuicaoTableBody.innerHTML = '';
        if (grade?.disciplinas?.length) {
            grade.disciplinas.forEach(discObject => {
                const disciplina = discObject.disciplinaId;
                if (!disciplina?._id) return;

                // Encontra a atribuição existente para esta disciplina
                const professorAtribuido = atribuicao?.atribuicoes.find(a => a.disciplinaId?._id?.toString() === disciplina._id.toString());
                
                // Extrai o ID do professor atribuído de forma segura (usando optional chaining)
                const selectedProfessorId = professorAtribuido?.professorId?._id || null;

                // Sempre cria o dropdown, passando o ID do professor selecionado (se houver)
                const professorCellHtml = createProfessorDropdown(
                    professores,
                    disciplina.areaDisciplina,
                    selectedProfessorId
                );

                const row = atribuicaoTableBody.insertRow();
                row.dataset.disciplinaId = disciplina._id;
                row.innerHTML = `
                    <td>${disciplina.nome}</td>
                    <td>${discObject.aulasSemanais}</td>
                    <td>${disciplina.areaDisciplina}</td>
                    <td>${professorCellHtml}</td>
                `;
            });
            atribuicaoContainer.style.display = 'block';
        } else {
            showMessage('A grade selecionada não possui disciplinas cadastradas.', 'warning');
            atribuicaoContainer.style.display = 'none';
        }
    }

    // ===================================================================
    // REMOVIDO: Event listener para o botão "Alterar"
    // Este bloco de código não é mais necessário, pois a alteração é
    // feita diretamente no dropdown que agora é sempre visível.
    // ===================================================================
    // atribuicaoTableBody.addEventListener('click', e => { ... });

    formSelecaoHorario.addEventListener('submit', async e => {
        e.preventDefault();
        const gradeId = gradeSelect.value;
        const turmaId = turmaSelect.value;

        try {
            currentGrade = await fetchData(`grades/${gradeId}`);
            currentTurma = allTurmas.find(t => t._id === turmaId);

            if (!currentGrade || !currentTurma) {
                showMessage('Grade ou Turma não encontrada.', 'danger');
                return;
            }

            const existingAtribuicao = await checkExistingAtribuicao(turmaId, gradeId);
            existingAtribuicaoId = existingAtribuicao?._id || null;

            // Chama a função refatorada
            renderAtribuicaoTable(currentGrade, allProfessores, existingAtribuicao);

            saveAtribuicaoBtn.style.display = existingAtribuicao ? 'none' : 'block';
            saveChangesBtn.style.display = existingAtribuicao ? 'block' : 'none';
            deleteAtribuicaoBtn.style.display = existingAtribuicao ? 'block' : 'none';

            infoGradeTurmaSpan.textContent = `Turma: ${currentTurma.nome} | Grade: ${currentGrade.nome}`;
            showMessage(existingAtribuicao ? 'Horário existente carregado.' : 'Nenhum horário encontrado. Crie um novo.', 'info');
        } catch (error) {
            showMessage(`Erro ao carregar a grade: ${error.message}`, 'danger');
            console.error(error);
        }
    });

    async function salvarAtribuicao(url, method) {
        const atribuicoes = [];
        let isValid = true;

        // A lógica de salvar continua funcionando, pois lê o valor do ".professor-select"
        Array.from(atribuicaoTableBody.querySelectorAll('tr')).forEach(row => {
            const disciplinaId = row.dataset.disciplinaId;
            const professorId = row.querySelector('.professor-select')?.value;
            if (!disciplinaId || !professorId) {
                isValid = false;
            } else {
                atribuicoes.push({ disciplinaId, professorId });
            }
        });

        if (!isValid) {
            showMessage('Todas as disciplinas devem ter um professor atribuído.', 'warning');
            return;
        }

        const data = (method === 'POST')
            ? { gradeId: currentGrade._id, turmaId: currentTurma._id, atribuicoes }
            : { atribuicoes };

        try {
            const res = await fetchData(url, method, data);
            showMessage(method === 'POST' ? 'Horário salvo com sucesso!' : 'Horário atualizado com sucesso!', 'success');
            existingAtribuicaoId = res._id;

            // Recarrega a visualização para garantir consistência
            // Usando dispatchEvent para simular o submit do formulário e recarregar os dados
            formSelecaoHorario.dispatchEvent(new Event('submit', { cancelable: true }));
        } catch (error) {
            showMessage(`Erro ao salvar: ${error.message}`, 'danger');
        }
    }

    saveAtribuicaoBtn.addEventListener('click', () => salvarAtribuicao('horarios', 'POST'));
    
    saveChangesBtn.addEventListener('click', () => {
        if (!existingAtribuicaoId) {
            showMessage('Nenhum horário existente para atualizar.', 'warning');
            return;
        }
        salvarAtribuicao(`horarios/${existingAtribuicaoId}`, 'PUT');
    });

    deleteAtribuicaoBtn.addEventListener('click', async () => {
        if (!existingAtribuicaoId || !confirm('Tem certeza que deseja excluir este horário?')) return;
        try {
            await fetchData(`horarios/${existingAtribuicaoId}`, 'DELETE');
            showMessage('Horário escolar excluído com sucesso!', 'success');
            atribuicaoContainer.style.display = 'none';
            existingAtribuicaoId = null;
            // Limpa a tabela e reseta os botões para o estado inicial
            atribuicaoTableBody.innerHTML = '';
            infoGradeTurmaSpan.textContent = '';
            saveAtribuicaoBtn.style.display = 'block';
            saveChangesBtn.style.display = 'none';
            deleteAtribuicaoBtn.style.display = 'none';
        } catch (error) {
            showMessage(`Erro ao excluir o horário escolar: ${error.message}`, 'danger');
        }
    });

    loadInitialData();
});
