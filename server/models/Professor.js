// models/Professor.js
const mongoose = require('mongoose');

const professorSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    siape: { type: String, required: true, unique: true },
    emailInstitucional: { type: String, required: true, unique: true },
    telefone: { type: String },
    titulacaoMaxima: { type: String, required: true },
    cursoLotacaoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true }, // Reference to Curso model
}, { timestamps: true });

module.exports = mongoose.models.Professor || mongoose.model('Professor', professorSchema);