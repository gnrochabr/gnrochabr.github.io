const express = require('express');
const router = express.Router();
const CargaHoraria = require('../models/CargaHoraria');

// Helper function para aplicar o populate
const populateCargaHoraria = (query) => {
    return query
        .populate('professorId', 'nome')
        .populate('disciplinaId', 'nome')
        .populate('turmaId', 'nome')
        .populate('cursoId', 'nome');
};

// GET - listar todas as atribuições
router.get('/', async (req, res) => {
    try {
        const cargas = await populateCargaHoraria(CargaHoraria.find());
        res.json(cargas);
    } catch (err) {
        console.error("Erro ao buscar cargas horárias com populate:", err);
        res.status(500).json({ message: 'Erro ao buscar cargas horárias.', error: err.message });
    }
});

// GET - buscar uma atribuição por ID
router.get('/:id', async (req, res) => {
    try {
        const carga = await populateCargaHoraria(CargaHoraria.findById(req.params.id));

        if (!carga) return res.status(404).json({ message: 'Atribuição não encontrada.' });
        res.json(carga);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar a atribuição.' });
    }
});

// POST - cadastrar nova atribuição de carga horária
router.post('/', async (req, res) => {
    const {
        professorId,
        disciplinaId,
        turmaId,
        cursoId,
        periodoLetivoAtribuicao,
        cargaHorariaSemanalAulasAtribuida,
        duracaoAulaMinutosAtribuida,
        observacoes
    } = req.body;

    if (!professorId || !disciplinaId || !turmaId || !cursoId || !periodoLetivoAtribuicao ||
        cargaHorariaSemanalAulasAtribuida === undefined || duracaoAulaMinutosAtribuida === undefined) {
        return res.status(400).json({ message: 'Por favor, preencha todos os campos obrigatórios.' });
    }

    try {
        const existente = await CargaHoraria.findOne({
            professorId,
            disciplinaId,
            turmaId,
            periodoLetivoAtribuicao
        });

        if (existente) {
            return res.status(409).json({
                message: 'Já existe uma atribuição de carga horária para este professor.',
                detail: existente
            });
        }

        const nova = new CargaHoraria({
            professorId,
            disciplinaId,
            turmaId,
            cursoId,
            periodoLetivoAtribuicao,
            cargaHorariaSemanalAulasAtribuida,
            duracaoAulaMinutosAtribuida,
            observacoes
        });

        const salva = await nova.save();
        const cargaSalvaPopulada = await populateCargaHoraria(CargaHoraria.findById(salva._id));
        res.status(201).json(cargaSalvaPopulada);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH - editar atribuição existente
router.patch('/:id', async (req, res) => {
    try {
        const atualizada = await CargaHoraria.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!atualizada) return res.status(404).json({ message: 'Atribuição não encontrada para atualizar.' });

        const cargaAtualizadaPopulada = await populateCargaHoraria(CargaHoraria.findById(atualizada._id));
        res.json(cargaAtualizadaPopulada);
    } catch (err) {
        res.status(400).json({ message: 'Erro ao atualizar atribuição.' });
    }
});

// DELETE - remover atribuição
router.delete('/:id', async (req, res) => {
    try {
        const removida = await CargaHoraria.findByIdAndDelete(req.params.id);
        if (!removida) return res.status(404).json({ message: 'Atribuição não encontrada para exclusão.' });

        res.json({ message: 'Atribuição excluída com sucesso!' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao excluir atribuição.' });
    }
});

module.exports = router;