const API_BASE_URL = 'http://localhost:3000/api';

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
        console.error('Erro na operação fetchData:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const formAtribuirCargaHoraria = document.getElementById('formAtribuirCargaHoraria');
    const periodoLetivoSelect = document.getElementById('periodoLetivoAtribuicao');
    const professorSelect = document.getElementById('professorCH');
    const cursoSelect = document.getElementById('cursoCH');
    const disciplinaSelect = document.getElementById('disciplinaCH');
    const turmaSelect = document.getElementById('turmaCH');
    const quantAulasSemanaInput = document.getElementById('quantsemanalaulas');
    const duracaoAulaMinutosInput = document.getElementById('duracaoAulaMinutos');
    const cargasHorariasTableBody = document.getElementById('cargasHorariasTableBody');
    const cargaHorariaTotalProfessorDiv = document.getElementById('cargaHorariaTotalProfessor');
    const totalCHMinutosSpan = document.getElementById('totalCHMinutos');
    const totalCHHorasSpan = document.getElementById('totalCHHoras');
    const submitButton = formAtribuirCargaHoraria.querySelector('button[type="submit"]');

    let allCargasHorarias = [];
    let allTurmas = [];  // Guardar todas as turmas para filtro

    const showMessage = (message, type = 'info') => {
        const alertPlaceholder = document.getElementById('liveAlertPlaceholder') || (() => {
            const div = document.createElement('div');
            div.id = 'liveAlertPlaceholder';
            div.className = 'position-fixed top-0 start-50 translate-middle-x p-3';
            div.style.zIndex = 1050;
            document.body.appendChild(div);
            return div;
        })();

        const wrapper = document.createElement('div');
        wrapper.innerHTML = [
            `<div class="alert alert-${type} alert-dismissible fade show" role="alert">`,
            `   <div>${message}</div>`,
            '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
            '</div>'
        ].join('');

        alertPlaceholder.append(wrapper);
        setTimeout(() => wrapper.remove(), 5000);
    };

    function formatMinutesToHoursMinutes(totalMinutes) {
        if (isNaN(totalMinutes) || totalMinutes < 0) return '0h 0min';
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}min`;
    }

    async function populateDropdown(selectElement, endpoint, defaultOptionText, textKey = 'nome', valueKey = '_id') {
        try {
            const items = await fetchData(endpoint);
            selectElement.innerHTML = `<option selected disabled value="">${defaultOptionText}</option>`;

            items.forEach(item => {
                const option = document.createElement('option');
                const value = item[valueKey]?.$oid || item[valueKey];
                const text = item[textKey];
                option.value = value;
                option.textContent = text;
                selectElement.appendChild(option);
            });

            return items;
        } catch (error) {
            showMessage(
                `Erro ao carregar ${defaultOptionText.toLowerCase().replace('selecione o ', '')}: ${error.message}`,
                'danger'
            );
            console.error(error);
            return [];
        }
    }

    async function populatePeriodoLetivoFromTurmas() {
        try {
            const turmas = await fetchData('turmas');
            const periodosUnicos = [...new Set(turmas.map(turma => turma.periodoLetivo))].filter(Boolean);
            periodosUnicos.sort((a, b) => b.localeCompare(a));

            periodoLetivoSelect.innerHTML = '<option selected disabled value="">Selecione o período letivo</option>';
            periodosUnicos.forEach(periodo => {
                const option = document.createElement('option');
                option.value = periodo;
                option.textContent = periodo;
                periodoLetivoSelect.appendChild(option);
            });
        } catch (error) {
            showMessage(`Erro ao carregar períodos letivos: ${error.message}`, 'danger');
            console.error(error);
        }
    }

    // Popula turmas filtradas pelo curso selecionado
    function populateTurmasByCurso(cursoId) {
        const turmasFiltradas = allTurmas.filter(turma => {
            if (!turma.cursoId) return false;
            const id = typeof turma.cursoId === 'object' ? (turma.cursoId._id || turma.cursoId) : turma.cursoId;
            return id === cursoId;
        });

        turmaSelect.innerHTML = `<option selected disabled value="">Selecione a turma</option>`;
        turmasFiltradas.forEach(turma => {
            const option = document.createElement('option');
            option.value = turma._id || turma.id;
            option.textContent = turma.nome || 'Sem nome';
            turmaSelect.appendChild(option);
        });

        if (turmasFiltradas.length === 0) {
            turmaSelect.innerHTML = `<option disabled value="">Nenhuma turma para o curso selecionado</option>`;
        }
    }

    async function loadAllDropdowns() {
        await populatePeriodoLetivoFromTurmas();
        await populateDropdown(professorSelect, 'professores', 'Selecione o professor', 'nome');
        await populateDropdown(cursoSelect, 'cursos', 'Selecione o curso', 'nome');
        await populateDropdown(disciplinaSelect, 'disciplinas', 'Selecione a disciplina', 'nome');

        // Busca todas as turmas mas NÃO popula o select diretamente
        allTurmas = await fetchData('turmas');
        turmaSelect.innerHTML = `<option selected disabled value="">Selecione o curso primeiro</option>`;
    }

    const updateCargaHorariaTotalProfessor = () => {
        const selectedProfessorId = professorSelect.value;
        if (!selectedProfessorId) {
            cargaHorariaTotalProfessorDiv.style.display = 'none';
            return;
        }

        const professorCargas = allCargasHorarias.filter(c =>
            c.professorId && typeof c.professorId === 'object' && c.professorId._id === selectedProfessorId
        );

        let totalMinutos = 0;
        professorCargas.forEach(c => {
            if (c.cargaHorariaSemanalMinutosCalculada !== undefined) {
                totalMinutos += c.cargaHorariaSemanalMinutosCalculada;
            }
        });

        totalCHMinutosSpan.textContent = `${totalMinutos} minutos`;
        totalCHHorasSpan.textContent = formatMinutesToHoursMinutes(totalMinutos);
        cargaHorariaTotalProfessorDiv.style.display = 'block';
    };

    const renderCargasHorariasTable = () => {
        cargasHorariasTableBody.innerHTML = '';

        const safeGetNome = obj => obj && typeof obj === 'object' && obj.nome ? obj.nome: '';

        const sortedCargas = [...allCargasHorarias].sort((a, b) => {
            return safeGetNome(a.professorId).localeCompare(safeGetNome(b.professorId));
        });

        if (sortedCargas.length === 0) {
            cargasHorariasTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhuma carga horária atribuída ainda.</td></tr>';
            return;
        }

        sortedCargas.forEach(carga => {
            const row = cargasHorariasTableBody.insertRow();
            row.dataset.id = carga._id;

            row.innerHTML = `
                <td>${safeGetNome(carga.professorId) || 'N/A'}</td>
                <td>${safeGetNome(carga.disciplinaId) || 'N/A'}</td>
                <td>${safeGetNome(carga.turmaId) || 'N/A'}</td>
                <td>${safeGetNome(carga.cursoId) || 'N/A'}</td>
                <td>${carga.cargaHorariaSemanalAulasAtribuida}</td>
                <td>${carga.duracaoAulaMinutosAtribuida}</td>
                <td>${formatMinutesToHoursMinutes(carga.cargaHorariaSemanalMinutosCalculada)} (${carga.cargaHorariaSemanalMinutosCalculada || 0} min)</td>
                <td>
                    <button class="btn btn-sm btn-info edit-btn" data-id="${carga._id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${carga._id}" title="Excluir"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });

        addTableEventListeners();
    };

    const addTableEventListeners = () => {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.onclick = (e) => handleEdit(e.currentTarget.dataset.id);
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.onclick = (e) => handleDelete(e.currentTarget.dataset.id);
        });
    };

    const loadAllCargasHorarias = async () => {
        try {
            const cargas = await fetchData('cargas-horarias');
            allCargasHorarias = cargas;
            renderCargasHorariasTable();
            updateCargaHorariaTotalProfessor();
        } catch (error) {
            showMessage(`Erro ao carregar as cargas horárias: ${error.message}`, 'danger');
            console.error(error);
        }
    };

    // Atualiza turmas quando o curso mudar
    cursoSelect.addEventListener('change', () => {
        const selectedCursoId = cursoSelect.value;
        if (selectedCursoId) {
            populateTurmasByCurso(selectedCursoId);
        } else {
            turmaSelect.innerHTML = `<option selected disabled value="">Selecione o curso primeiro</option>`;
        }
    });

    professorSelect.addEventListener('change', updateCargaHorariaTotalProfessor);

    formAtribuirCargaHoraria.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cargaData = {
            professorId: professorSelect.value,
            disciplinaId: disciplinaSelect.value,
            turmaId: turmaSelect.value,
            cursoId: cursoSelect.value,
            periodoLetivoAtribuicao: periodoLetivoSelect.value,
            cargaHorariaSemanalAulasAtribuida: parseInt(quantAulasSemanaInput.value),
            duracaoAulaMinutosAtribuida: parseInt(duracaoAulaMinutosInput.value),
        };

        const editingId = formAtribuirCargaHoraria.dataset.editingId;
        let endpoint = 'cargas-horarias';
        let method = 'POST';

        if (editingId) {
            endpoint = `cargas-horarias/${editingId}`;
            method = 'PATCH';
        }

        try {
            await fetchData(endpoint, method, cargaData);
            showMessage(`Carga horária ${editingId ? 'atualizada' : 'atribuída'} com sucesso!`, 'success');

            formAtribuirCargaHoraria.reset();
            delete formAtribuirCargaHoraria.dataset.editingId;
            submitButton.textContent = 'Salvar Atribuição';
            submitButton.classList.remove('btn-warning');
            submitButton.classList.add('btn-primary');

            const cancelBtn = document.getElementById('cancelEditBtn');
            if (cancelBtn) cancelBtn.remove();

            await loadAllCargasHorarias();
        } catch (error) {
            showMessage(`Erro ao ${editingId ? 'atualizar' : 'atribuir'} carga horária: ${error.message}`, 'danger');
            console.error(error);
        }
    });

    window.handleEdit = async (id) => {
        try {
            const cargaToEdit = await fetchData(`cargas-horarias/${id}`);

            periodoLetivoSelect.value = cargaToEdit.periodoLetivoAtribuicao;
            professorSelect.value = cargaToEdit.professorId?._id || '';
            cursoSelect.value = cargaToEdit.cursoId?._id || '';
            
            // Atualiza turmas para o curso da carga e seleciona a turma correta
            if(cursoSelect.value) {
                populateTurmasByCurso(cursoSelect.value);
            }
            turmaSelect.value = cargaToEdit.turmaId?._id || '';

            disciplinaSelect.value = cargaToEdit.disciplinaId?._id || '';

            quantAulasSemanaInput.value = cargaToEdit.cargaHorariaSemanalAulasAtribuida;
            duracaoAulaMinutosInput.value = cargaToEdit.duracaoAulaMinutosAtribuida;

            formAtribuirCargaHoraria.dataset.editingId = id;
            submitButton.textContent = 'Atualizar Atribuição';
            submitButton.classList.remove('btn-primary');
            submitButton.classList.add('btn-warning');

            let cancelBtn = document.getElementById('cancelEditBtn');
            if (!cancelBtn) {
                cancelBtn = document.createElement('button');
                cancelBtn.id = 'cancelEditBtn';
                cancelBtn.type = 'button';
                cancelBtn.className = 'btn btn-secondary ms-2';
                cancelBtn.innerHTML = '<i class="fas fa-times me-2"></i> Cancelar Edição';
                formAtribuirCargaHoraria.appendChild(cancelBtn);
                cancelBtn.addEventListener('click', () => {
                    formAtribuirCargaHoraria.reset();
                    delete formAtribuirCargaHoraria.dataset.editingId;
                    submitButton.textContent = 'Salvar Atribuição';
                    submitButton.classList.remove('btn-warning');
                    submitButton.classList.add('btn-primary');
                    cancelBtn.remove();
                    updateCargaHorariaTotalProfessor();
                });
            }

            showMessage(`Modo de edição ativado para carga horária ID: ${id}.`, 'info');

        } catch (error) {
            showMessage(`Erro ao carregar dados para edição: ${error.message}`, 'danger');
            console.error(error);
        }
    };

    window.handleDelete = async (id) => {
        if (confirm('Tem certeza que deseja excluir esta atribuição de carga horária? Esta ação é irreversível.')) {
            try {
                await fetchData(`cargas-horarias/${id}`, 'DELETE');
                showMessage('Carga horária excluída com sucesso!', 'success');
                await loadAllCargasHorarias();
            } catch (error) {
                showMessage(`Erro ao excluir carga horária: ${error.message}`, 'danger');
                console.error(error);
            }
        }
    };

    await loadAllDropdowns();
    await loadAllCargasHorarias();
});

