// Arquivo base ou em cada script JS
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Função genérica para fazer requisições à API.
 * @param {string} endpoint - O endpoint da API (ex: 'disciplinas').
 * @param {string} method - O método HTTP (GET, POST, PUT, PATCH, DELETE).
 * @param {object} data - Os dados a serem enviados no corpo da requisição (para POST/PUT/PATCH).
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
            // Tenta obter a mensagem de erro do backend ou usa uma mensagem padrão
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro na requisição: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na operação:', error);
        // REMOVIDO: alert(`Erro: ${error.message}`);
        // O alerta agora é tratado nas funções que chamam fetchData para evitar duplicação.
        throw error; // Re-lança o erro para ser tratado pela função chamadora
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Obtenção dos elementos do DOM
    const formCadastroDisciplina = document.getElementById('formCadastroDisciplina');
    const nomeDisciplinaInput = document.getElementById('nomeDisciplina');
    const codigoDisciplinaInput = document.getElementById('codigoDisciplina');
    const cargaHorariaTotalHorasInput = document.getElementById('cargaHorariaTotalHoras');
    const areaDisciplinaInput = document.getElementById('areaDisciplina'); // Elemento para a área da disciplina
    const disciplinasTableBody = document.querySelector('#formCadastroDisciplina + h3 + .table-responsive tbody');
    const btnSalvarDisciplina = document.getElementById('btnSalvarDisciplina');
    const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');

    let editingId = null; // Variável para armazenar o ID da disciplina em edição

    /**
     * Gera um código de pré-visualização para a disciplina.
     * @param {string} nome - O nome da disciplina.
     * @returns {string} O código gerado.
     */
    function generatePreviewCode(nome) {
        if (!nome || nome.length < 4) return '';
        // Gerar um código mais robusto para evitar colisões
        return nome.substring(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }

    // Event listener para gerar o código da disciplina automaticamente ao digitar o nome (apenas na criação)
    nomeDisciplinaInput.addEventListener('input', () => {
        if (!editingId) { // Só gera o código se NÃO estiver em modo de edição
            codigoDisciplinaInput.value = generatePreviewCode(nomeDisciplinaInput.value);
        }
    });

    /**
     * Carrega e exibe a lista de disciplinas na tabela.
     */
    async function loadDisciplinas() {
        try {
            const disciplinas = await fetchData('disciplinas');
            disciplinasTableBody.innerHTML = ''; // Limpa o corpo da tabela

            if (disciplinas && disciplinas.length > 0) {
                disciplinas.forEach(disciplina => {
                    const row = disciplinasTableBody.insertRow();
                    row.insertCell().textContent = disciplina.nome;
                    row.insertCell().textContent = disciplina.codigo;
                    row.insertCell().textContent = `${disciplina.cargaHorariaTotalHoras}h`;
                    row.insertCell().textContent = disciplina.areaDisciplina || 'N/A'; // Exibe a área da disciplina
                    row.insertCell().innerHTML = `
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editDisciplina('${disciplina._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteDisciplina('${disciplina._id}')" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    `;
                });
            } else {
                disciplinasTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma disciplina cadastrada.</td></tr>'; // colspan ajustado para 5 colunas
            }
        } catch (error) {
            console.error('Erro ao carregar disciplinas:', error);
            disciplinasTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar disciplinas.</td></tr>'; // colspan ajustado
            alert(`Erro ao carregar disciplinas: ${error.message}`); // Alerta o usuário sobre o erro
        }
    }

    // Event listener para o envio do formulário (cadastro ou atualização)
    formCadastroDisciplina.addEventListener('submit', async (event) => {
        event.preventDefault(); // Previne o comportamento padrão de recarregar a página

        const disciplinaData = {
            nome: nomeDisciplinaInput.value,
            cargaHorariaTotalHoras: parseInt(cargaHorariaTotalHorasInput.value),
            areaDisciplina: areaDisciplinaInput.value // Adicionando o campo areaDisciplina
        };

        // Se estiver em modo de criação, adicione o código gerado.
        // Se estiver editando, o código não será alterado a menos que o backend permita ou exija.
        if (!editingId) {
            disciplinaData.codigo = codigoDisciplinaInput.value;
        }

        try {
            if (editingId) {
                // Requisição PATCH para atualizar uma disciplina existente
                await fetchData(`disciplinas/${editingId}`, 'PATCH', disciplinaData);
                alert('Disciplina atualizada com sucesso!');
            } else {
                // Requisição POST para cadastrar uma nova disciplina
                await fetchData('disciplinas', 'POST', disciplinaData);
                alert('Disciplina cadastrada com sucesso!');
            }

            resetForm(); // Limpa o formulário e reseta o estado
            await loadDisciplinas(); // Recarrega a lista de disciplinas
        } catch (error) {
            console.error('Erro ao salvar disciplina:', error);
            alert(`Erro ao salvar disciplina: ${error.message}`); // Alerta o usuário sobre o erro
        }
    });

    /**
     * Reseta o formulário para o estado inicial de cadastro.
     */
    function resetForm() {
        formCadastroDisciplina.reset(); // Limpa todos os campos do formulário
        codigoDisciplinaInput.value = ''; // Garante que o campo de código seja limpo
        editingId = null; // Reseta o ID de edição
        btnSalvarDisciplina.innerHTML = '<i class="fas fa-save me-2"></i> Cadastrar Disciplina'; // Altera texto do botão
        btnSalvarDisciplina.classList.remove('btn-success'); // Remove classe de sucesso (edição)
        btnSalvarDisciplina.classList.add('btn-warning'); // Adiciona classe de aviso (cadastro)
        btnCancelarEdicao.classList.add('d-none'); // Esconde o botão de cancelar edição
    }

    /**
     * Preenche o formulário com os dados de uma disciplina para edição.
     * Esta função é global (window.editDisciplina) para ser acessível via onclick na tabela.
     * @param {string} id - O ID da disciplina a ser editada.
     */
    window.editDisciplina = async (id) => {
        try {
            const disciplina = await fetchData(`disciplinas/${id}`);
            nomeDisciplinaInput.value = disciplina.nome;
            codigoDisciplinaInput.value = disciplina.codigo; // Exibe o código existente da disciplina
            cargaHorariaTotalHorasInput.value = disciplina.cargaHorariaTotalHoras;
            areaDisciplinaInput.value = disciplina.areaDisciplina || ''; // Preenche a área da disciplina

            editingId = disciplina._id; // Define o ID da disciplina que está sendo editada
            btnSalvarDisciplina.innerHTML = '<i class="fas fa-save me-2"></i> Atualizar Disciplina'; // Altera texto do botão
            btnSalvarDisciplina.classList.remove('btn-warning'); // Remove classe de aviso
            btnSalvarDisciplina.classList.add('btn-success'); // Adiciona classe de sucesso
            btnCancelarEdicao.classList.remove('d-none'); // Mostra o botão de cancelar edição
        } catch (error) {
            console.error('Erro ao carregar disciplina para edição:', error);
            alert(`Erro ao carregar disciplina para edição: ${error.message}`); // Alerta o usuário sobre o erro
        }
    };

    /**
     * Exclui uma disciplina após confirmação.
     * Esta função é global (window.deleteDisciplina) para ser acessível via onclick na tabela.
     * @param {string} id - O ID da disciplina a ser excluída.
     */
    window.deleteDisciplina = async (id) => {
        if (confirm('Tem certeza que deseja excluir esta disciplina? Esta ação é irreversível.')) {
            try {
                await fetchData(`disciplinas/${id}`, 'DELETE');
                alert('Disciplina excluída com sucesso!');
                await loadDisciplinas(); // Recarrega a lista após a exclusão
            } catch (error) {
                console.error('Erro ao excluir disciplina:', error);
                alert(`Erro ao excluir disciplina: ${error.message}`); // Alerta o usuário sobre o erro
            }
        }
    };

    // Event listener para o botão de cancelar edição
    btnCancelarEdicao.addEventListener('click', () => {
        resetForm(); // Volta o formulário para o estado de cadastro
    });

    // Carrega as disciplinas ao iniciar a página
    await loadDisciplinas();
});