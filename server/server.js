require('dotenv').config(); // Carrega variáveis de ambiente do .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors()); // Permite que seu frontend (rodando em outra porta/domínio) acesse a API
app.use(express.json()); // Permite que o Express parseie JSON do corpo das requisições

// Conexão com o MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('Conectado ao MongoDB!'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Import routes
const cursoRoutes = require('./routes/cursoRoutes');
const disciplinaRoutes = require('./routes/disciplinaRoutes');
const professorRoutes = require('./routes/professorRoutes');
const turmaRoutes = require('./routes/turmaRoutes');
const cargaHorariaRoutes = require('./routes/cargaHorariaRoutes');

// Use routes
app.use('/api/cursos', cursoRoutes);
app.use('/api/disciplinas', disciplinaRoutes);
app.use('/api/professores', professorRoutes);
app.use('/api/turmas', turmaRoutes);
app.use('/api/cargas-horarias', cargaHorariaRoutes); // Ensure this matches your frontend

// Basic route for testing
app.get('/', (req, res) => {
    res.send('CH Docente API is running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});