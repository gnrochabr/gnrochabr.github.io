// Arquivo base ou em cada script JS
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
        console.error('Erro na operação:', error);
        alert(`Erro: ${error.message}`);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const formCadastroProfessor = document.getElementById('formCadastroProfessor');
    const nomeProfessor = document.getElementById('nomeProfessor');
    const siapeProfessor = document.getElementById('siapeProfessor');
    const emailInstitucionalProfessor = document.getElementById('emailInstitucionalProfessor');
    const telefoneProfessor = document.getElementById('telefoneProfessor');
    const titulacaoMaxima = document.getElementById('titulacaoMaxima');
    const cursoLotacao = document.getElementById('cursoLotacao');
    const professoresTableBody = document.querySelector('#formCadastroProfessor + h3 + .table-responsive tbody');
    const btnSalvarProfessor = document.getElementById('btnSalvarProfessor');
    const btnCancelarEdicaoProfessor = document.getElementById('btnCancelarEdicaoProfessor');
    
    const btnExportarXLS = document.getElementById('btnExportarXLS');
    const btnExportarODP = document.getElementById('btnExportarODP');
    
    let editingId = null;
    let allProfessores = [];

    // Função para popular o dropdown de cursos de lotação
    async function populateCursosLotacao() {
        try {
            const cursos = await fetchData('cursos');
            cursoLotacao.innerHTML = '<option selected disabled value="">Selecione o curso de lotação</option>';
            cursos.forEach(curso => {
                const option = document.createElement('option');
                option.value = curso._id;
                option.textContent = curso.nome;
                cursoLotacao.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar cursos para lotação:', error);
            alert('Erro ao carregar cursos de lotação.');
        }
    }

    // Função para carregar e exibir professores
    async function loadProfessores() {
        try {
            const professores = await fetchData('professores');
            allProfessores = professores;
            professoresTableBody.innerHTML = '';
            if (professores && professores.length > 0) {
                professores.forEach(professor => {
                    const row = professoresTableBody.insertRow();
                    row.insertCell().textContent = professor.nome;
                    row.insertCell().textContent = professor.siape;
                    row.insertCell().textContent = professor.emailInstitucional;
                    row.insertCell().textContent = professor.titulacaoMaxima;
                    row.insertCell().textContent = professor.cursoLotacaoId ? professor.cursoLotacaoId.nome : 'N/A';
                    row.insertCell().innerHTML = `
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editProfessor('${professor._id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProfessor('${professor._id}')"><i class="fas fa-trash-alt"></i></button>
                    `;
                });
            } else {
                professoresTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum professor cadastrado.</td></tr>';
            }
        } catch (error) {
            console.error('Erro ao carregar professores:', error);
            professoresTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar professores.</td></tr>';
        }
    }

    // Funções para exportação
    function exportarParaXLSX() {
        if (allProfessores.length === 0) {
            alert('Não há dados de professores para exportar.');
            return;
        }

        const dataForExport = allProfessores.map(professor => ({
            'Nome': professor.nome,
            'SIAPE': professor.siape,
            'Email': professor.emailInstitucional,
            'Telefone': professor.telefone || 'N/A',
            'Titulação': professor.titulacaoMaxima,
            'Curso de Lotação': professor.cursoLotacaoId?.nome || 'N/A'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Professores Cadastrados");
        XLSX.writeFile(workbook, "professores_cadastrados.xlsx");
    }

    function exportarParaODS() {
        if (allProfessores.length === 0) {
            alert('Não há dados de professores para exportar.');
            return;
        }

        const dataForExport = allProfessores.map(professor => ({
            'Nome': professor.nome,
            'SIAPE': professor.siape,
            'Email': professor.emailInstitucional,
            'Telefone': professor.telefone || 'N/A',
            'Titulação': professor.titulacaoMaxima,
            'Curso de Lotação': professor.cursoLotacaoId?.nome || 'N/A'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Professores Cadastrados");
        XLSX.writeFile(workbook, "professores_cadastrados.ods");
    }

    // Função para resetar o formulário
    function resetForm() {
        formCadastroProfessor.reset();
        editingId = null;
        btnSalvarProfessor.innerHTML = '<i class="fas fa-save me-2"></i> Cadastrar Professor';
        btnSalvarProfessor.classList.remove('btn-primary');
        btnSalvarProfessor.classList.add('btn-success');
        btnCancelarEdicaoProfessor.classList.add('d-none');
    }

    // Lógica para adicionar/atualizar professor
    formCadastroProfessor.addEventListener('submit', async (event) => {
        event.preventDefault();
        const professorData = {
            nome: nomeProfessor.value,
            siape: siapeProfessor.value,
            emailInstitucional: emailInstitucionalProfessor.value,
            telefone: telefoneProfessor.value,
            titulacaoMaxima: titulacaoMaxima.value,
            cursoLotacaoId: cursoLotacao.value
        };

        try {
            if (editingId) {
                await fetchData(`professores/${editingId}`, 'PATCH', professorData);
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

    // Funções globais para edição e exclusão (acesíveis do onclick no HTML)
    window.editProfessor = async (id) => {
        try {
            const professor = await fetchData(`professores/${id}`);
            nomeProfessor.value = professor.nome;
            siapeProfessor.value = professor.siape;
            emailInstitucionalProfessor.value = professor.emailInstitucional;
            telefoneProfessor.value = professor.telefone || '';
            titulacaoMaxima.value = professor.titulacaoMaxima;
            cursoLotacao.value = professor.cursoLotacaoId ? professor.cursoLotacaoId._id : '';
            
            editingId = professor._id;
            btnSalvarProfessor.innerHTML = '<i class="fas fa-save me-2"></i> Atualizar Professor';
            btnSalvarProfessor.classList.remove('btn-success');
            btnSalvarProfessor.classList.add('btn-primary');
            btnCancelarEdicaoProfessor.classList.remove('d-none');
        } catch (error) {
            console.error('Erro ao carregar professor para edição:', error);
            alert(`Erro ao carregar professor para edição: ${error.message}`);
        }
    };

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

    btnCancelarEdicaoProfessor.addEventListener('click', resetForm);
    
    // Event listeners para os botões de exportação
    btnExportarXLS.addEventListener('click', exportarParaXLSX);
    btnExportarODP.addEventListener('click', exportarParaODS);

    // Carregar dados iniciais
    await populateCursosLotacao();
    await loadProfessores();
});