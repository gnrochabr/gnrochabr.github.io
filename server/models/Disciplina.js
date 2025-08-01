// models/Disciplina.js
const mongoose = require('mongoose');

const disciplinaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    codigo: { type: String, required: true, unique: true },
    cargaHorariaTotalHoras: { type: Number, required: true, min: 0 },
    // cargaHorariaTotalMinutos: { type: Number }, // Pode ser derivado no frontend ou em tempo de execução, se não for estritamente necessário no DB
    areaDisciplina: { type: String, required: true },
}, { timestamps: true });

// Hook pre-save para calcular cargaHorariaTotalMinutos e gerar código
disciplinaSchema.pre('save', function(next) {
    // Calcula cargaHorariaTotalMinutos se cargaHorariaTotalHoras for definida
    if (this.cargaHorariaTotalHoras !== undefined) {
        this.cargaHorariaTotalMinutos = this.cargaHorariaTotalHoras * 60;
    }

    // Gera o código APENAS se for um NOVO documento E o código ainda não foi definido
    // A lógica do frontend já gera um código de pré-visualização, mas esta é uma garantia no backend.
    if (this.isNew && !this.codigo) {
        if (this.nome && this.nome.length >= 4) {
            this.codigo = this.nome.substring(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        } else {
            // Fallback para nomes muito curtos
            this.codigo = 'DISC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        }
    }
    next();
});

// Hook pre-findOneAndUpdate (para PATCH)
// Usamos 'this.getUpdate()' para acessar os dados que estão sendo atualizados.
disciplinaSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate(); // Obtém o objeto de atualização
    
    // Se a carga horária total em horas for atualizada, recalcule os minutos
    if (update.cargaHorariaTotalHoras !== undefined) {
        update.cargaHorariaTotalMinutos = update.cargaHorariaTotalHoras * 60;
    }

    // AVISO: A lógica de regenerar código em 'findOneAndUpdate' é delicada.
    // Se você *não* quer que o código mude ao atualizar apenas o nome,
    // remova este bloco. Geralmente, o código é gerado apenas na CRIAÇÃO.
    // Se o código for 'unique', alterá-lo durante uma atualização pode falhar
    // se o novo código gerado já existir.
    // O frontend já envia o código existente ao editar, então o ideal é que ele não mude,
    // a menos que o usuário *explicitamente* o altere ou seja uma regra de negócio forte.
    /*
    if (update.nome && !update.codigo) { // Se o nome for atualizado E o código não foi fornecido na atualização
        if (update.nome.length >= 4) {
            update.codigo = update.nome.substring(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        } else {
            update.codigo = 'DISC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        }
    }
    */
    // Recomendo remover a lógica de regeneração de código no findOneAndUpdate
    // a menos que seja um requisito muito específico, pois o código deve ser mais estável.
    // O código abaixo é como ficaria se você quisesse regenerar o código SE O NOME FOI ALTERADO E NENHUM CÓDIGO FOI FORNECIDO:
    // const query = this.getQuery(); // Pega a query (condições) da atualização
    // const existingDoc = await this.model.findOne(query); // Pega o documento antes da atualização
    // if (update.nome && existingDoc.nome !== update.nome && !update.codigo) {
    //     // Lógica de regeneração de código aqui
    // }

    next();
});

// Exporta o modelo, evitando erro de redefinição em hot-reloads
module.exports = mongoose.models.Disciplina || mongoose.model('Disciplina', disciplinaSchema);