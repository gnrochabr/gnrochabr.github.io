const express = require('express');
const router = express.Router();
const Disciplina = require('../models/Disciplina'); // Importa o modelo Mongoose

// --- Rotas para o Recurso 'Disciplina' ---

// POST /api/disciplinas
// Cria uma nova disciplina
router.post('/', async (req, res) => {
    try {
        // Mongoose: .create() é o método para criar um novo documento
        const disciplina = await Disciplina.create(req.body);
        res.status(201).json(disciplina);
    } catch (err) {
        // Erro 400 para validação (ex: campos required faltando, unique duplicado)
        res.status(400).json({ message: err.message });
    }
});

// GET /api/disciplinas
// Lista todas as disciplinas
router.get('/', async (req, res) => {
    try {
        // Mongoose: .find({}) é o método para buscar todos os documentos
        const disciplinas = await Disciplina.find({});
        res.json(disciplinas);
    } catch (err) {
        // Erro 500 para erros internos do servidor (ex: problema com o DB)
        console.error("Erro ao listar disciplinas:", err); // Log detalhado do erro no console do servidor
        res.status(500).json({ message: 'Erro interno do servidor ao buscar disciplinas.', error: err.message });
    }
});

// GET /api/disciplinas/:id
// Obtém uma disciplina específica pelo ID
router.get('/:id', async (req, res) => {
    try {
        // Mongoose: .findById() busca um documento pelo seu _id
        const disciplina = await Disciplina.findById(req.params.id);
        if (!disciplina) {
            return res.status(404).json({ message: 'Disciplina não encontrada.' });
        }
        res.json(disciplina);
    } catch (err) {
        console.error("Erro ao buscar disciplina por ID:", err);
        // Se o ID não for um ObjectId válido do MongoDB, Mongoose lança um CastError.
        // Capturamos isso e retornamos 400 Bad Request.
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'ID de disciplina inválido.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor ao buscar disciplina.', error: err.message });
    }
});

// PATCH /api/disciplinas/:id
// Atualiza parcialmente uma disciplina
router.patch('/:id', async (req, res) => { // Mudado de PUT para PATCH para consistência com o frontend e semântica
    try {
        // Mongoose: .findByIdAndUpdate() ou .findOneAndUpdate()
        // { new: true } retorna o documento atualizado
        // { runValidators: true } garante que as validações do schema sejam executadas na atualização
        const disciplina = await Disciplina.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!disciplina) {
            return res.status(404).json({ message: 'Disciplina não encontrada para atualização.' });
        }
        res.json(disciplina); // Retorna a disciplina atualizada
    } catch (err) {
        console.error("Erro ao atualizar disciplina:", err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'ID de disciplina inválido.' });
        }
        // Se houver um erro de validação (ex: unique: true duplicado), Mongoose lança um erro com status 400
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/disciplinas/:id
// Remove uma disciplina
router.delete('/:id', async (req, res) => {
    try {
        // Mongoose: .findByIdAndDelete() remove um documento pelo seu _id
        const disciplina = await Disciplina.findByIdAndDelete(req.params.id);

        if (!disciplina) {
            return res.status(404).json({ message: 'Disciplina não encontrada para exclusão.' });
        }
        res.json({ message: 'Disciplina removida com sucesso!' });
    } catch (err) {
        console.error("Erro ao deletar disciplina:", err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'ID de disciplina inválido.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor ao deletar disciplina.', error: err.message });
    }
});

module.exports = router;