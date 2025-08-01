const express = require('express');
const router = express.Router();
const Professor = require('../models/Professor');

// Criar professor
router.post('/', async (req, res) => {
    try {
        const professor = await Professor.create(req.body);
        const result = await professor.populate('cursoLotacaoId');
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Listar todos os professores
router.get('/', async (req, res) => {
    try {
        const professores = await Professor.find().populate('cursoLotacaoId');
        res.json(professores);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Obter um professor por ID
router.get('/:id', async (req, res) => {
    try {
        const professor = await Professor.findById(req.params.id).populate('cursoLotacaoId');
        if (!professor) {
            return res.status(404).json({ message: 'Professor não encontrado' });
        }
        res.json(professor);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Atualizar professor
router.patch('/:id', async (req, res) => {
    try {
        const professor = await Professor.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('cursoLotacaoId');
        if (!professor) {
            return res.status(404).json({ message: 'Professor não encontrado' });
        }
        res.json(professor);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Deletar professor
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Professor.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Professor não encontrado' });
        }
        res.json({ message: 'Professor removido com sucesso' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
