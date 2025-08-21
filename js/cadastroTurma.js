const API_BASE_URL = 'https://serversgchnv.onrender.com';

// Variáveis de estado para ordenação
let sortColumnTurmas = 'nome'; // Coluna de ordenação padrão
let sortDirectionTurmas = 'asc'; // Direção de ordenação padrão

async function fetchData(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) options.body = JSON.stringify(data);

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
    const form = document.getElementById('formCadastroTurma');
    const nomeTurmaInput = document.getElementById('nomeTurma');
    const cursoTurmaSelect = document.getElementById('cursoTurma');
    const modalidadeTurmaSelect = document.getElementById('modalidadeTurma');
    const periodoLetivoTurmaInput = document.getElementById('periodoLetivoTurma');
    const turnoTurmaSelect = document.getElementById('turnoTurma');
    const turmasTableBody = document.querySelector('.table-responsive tbody');
    const btnSalvarTurma = document.getElementById('btnSalvarTurma');
    const btnCancelarEdicaoTurma = document.getElementById('btnCancelarEdicaoTurma');
    
    const btnExportarXLS = document.getElementById('btnExportarXLS');
    const btnExportarODP = document.getElementById('btnExportarODP');

    let allCursos = [];
    let allTurmas = [];
    let editingId = null;

    function gerarNomeTurma() {
        if (editingId) return;

        const periodo = periodoLetivoTurmaInput.value.trim();
        const cursoId = cursoTurmaSelect.value;
        const turno = turnoTurmaSelect.value;

        let codigoCurso = '';
        if (cursoId && allCursos.length) {
            const curso = allCursos.find(c => c._id === cursoId);
            if (curso) codigoCurso = curso.codigo || '';
        }

        const primeiraLetraTurno = turno ? turno.charAt(0).toUpperCase() : '';

        if (periodo && codigoCurso && primeiraLetraTurno) {
            nomeTurmaInput.value = `${periodo}.${codigoCurso}.${primeiraLetraTurno}`;
        } else {
            nomeTurmaInput.value = '';
        }
    }

    async function populateCursos() {
        try {
            const cursos = await fetchData('cursos');
            allCursos = cursos;
            cursoTurmaSelect.innerHTML = '<option selected disabled value="">Selecione o curso</option>';
            cursos.forEach(curso => {
                const option = document.createElement('option');
                option.value = curso._id;
                option.textContent = curso.nome;
                cursoTurmaSelect.appendChild(option);
            });
        } catch (error) {
            alert('Erro ao carregar cursos de lotação.');
            console.error(error);
        }
    }

    async function loadTurmas() {
        try {
            const turmas = await fetchData('turmas');
            allTurmas = turmas;
            turmasTableBody.innerHTML = '';

            if (!allTurmas.length) {
                turmasTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma turma cadastrada.</td></tr>';
                return;
            }

            // Ordenar os dados com base na coluna e direção atuais
            allTurmas.sort((a, b) => {
                let aValue = a[sortColumnTurmas];
                let bValue = b[sortColumnTurmas];

                if (sortColumnTurmas === 'cursoId') {
                    aValue = a.cursoId ? a.cursoId.nome : '';
                    bValue = b.cursoId ? b.cursoId.nome : '';
                }

                if (sortDirectionTurmas === 'asc') {
                    return (aValue || '').localeCompare(bValue || '');
                } else {
                    return (bValue || '').localeCompare(aValue || '');
                }
            });

            allTurmas.forEach(turma => {
                const row = turmasTableBody.insertRow();
                row.insertCell().textContent = turma.nome;
                row.insertCell().textContent = turma.cursoId?.nome || 'N/A';
                row.insertCell().textContent = turma.modalidade;
                row.insertCell().textContent = turma.periodoLetivo;
                row.insertCell().textContent = turma.turno;
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button class="btn btn-sm btn-outline-primary me-1" title="Editar" onclick="editTurma('${turma._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" title="Excluir" onclick="deleteTurma('${turma._id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
            });
        } catch (error) {
            turmasTableBody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Erro ao carregar turmas.</td></tr>`;
            alert(`Erro ao carregar turmas: ${error.message}`);
            console.error(error);
        }
    }

    // Função para lidar com a ordenação da tabela
    function sortTableTurmas(column) {
        if (sortColumnTurmas === column) {
            sortDirectionTurmas = sortDirectionTurmas === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumnTurmas = column;
            sortDirectionTurmas = 'asc';
        }
        loadTurmas();
    }

    function resetForm() {
        form.reset();
        nomeTurmaInput.value = '';
        editingId = null;
        btnSalvarTurma.innerHTML = '<i class="fas fa-save me-2"></i> Cadastrar Turma';
        btnSalvarTurma.classList.remove('btn-success');
        btnSalvarTurma.classList.add('btn-primary');
        btnCancelarEdicaoTurma.classList.add('d-none');
    }

    // Funções para exportação
    function exportarParaXLSX() {
        if (allTurmas.length === 0) {
            alert('Não há dados de turmas para exportar.');
            return;
        }

        const dataForExport = allTurmas.map(turma => ({
            'Nome da Turma': turma.nome,
            'Curso': turma.cursoId?.nome || 'N/A',
            'Modalidade': turma.modalidade,
            'Período Letivo': turma.periodoLetivo,
            'Turno': turma.turno
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Turmas Cadastradas");
        XLSX.writeFile(workbook, "turmas_cadastradas.xlsx");
    }

    function exportarParaODS() {
        if (allTurmas.length === 0) {
            alert('Não há dados de turmas para exportar.');
            return;
        }

        const dataForExport = allTurmas.map(turma => ({
            'Nome da Turma': turma.nome,
            'Curso': turma.cursoId?.nome || 'N/A',
            'Modalidade': turma.modalidade,
            'Período Letivo': turma.periodoLetivo,
            'Turno': turma.turno
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Turmas Cadastradas");
        XLSX.writeFile(workbook, "turmas_cadastradas.ods");
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const turmaData = {
            nome: nomeTurmaInput.value.trim(),
            cursoId: cursoTurmaSelect.value,
            modalidade: modalidadeTurmaSelect.value,
            periodoLetivo: periodoLetivoTurmaInput.value.trim(),
            turno: turnoTurmaSelect.value,
        };

        try {
            if (editingId) {
                await fetchData(`turmas/${editingId}`, 'PATCH', turmaData);
                alert('Turma atualizada com sucesso!');
            } else {
                await fetchData('turmas', 'POST', turmaData);
                alert('Turma cadastrada com sucesso!');
            }
            resetForm();
            await loadTurmas();
        } catch (error) {
            alert(`Erro ao salvar turma: ${error.message}`);
            console.error(error);
        }
    });

    window.editTurma = async (id) => {
        try {
            const turma = await fetchData(`turmas/${id}`);
            cursoTurmaSelect.value = turma.cursoId?._id || turma.cursoId || '';
            modalidadeTurmaSelect.value = turma.modalidade;
            periodoLetivoTurmaInput.value = turma.periodoLetivo;
            turnoTurmaSelect.value = turma.turno;
            nomeTurmaInput.value = turma.nome;

            editingId = turma._id;

            btnSalvarTurma.innerHTML = '<i class="fas fa-save me-2"></i> Atualizar Turma';
            btnSalvarTurma.classList.remove('btn-primary');
            btnSalvarTurma.classList.add('btn-success');
            btnCancelarEdicaoTurma.classList.remove('d-none');
        } catch (error) {
            alert(`Erro ao carregar turma para edição: ${error.message}`);
            console.error(error);
        }
    };

    window.deleteTurma = async (id) => {
        if (confirm('Tem certeza que deseja excluir esta turma? Esta ação é irreversível.')) {
            try {
                await fetchData(`turmas/${id}`, 'DELETE');
                alert('Turma excluída com sucesso!');
                await loadTurmas();
            } catch (error) {
                alert(`Erro ao excluir turma: ${error.message}`);
                console.error(error);
            }
        }
    };

    cursoTurmaSelect.addEventListener('change', gerarNomeTurma);
    periodoLetivoTurmaInput.addEventListener('input', gerarNomeTurma);
    turnoTurmaSelect.addEventListener('change', gerarNomeTurma);

    btnCancelarEdicaoTurma.addEventListener('click', resetForm);

    // Event listeners para os botões de exportação
    btnExportarXLS.addEventListener('click', exportarParaXLSX);
    btnExportarODP.addEventListener('click', exportarParaODS);
    
    // Adiciona os eventos de clique nos cabeçalhos da tabela
    document.querySelectorAll('.table-responsive th.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            if (column) {
                sortTableTurmas(column);
            }
        });
    });


    await populateCursos();
    await loadTurmas();
});
