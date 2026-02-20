// app.js
import express from 'express';
import cors from 'cors';
import XLSX from 'xlsx';
import { extrairDadosDosTitulos, extrairLancamentosSimples } from './processing.js';

const app = express();

// Aumenta o limite do body pois o Bubble pode enviar muitos dados
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- Funções Auxiliares Locais ---

function converterParaData(dataStr) {
    if (!dataStr) return null;
    // Assume formato DD/MM/YYYY
    if (dataStr.includes('/')) {
        const [dia, mes, ano] = dataStr.split('/').map(Number);
        return new Date(ano, mes - 1, dia);
    }
    return null;
}

// --- Rota Principal ---

app.post('/api/gerar-relatorio', (req, res) => {
    try {
        // O Bubble deve enviar: { rawTitulos: [...], rawLancamentos: [...], contaId: "...", dataInicio: "...", dataFim: "..." }
        const { rawTitulos, rawLancamentos, contaId, dataInicio, dataFim } = req.body;

        if (!contaId) {
            return res.status(400).json({ error: "contaId é obrigatório" });
        }

        const dtInicioObj = converterParaData(dataInicio);
        const dtFimObj = converterParaData(dataFim);

        // 1. Processamento (Extração)
        let listaFinal = [];

        // Processa Títulos se houver
        if (rawTitulos && Array.isArray(rawTitulos)) {
            const titulosProcessados = extrairDadosDosTitulos(rawTitulos, contaId);
            listaFinal.push(...titulosProcessados);
        }

        // Processa Manuais se houver
        if (rawLancamentos && Array.isArray(rawLancamentos)) {
            const manuaisProcessados = extrairLancamentosSimples(rawLancamentos, contaId);
            listaFinal.push(...manuaisProcessados);
        }

        // 2. Filtragem por Data e Ordenação
        if (dtInicioObj && dtFimObj) {
            listaFinal = listaFinal.filter(item => {
                const dtItem = converterParaData(item.DataLancamento);
                return dtItem && dtItem >= dtInicioObj && dtItem <= dtFimObj;
            });
        }

        listaFinal.sort((a, b) => 
            converterParaData(a.DataLancamento) - converterParaData(b.DataLancamento)
        );

        // 3. Mapeamento para Colunas do Excel
        const dadosExcel = listaFinal.map(l => {
            // Formata descrição conforme sua lógica original
            const prefix = l.Natureza === 'R' ? 'RCTO' : 'PGTO';
            const docInfo = l.NUMDoc ? ` NF ${l.NUMDoc}` : '';
            const obsInfo = l.obs ? ` - ${l.obs}` : '';
            const descricaoCompleta = `${prefix}${docInfo} - ${l.Cliente || ''}${obsInfo}`;

            return {
                "Data": l.DataLancamento,
                "Descrição": descricaoCompleta,
                "Débito": l.Natureza === 'R' ? l.ValorLancamento : 0,  // Enviamos numero puro para o Excel somar
                "Crédito": l.Natureza === 'P' ? l.ValorLancamento : 0
            };
        });

        // 4. Geração do Arquivo XLSX
        const worksheet = XLSX.utils.json_to_sheet(dadosExcel);

        // Configura largura das colunas (Estética)
        worksheet['!cols'] = [
            { wch: 12 }, // Data
            { wch: 60 }, // Descrição
            { wch: 15 }, // Débito
            { wch: 15 }  // Crédito
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Extrato');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // 5. Retorno do Arquivo
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_${contaId}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        res.status(500).json({ error: "Erro interno no processamento do arquivo." });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`API de Relatórios rodando na porta ${port}`);
});