const express = require('express');
const router = express.Router();
const Curso = require('../models/Curso');

// GET all cursos
router.get('/', async (req, res) => {
    try {
        const cursos = await Curso.find().sort({ nome: 1 });
        res.json(cursos);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET curso by ID
router.get('/:id', async (req, res) => {
    try {
        const curso = await Curso.findById(req.params.id);
        if (!curso) return res.status(404).json({ message: 'Curso não encontrado' });
        res.json(curso);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST novo curso
router.post('/', async (req, res) => {
    try {
        const cursoExistente = await Curso.findOne({
            $or: [
                { nome: req.body.nome.trim() },
                { codigo: req.body.codigo.trim().toUpperCase() }
            ]
        });

        if (cursoExistente) {
            return res.status(400).json({ message: 'Já existe um curso com esse nome ou código.' });
        }

        const curso = new Curso({
            nome: req.body.nome.trim(),
            codigo: req.body.codigo.trim().toUpperCase(),
            modalidade: req.body.modalidade,
            grau: req.body.grau
        });

        const newCurso = await curso.save();
        res.status(201).json(newCurso);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH curso
router.patch('/:id', async (req, res) => {
    try {
        const cursoConflitante = await Curso.findOne({
            _id: { $ne: req.params.id },
            $or: [
                { nome: req.body.nome.trim() },
                { codigo: req.body.codigo.trim().toUpperCase() }
            ]
        });

        if (cursoConflitante) {
            return res.status(400).json({ message: 'Outro curso já possui esse nome ou código.' });
        }

        const updatedCurso = await Curso.findByIdAndUpdate(
            req.params.id,
            {
                nome: req.body.nome.trim(),
                codigo: req.body.codigo.trim().toUpperCase(),
                modalidade: req.body.modalidade,
                grau: req.body.grau
            },
            { new: true }
        );

        if (!updatedCurso) return res.status(404).json({ message: 'Curso não encontrado' });
        res.json(updatedCurso);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE curso
router.delete('/:id', async (req, res) => {
    try {
        const deletedCurso = await Curso.findByIdAndDelete(req.params.id);
        if (!deletedCurso) return res.status(404).json({ message: 'Curso não encontrado' });
        res.json({ message: 'Curso deletado com sucesso!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
