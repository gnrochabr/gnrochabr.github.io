// models/Curso.js
const mongoose = require('mongoose');

const cursoSchema = new mongoose.Schema({
    nome: { type: String, required: true, unique: true },
    codigo: { type: String, required: true, unique: true },
    modalidade: { type: String, required: true },
    grau: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Curso', cursoSchema);