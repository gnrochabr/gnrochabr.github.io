// models/Curso.js
const mongoose = require('mongoose');

const cursoSchema = new mongoose.Schema({
    nome: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    codigo: { // O 'codigo' é essencial para a geração do nome da turma, por isso permanece 'required'
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    // Remova 'required: true' de 'grau' e 'modalidade' se eles não forem SEMPRE fornecidos
    // ou se você não tem um formulário para cadastrá-los no Curso.
    grau: { 
        type: String, 
        // REMOVA OU COMENTE A LINHA ABAIXO se 'grau' não for obrigatório
        // required: true, 
        trim: true 
    },
    modalidade: { 
        type: String, 
        // REMOVA OU COMENTE A LINHA ABAIXO se 'modalidade' não for obrigatória
        // required: true, 
        trim: true 
    },
    // Você pode adicionar outros campos relevantes para o curso aqui
}, { timestamps: true });

// Exporta o modelo para que possa ser usado por outros modelos e rotas
module.exports = mongoose.models.Curso || mongoose.model('Curso', cursoSchema);