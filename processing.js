// processing.js

// Auxiliar para calcular rateios (se houver)
function gerarDepartamentosObj(departamentos, valorTotalLancamento) {
    if (Array.isArray(departamentos) && departamentos.length > 0) {
        return departamentos.map(depto => {
            const percentual = (depto.PercDepto ?? 100) / 100;
            return {
                CodDpto: depto.CODDepto ? String(depto.CODDepto) : "0",
                ValorDepto: valorTotalLancamento * percentual
            };
        });
    }
    return [{ CodDpto: "0", ValorDepto: valorTotalLancamento }];
}

function converteNatureza(naturezaOG) {
    // Se for 'D' (Despesa) ou 'P' (Pagamento), vira 'P'
    if (naturezaOG === 'D' || naturezaOG === 'P') return 'P';
    return 'R'; // Receita
}

/**
 * Processa Títulos (Contas a Pagar/Receber e suas baixas)
 */
export function extrairDadosDosTitulos(titulosRaw, contaId) {
    const lancamentosProcessados = [];

    if (!Array.isArray(titulosRaw)) return lancamentosProcessados;
    
    titulosRaw.forEach(titulo => {
        if (!titulo || !titulo.Categoria) return;

        const natureza = converteNatureza(titulo.Natureza);
        
        if (Array.isArray(titulo.Lancamentos)) {
            titulo.Lancamentos.forEach(lancamento => {
                // Validações básicas
                if (!lancamento.DataLancamento || !lancamento.CODContaC || typeof lancamento.ValorLancamento === 'undefined') return;

                // Filtra para pegar apenas lançamentos desta conta específica
                if (String(lancamento.CODContaC) === String(contaId)) {
                    const obs = titulo.obsTitulo ?? lancamento.obs ?? null;
                    
                    lancamentosProcessados.push({
                        Natureza: natureza,
                        DataLancamento: lancamento.DataLancamento,
                        ValorLancamento: lancamento.ValorLancamento, // Valor Absoluto
                        Cliente: titulo.Cliente,
                        obs: obs,
                        NUMDoc: titulo.NF || null
                    });
                }
            });
        }
    });

    return lancamentosProcessados;
}

/**
 * Processa Lançamentos Manuais (Avulsos)
 */
export function extrairLancamentosSimples(lancamentosRaw, contaId) {
    const lancamentosProcessados = [];

    if (!Array.isArray(lancamentosRaw)) return lancamentosProcessados;

    lancamentosRaw.forEach(item => {
        if (!item || !Array.isArray(item.Lancamentos)) return;
        const natureza = converteNatureza(item.Natureza);

        item.Lancamentos.forEach(lancamento => {
            if (!lancamento.DataLancamento || !lancamento.CODContaC || typeof lancamento.ValorLancamento === 'undefined') return;

            if (String(lancamento.CODContaC) === String(contaId)) {
                lancamentosProcessados.push({
                    Natureza: natureza,
                    DataLancamento: lancamento.DataLancamento,
                    ValorLancamento: lancamento.ValorLancamento,
                    Cliente: item.Cliente,
                    obs: lancamento.obs || null,
                    NUMDoc: item.NF || null
                });
            }
        });
    });

    return lancamentosProcessados;
}