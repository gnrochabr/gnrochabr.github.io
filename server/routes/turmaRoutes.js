const express = require('express');
const router = express.Router();
const Turma = require('../models/Turma');

// Criar nova turma
router.post('/', async (req, res) => {
    try {
        const turma = await Turma.create(req.body);
        res.status(201).json(turma);
    } catch (err) {
        console.error("Erro ao criar turma:", err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Já existe uma turma com este nome.' });
        }
        res.status(400).json({ message: 'Erro ao criar turma.', error: err.message });
    }
});

// Listar todas as turmas
router.get('/', async (req, res) => {
    try {
        const turmas = await Turma.find().populate('cursoId');
        res.json(turmas);
    } catch (err) {
        console.error("Erro ao listar turmas:", err);
        res.status(500).json({ message: 'Erro interno do servidor.', error: err.message });
    }
});

// Obter turma por ID
router.get('/:id', async (req, res) => {
    try {
        const turma = await Turma.findById(req.params.id).populate('cursoId');
        if (!turma) {
            return res.status(404).json({ message: 'Turma não encontrada.' });
        }
        res.json(turma);
    } catch (err) {
        console.error("Erro ao buscar turma:", err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'ID de turma inválido.' });
        }
        res.status(500).json({ message: 'Erro ao buscar turma.', error: err.message });
    }
});

// Atualizar turma
router.patch('/:id', async (req, res) => {
    try {
        const turma = await Turma.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!turma) {
            return res.status(404).json({ message: 'Turma não encontrada para atualização.' });
        }
        res.json(turma);
    } catch (err) {
        console.error("Erro ao atualizar turma:", err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'ID de turma inválido.' });
        }
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Já existe uma turma com este nome.' });
        }
        res.status(400).json({ message: 'Erro ao atualizar turma.', error: err.message });
    }
});

// Excluir turma
router.delete('/:id', async (req, res) => {
    try {
        const turma = await Turma.findByIdAndDelete(req.params.id);
        if (!turma) {
            return res.status(404).json({ message: 'Turma não encontrada para exclusão.' });
        }
        res.json({ message: 'Turma excluída com sucesso!' });
    } catch (err) {
        console.error("Erro ao deletar turma:", err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'ID de turma inválido.' });
        }
        res.status(500).json({ message: 'Erro ao deletar turma.', error: err.message });
    }
});

module.exports = router;
