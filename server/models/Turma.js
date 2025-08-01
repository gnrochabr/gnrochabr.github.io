const mongoose = require('mongoose');

const turmaSchema = new mongoose.Schema({
  nome: {
    type: String,
    trim: true,
    unique: true,
    // Será gerado automaticamente se não for informado
  },
  cursoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curso',
    required: [true, 'O campo cursoId é obrigatório.']
  },
  modalidade: {
    type: String,
    required: [true, 'O campo modalidade é obrigatório.'],
    enum: {
      values: ['Presencial', 'Híbrido', 'EAD'],
      message: 'Modalidade deve ser Presencial, Híbrido ou EAD.'
    }
  },
  periodoLetivo: {
    type: String,
    trim: true,
    required: [true, 'O campo período letivo é obrigatório.']
  },
  turno: {
    type: String,
    required: [true, 'O campo turno é obrigatório.'],
    enum: {
      values: ['Matutino', 'Vespertino', 'Noturno', 'Integral'],
      message: 'Turno deve ser Matutino, Vespertino, Noturno ou Integral.'
    }
  }
}, {
  timestamps: true
});

// Hook para gerar nome automaticamente
turmaSchema.pre('save', async function (next) {
  if (this.isNew && (!this.nome || this.nome.trim() === '')) {
    try {
      const Curso = mongoose.model('Curso');
      const curso = await Curso.findById(this.cursoId);

      if (!curso || !curso.codigo) {
        return next(new Error('Código do curso não encontrado para gerar o nome da turma.'));
      }

      const periodo = this.periodoLetivo.trim();
      const codigoCurso = curso.codigo.trim().toUpperCase();
      const letraTurno = this.turno.charAt(0).toUpperCase();

      this.nome = `${periodo}.${codigoCurso}.${letraTurno}`;
    } catch (err) {
      console.error('Erro ao gerar nome da turma:', err);
      return next(new Error('Falha ao gerar o nome da turma automaticamente.'));
    }
  }
  next();
});

module.exports = mongoose.models.Turma || mongoose.model('Turma', turmaSchema);
