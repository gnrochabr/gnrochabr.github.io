const API_BASE_URL = 'http://localhost:3000/api';

// Função utilitária para capitalizar a primeira letra
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function fetchData(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(url, options);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `Erro na requisição: ${response.statusText}`);
        }
        return responseData;
    } catch (error) {
        alert(`Erro: ${error.message}`);
        throw error;
    }
}

// Variáveis globais dos elementos do formulário e botões
const form = document.getElementById('formCadastroCurso');
const nome = document.getElementById('nomeCurso');
const codigo = document.getElementById('codigoCurso');
const modalidade = document.getElementById('modalidadeOfertaCurso');
const grau = document.getElementById('grauCurso');
const tabela = document.querySelector('tbody');
const btnSubmit = form.querySelector('button[type="submit"]');
const btnCancelar = document.getElementById('cancelarEdicao');

window.editCurso = async (id) => {
    try {
        const curso = await fetchData(`cursos/${id}`);
        nome.value = curso.nome;
        codigo.value = curso.codigo;
        modalidade.value = curso.modalidade;
        grau.value = curso.grau;
        form.dataset.editingId = curso._id;
        btnSubmit.textContent = 'Alterar Curso';
        btnCancelar.style.display = 'inline-block';
    } catch (error) {
        console.error('Erro ao carregar curso para edição:', error);
    }
};

window.deleteCurso = async (id) => {
    if (confirm('Tem certeza que deseja excluir este curso?')) {
        try {
            await fetchData(`cursos/${id}`, 'DELETE');
            alert('Curso excluído com sucesso!');
            loadCursos();
        } catch (error) {
            console.error('Erro ao excluir curso:', error);
        }
    }
};

async function loadCursos() {
    try {
        const cursos = await fetchData('cursos');
        tabela.innerHTML = '';
        cursos.forEach(curso => {
            const row = tabela.insertRow();
            row.innerHTML = `
                <td>${curso.nome}</td>
                <td>${curso.codigo}</td>
                <td>${curso.modalidade}</td>
                <td>${curso.grau}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editCurso('${curso._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCurso('${curso._id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nome: capitalize(nome.value.trim()),
            codigo: codigo.value.trim().toUpperCase(),
            modalidade: modalidade.value,
            grau: grau.value
        };

        try {
            if (form.dataset.editingId) {
                await fetchData(`cursos/${form.dataset.editingId}`, 'PATCH', data);
                alert('Curso atualizado com sucesso!');
                btnSubmit.textContent = 'Cadastrar Curso';
                btnCancelar.style.display = 'none';
                form.dataset.editingId = '';
            } else {
                await fetchData('cursos', 'POST', data);
                alert('Curso cadastrado com sucesso!');
            }
            form.reset();
            loadCursos();
        } catch (error) {
            console.error('Erro ao salvar curso:', error);
        }
    });

    btnCancelar.addEventListener('click', () => {
        form.reset();
        form.dataset.editingId = '';
        btnSubmit.textContent = 'Cadastrar Curso';
        btnCancelar.style.display = 'none';
    });

    loadCursos();
});
