// models/CargaHoraria.js
const mongoose = require('mongoose');

const cargaHorariaSchema = new mongoose.Schema({
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor', required: true },
    disciplinaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Disciplina', required: true },
    turmaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Turma', required: true },
    cursoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
    periodoLetivoAtribuicao: { type: String, required: true },
    cargaHorariaSemanalAulasAtribuida: { type: Number, required: true, min: 1 },
    duracaoAulaMinutosAtribuida: { type: Number, required: true, min: 1 },
    // Campo calculado automaticamente: Carga Horária Semanal Total em Minutos
    cargaHorariaSemanalMinutosCalculada: { type: Number },
    // REMOVIDO: cargaHorariaTotalPeriodoMinutosCalculada: { type: Number },
    observacoes: { type: String },
}, { timestamps: true });

// Hook 'pre' para 'save' e 'findOneAndUpdate' para calcular campos derivados
const calculateCargaHoraria = function(doc) {
    const currentDoc = doc instanceof mongoose.Query ? doc.getUpdate() : doc;

    const aulasSemanais = currentDoc.cargaHorariaSemanalAulasAtribuida;
    const duracaoAula = currentDoc.duracaoAulaMinutosAtribuida;

    if (aulasSemanais !== undefined && duracaoAula !== undefined) {
        currentDoc.cargaHorariaSemanalMinutosCalculada = aulasSemanais * duracaoAula;
        // REMOVIDA A LÓGICA DE CÁLCULO PARA cargaHorariaTotalPeriodoMinutosCalculada
    }
};

cargaHorariaSchema.pre('save', function(next) {
    calculateCargaHoraria(this);
    next();
});

cargaHorariaSchema.pre('findOneAndUpdate', function(next) {
    calculateCargaHoraria(this);
    next();
});

module.exports = mongoose.models.CargaHoraria || mongoose.model('CargaHoraria', cargaHorariaSchema);