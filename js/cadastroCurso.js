const API_BASE_URL = 'https://serversgch-nv.onrender.com/api';

let sortColumnCursos = 'nome'; 
let sortDirectionCursos = 'asc'; 

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

const form = document.getElementById('formCadastroCurso');
const nome = document.getElementById('nomeCurso');
const codigo = document.getElementById('codigoCurso');
const modalidade = document.getElementById('modalidadeOfertaCurso');
const grau = document.getElementById('grauCurso');
const serializacao = document.getElementById('serializacaoOfertaCurso'); // Adicionada a variável para o novo campo
const tabela = document.querySelector('tbody');
const btnSubmit = form.querySelector('button[type="submit"]');
const btnCancelar = document.getElementById('cancelarEdicao');
const btnExportarXLS = document.getElementById('btnExportarXLS');
const btnExportarODP = document.getElementById('btnExportarODP');
let allCursos = [];

window.editCurso = async (id) => {
    try {
        const curso = await fetchData(`cursos/${id}`);
        nome.value = curso.nome;
        codigo.value = curso.codigo;
        modalidade.value = curso.modalidade;
        grau.value = curso.grau;
        serializacao.value = curso.serializacao; // Adicionado para carregar o valor na edição
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
        allCursos = cursos;
        tabela.innerHTML = '';

        if (allCursos && allCursos.length > 0) {
            allCursos.sort((a, b) => {
                const aValue = a[sortColumnCursos] || '';
                const bValue = b[sortColumnCursos] || '';
                if (sortDirectionCursos === 'asc') {
                    return aValue.localeCompare(bValue);
                } else {
                    return bValue.localeCompare(aValue);
                }
            });

            allCursos.forEach(curso => {
                const row = tabela.insertRow();
                row.innerHTML = `
                    <td>${curso.nome}</td>
                    <td>${curso.codigo}</td>
                    <td>${curso.modalidade}</td>
                    <td>${curso.serializacao}</td>
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
        } else {
            tabela.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum curso cadastrado.</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        tabela.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar cursos.</td></tr>';
    }
}

function sortTableCursos(column) {
    if (sortColumnCursos === column) {
        sortDirectionCursos = sortDirectionCursos === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumnCursos = column;
        sortDirectionCursos = 'asc';
    }
    loadCursos();
}

function exportarParaXLSX() {
    if (allCursos.length === 0) {
        alert('Não há dados de cursos para exportar.');
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(allCursos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cursos Cadastrados");
    XLSX.writeFile(workbook, "cursos_cadastrados.xlsx");
}

function exportarParaODS() {
    if (allCursos.length === 0) {
        alert('Não há dados de cursos para exportar.');
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(allCursos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cursos Cadastrados");
    XLSX.writeFile(workbook, "cursos_cadastrados.ods");
}

document.addEventListener('DOMContentLoaded', () => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nome: capitalize(nome.value.trim()),
            codigo: codigo.value.trim().toUpperCase(),
            modalidade: modalidade.value,
            grau: grau.value,
            serializacao: serializacao.value // Adicionado para enviar a nova propriedade
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

    document.querySelectorAll('#formCadastroCurso + h3 + .table-responsive th.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            if (column) {
                sortTableCursos(column);
            }
        });
    });

    btnExportarXLS.addEventListener('click', exportarParaXLSX);
    btnExportarODP.addEventListener('click', exportarParaODS);

    loadCursos();
});
