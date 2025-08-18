/**
 * @file Script da página de Relatório de Previsão de Carga Horária por Grade.
 * @description Permite ao usuário selecionar grades, visualizar um relatório consolidado e detalhado,
 * e exportar os dados de forma consolidada ou individual por grade.
 * @version 2.7.0 (Resumo Aprimorado)
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. CONSTANTES E CONFIGURAÇÕES
    const API_BASE_URL = 'http://localhost:3000/api';
    const DOM = {
        gradeSelect: document.getElementById('gradeSelect'),
        btnGerar: document.getElementById('btnGerar'),
        resultadoContainer: document.getElementById('resultadoRelatorio'),
        loadingDiv: document.getElementById('loading'),
        resumoBody: document.getElementById('resumoCombinadoBody'),
        accordionGrades: document.getElementById('accordionGrades'),
        btnExportarXLS: document.getElementById('btnExportarXLS'),
        btnExportarODS: document.getElementById('btnExportarODS'),
        alertPlaceholder: document.createElement('div'),
    };
    
    let dadosRelatorioAtual = null;
    
    DOM.btnGerar.parentElement.insertBefore(DOM.alertPlaceholder, DOM.btnGerar.nextSibling);

    // 2. FUNÇÕES DE UTILIDADE
    const fetchData = async (url, options = {}) => {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }
        return response.json();
    };

    const showMessage = (message, type = 'danger') => {
        DOM.alertPlaceholder.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show mt-3" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
    };

    const formatarMinutosParaHHMM = (totalMinutos) => {
        if (isNaN(totalMinutos) || totalMinutos < 0) return '00:00';
        const horas = Math.floor(totalMinutos / 60);
        const minutos = Math.round(totalMinutos % 60);
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    };

    // FUNÇÃO ATUALIZADA para capturar mais detalhes
    const processarDadosParaResumoDetalhado = (detalhesPorGrade) => {
        const areasMap = new Map();

        detalhesPorGrade.forEach(grade => {
            grade.detalhesDisciplina.forEach(disciplina => {
                if (!areasMap.has(disciplina.area)) {
                    areasMap.set(disciplina.area, { disciplinas: [] });
                }
                // MODIFICADO: Captura o nome da grade/curso e o número de aulas da disciplina.
                areasMap.get(disciplina.area).disciplinas.push({
                    nome: disciplina.nome,
                    chSemanalMinutos: disciplina.chSemanalMinutos,
                    aulas: disciplina.aulasSemanais,
                    curso: grade.nomeGrade 
                });
            });
        });

        const resultado = [];
        for (const [area, data] of areasMap.entries()) {
            data.disciplinas.sort((a, b) => a.nome.localeCompare(b.nome));
            const totalMinutos = data.disciplinas.reduce((sum, d) => sum + d.chSemanalMinutos, 0);
            resultado.push({ area, chTotalMinutos: totalMinutos, disciplinas: data.disciplinas });
        }

        return resultado.sort((a, b) => a.area.localeCompare(b.area));
    };

    // 3. FUNÇÕES DE RENDERIZAÇÃO
    // FUNÇÃO ATUALIZADA para exibir os novos detalhes
    const renderResumo = (resumoDetalhado) => {
        DOM.resumoBody.innerHTML = resumoDetalhado.map(areaData => {
            // MODIFICADO: Exibe o nome do curso e o número de aulas.
            const disciplinasHtml = areaData.disciplinas.map(d => `${d.nome} - <strong>${d.curso}</strong>`).join('<br>');
            const chSemanalHtml = areaData.disciplinas.map(d => {
                const textoAulas = d.aulas === 1 ? 'aula' : 'aulas';
                return `${formatarMinutosParaHHMM(d.chSemanalMinutos)} - ${d.aulas} ${textoAulas}`;
            }).join('<br>');
            
            return `
                <tr>
                    <td>${areaData.area}</td>
                    <td>${disciplinasHtml}</td>
                    <td class="text-nowrap">${chSemanalHtml}</td>
                    <td class="text-nowrap"><strong>${formatarMinutosParaHHMM(areaData.chTotalMinutos)}</strong></td>
                </tr>`;
        }).join('');
    };

    const createAccordionItem = (grade, index) => {
        const detalhesTabela = grade.detalhesDisciplina.map(d => `<tr><td>${d.nome}</td><td>${d.area}</td><td>${d.aulasSemanais}</td><td>${formatarMinutosParaHHMM(d.chSemanalMinutos)}</td></tr>`).join('');
        const isFirst = index === 0;
        const collapsedClass = !isFirst ? 'collapsed' : '';
        const showClass = isFirst ? 'show' : '';

        return `<div class="accordion-item"><h2 class="accordion-header" id="heading-${index}"><button class="accordion-button ${collapsedClass}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${index}" aria-expanded="${isFirst}" aria-controls="collapse-${index}"><strong>${grade.nomeGrade}</strong></button></h2><div id="collapse-${index}" class="accordion-collapse collapse ${showClass}" aria-labelledby="heading-${index}" data-bs-parent="#accordionGrades"><div class="accordion-body"><table class="table table-sm table-bordered"><thead><tr><th>Disciplina</th><th>Área</th><th>Aulas/Semana</th><th>CH Semanal</th></tr></thead><tbody>${detalhesTabela}</tbody></table><div class="mt-3 text-end"><button class="btn btn-sm btn-outline-success me-2 js-export-details-xls" data-grade-index="${index}" title="Exportar detalhes desta grade"><i class="fas fa-file-excel me-2"></i> Exportar esta Grade (XLS)</button><button class="btn btn-sm btn-outline-success me-2 js-export-details-ods" data-grade-index="${index}" title="Exportar detalhes desta grade"><i class="fas fa-file-powerpoint me-2"></i> Exportar esta Grade (ODS)</button><button class="btn btn-sm btn-primary me-2 js-export-consolidated-xls" title="Exportar o relatório consolidado completo"><i class="fas fa-globe me-2"></i> Exportar Todas (XLS)</button><button class="btn btn-sm btn-primary js-export-consolidated-ods" title="Exportar o relatório consolidado completo"><i class="fas fa-globe me-2"></i> Exportar Todas (ODS)</button></div></div></div></div>`;
    };
    
    const renderAccordion = (detalhes) => {
        DOM.accordionGrades.innerHTML = detalhes.map(createAccordionItem).join('');
    };

    // 4. FUNÇÕES DE EXPORTAÇÃO
    // FUNÇÃO ATUALIZADA para exportar os novos detalhes
    function exportarRelatorioConsolidado(fileType) {
        if (!dadosRelatorioAtual || !dadosRelatorioAtual.resumoDetalhado) {
            alert('Gere um relatório antes de exportar.');
            return;
        }
        const workbook = XLSX.utils.book_new();
        
        // MODIFICADO: Exporta os novos detalhes no resumo.
        const resumoParaExportar = dadosRelatorioAtual.resumoDetalhado.map(item => {
            const textoAulas = (aulas) => aulas === 1 ? 'aula' : 'aulas';
            return {
                'Área de Conhecimento': item.area,
                'Disciplinas': item.disciplinas.map(d => `${d.nome} - ${d.curso}`).join('\n'),
                'CH Semanal': item.disciplinas.map(d => `${formatarMinutosParaHHMM(d.chSemanalMinutos)} - ${d.aulas} ${textoAulas(d.aulas)}`).join('\n'),
                'CH Total da Área': formatarMinutosParaHHMM(item.chTotalMinutos)
            };
        });
        const wsResumo = XLSX.utils.json_to_sheet(resumoParaExportar);
        XLSX.utils.book_append_sheet(workbook, wsResumo, 'Resumo Consolidado');

        const detalhesParaExportar = dadosRelatorioAtual.detalhesPorGrade.flatMap(grade => 
            grade.detalhesDisciplina.map(d => ({
                'Grade': grade.nomeGrade, 'Disciplina': d.nome, 'Área': d.area,
                'Aulas por Semana': d.aulasSemanais, 'CH Semanal (HH:MM)': formatarMinutosParaHHMM(d.chSemanalMinutos)
            }))
        );
        const wsDetalhes = XLSX.utils.json_to_sheet(detalhesParaExportar);
        XLSX.utils.book_append_sheet(workbook, wsDetalhes, 'Detalhes por Grade');
        
        XLSX.writeFile(workbook, `relatorio_consolidado_previsao.${fileType}`);
    }

    function exportarDetalhesGrade(gradeIndex, fileType) {
        const grade = dadosRelatorioAtual?.detalhesPorGrade?.[gradeIndex];
        if (!grade) {
            alert('Dados da grade não encontrados para exportação.'); return;
        }
        
        const detalhesParaExportar = grade.detalhesDisciplina.map(d => ({ 'Disciplina': d.nome, 'Área': d.area, 'Aulas por Semana': d.aulasSemanais, 'CH Semanal (HH:MM)': formatarMinutosParaHHMM(d.chSemanalMinutos) }));
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(detalhesParaExportar);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalhes');
        
        const safeFileName = grade.nomeGrade.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        XLSX.writeFile(workbook, `detalhes_${safeFileName}.${fileType}`);
    }


    // 5. LÓGICA PRINCIPAL
    const carregarGrades = async () => {
        try {
            const grades = await fetchData(`${API_BASE_URL}/grades`);
            DOM.gradeSelect.innerHTML = grades.sort((a, b) => a.nome.localeCompare(b.nome)).map(g => `<option value="${g._id}">${g.nome}</option>`).join('');
        } catch (err) {
            showMessage(err.message);
        }
    };

    const gerarRelatorio = async () => {
        const gradeIds = Array.from(DOM.gradeSelect.selectedOptions).map(opt => opt.value);
        if (gradeIds.length === 0) return showMessage('Por favor, selecione pelo menos uma grade.', 'warning');

        DOM.loadingDiv.style.display = 'block';
        DOM.resultadoContainer.style.display = 'none';
        DOM.alertPlaceholder.innerHTML = '';
        dadosRelatorioAtual = null;

        try {
            const data = await fetchData(`${API_BASE_URL}/reports/previsao-grade-misto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gradeIds })
            });
            
            dadosRelatorioAtual = {
                detalhesPorGrade: data.detalhesPorGrade,
                resumoDetalhado: processarDadosParaResumoDetalhado(data.detalhesPorGrade)
            };
            
            renderResumo(dadosRelatorioAtual.resumoDetalhado);
            renderAccordion(dadosRelatorioAtual.detalhesPorGrade);
            DOM.resultadoContainer.style.display = 'block';

        } catch (err) {
            showMessage(err.message);
        } finally {
            DOM.loadingDiv.style.display = 'none';
        }
    };

    // 6. INICIALIZAÇÃO E EVENTOS
    const init = () => {
        DOM.btnGerar.addEventListener('click', gerarRelatorio);
        
        DOM.btnExportarXLS.addEventListener('click', () => exportarRelatorioConsolidado('xlsx'));
        DOM.btnExportarODS.addEventListener('click', () => exportarRelatorioConsolidado('ods'));
        
        DOM.accordionGrades.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if (!target) return;

            const gradeIndex = target.dataset.gradeIndex;

            if (target.classList.contains('js-export-details-xls')) {
                exportarDetalhesGrade(gradeIndex, 'xlsx');
            } else if (target.classList.contains('js-export-details-ods')) {
                exportarDetalhesGrade(gradeIndex, 'ods');
            } else if (target.classList.contains('js-export-consolidated-xls')) {
                exportarRelatorioConsolidado('xlsx');
            } else if (target.classList.contains('js-export-consolidated-ods')) {
                exportarRelatorioConsolidado('ods');
            }
        });
        
        carregarGrades();
    };

    init();
});