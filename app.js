// Planilha de Demonstração (Padrão)
const DEMO_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaHmdvWk9wLHdclkmL6DN4UugjOxBF-HeOWvU91bOmvbC6ZYl4TAfXZ-6mzLEfMiddw95qOtuhr2_J/pub?output=csv";

let state = {
    dadosBrutos: [],
    dadosFiltrados: [],
    meta: 2000,
    paginacao: { atual: 1, itensPorPagina: 10 },
    filtros: { dataInicio: null, dataFim: null, categoria: null, tipo: null, dataEspecifica: null, mesEspecifico: null, contaEspecifica: null },
    charts: {},
    painelContasAberto: false,
    datePicker: null // Armazena a instância do Flatpickr
};

const formatMoney = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function togglePainelContas() {
    const painel = document.getElementById('painel-contas');
    const cardSaldo = document.getElementById('card-saldo');
    state.painelContasAberto = !state.painelContasAberto;
    if (state.painelContasAberto) {
        painel.classList.remove('hidden'); cardSaldo.classList.add('active');
        setTimeout(() => painel.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } else { painel.classList.add('hidden'); cardSaldo.classList.remove('active'); }
}

async function init() {
    // Inicializa o Flatpickr (Calendário de Range)
    initDatePicker();

    // Carrega Meta Salva
    const metaSalva = localStorage.getItem('finance_meta');
    if (metaSalva) {
        state.meta = parseFloat(metaSalva);
        const inputMeta = document.getElementById('input-meta');
        if (inputMeta) inputMeta.value = state.meta;
    }

    // --- LÓGICA DE PRIMEIRO ACESSO ---
    const urlSalva = localStorage.getItem('finance_url');

    if (!urlSalva) {
        console.log("Primeiro acesso: Abrindo modal de configuração...");
        const modal = document.getElementById('modal-config');
        if (modal) {
            modal.classList.remove('hidden');
        }
    } else {
        await carregarDados();
    }
}

function initDatePicker() {
    state.datePicker = flatpickr("#input-periodo", {
        mode: "range",
        dateFormat: "d/m/Y",
        locale: "pt",
        altInput: true,
        altFormat: "d/m/Y",
        theme: "dark",
        onChange: function (selectedDates, dateStr, instance) {
            // Resetar filtro de mês se usar o calendário
            state.filtros.mesEspecifico = null;
            sincronizarSelectsMes("");

            if (selectedDates.length === 2) {
                // Define início (00:00:00) e fim (23:59:59)
                const inicio = new Date(selectedDates[0]);
                inicio.setHours(0, 0, 0, 0);

                const fim = new Date(selectedDates[1]);
                fim.setHours(23, 59, 59, 999);

                state.filtros.dataInicio = inicio;
                state.filtros.dataFim = fim;
            } else {
                state.filtros.dataInicio = null;
                state.filtros.dataFim = null;
            }

            // Desativa botão Hoje
            const btn = document.getElementById('btn-hoje');
            if (btn) {
                btn.classList.remove('bg-accent', 'border-accent', 'font-bold');
                btn.classList.add('bg-slate-800', 'border-slate-700');
            }

            aplicarFiltros();
        }
    });
}

async function sincronizarDados() {
    const btn = document.getElementById('btn-sync');
    const icon = btn.querySelector('svg');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-indicator');
    icon.classList.add('spin-anim'); btn.disabled = true; statusText.innerText = "Sincronizando..."; statusDot.classList.replace('bg-green-500', 'bg-yellow-500');
    try {
        await carregarDados(true);
        statusText.innerText = "Atualizado"; statusDot.classList.replace('bg-yellow-500', 'bg-green-500');
    } catch (e) {
        statusText.innerText = "Erro ao Sync"; statusDot.classList.replace('bg-yellow-500', 'bg-red-500');
    } finally {
        setTimeout(() => { icon.classList.remove('spin-anim'); btn.disabled = false; statusText.innerText = "Conectado"; statusDot.classList.replace('bg-red-500', 'bg-green-500'); }, 800);
    }
}

async function carregarDados(forceRefresh = false) {
    const userUrl = localStorage.getItem('finance_url');
    const targetUrl = userUrl ? userUrl : DEMO_URL;

    if (!userUrl) {
        console.log("Usando planilha Demo");
    }

    const timestamp = forceRefresh ? `&t=${new Date().getTime()}` : '';
    const finalUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl + timestamp);

    try {
        const res = await fetch(finalUrl);
        if (res.ok) {
            processarCSV(await res.text());
        } else {
            throw new Error("Falha na conexão");
        }
    } catch (e) {
        console.error(e);
        alert("Erro ao carregar dados. Verifique o link nas configurações.");
    }
}

// --- Funções de Configuração ---
function abrirConfig() {
    const currentUrl = localStorage.getItem('finance_url') || '';
    document.getElementById('cfg-url').value = currentUrl;
    document.getElementById('modal-config').classList.remove('hidden');
}

function fecharConfig() {
    document.getElementById('modal-config').classList.add('hidden');
}

function salvarConfig() {
    const url = document.getElementById('cfg-url').value.trim();
    if (url) {
        localStorage.setItem('finance_url', url);
        location.reload();
    }
}

function resetarConfig() {
    localStorage.setItem('finance_url', DEMO_URL);
    location.reload();
}

function processarCSV(csvText) {
    Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (res) => {
            const rows = res.data; const headers = rows[0]; const dataObjs = [];
            for (let i = 1; i < rows.length; i++) {
                let row = rows[i];
                if (row.length > headers.length && row.length === 8) { let valReconstruido = row[4] + '.' + row[5]; row = [row[0], row[1], row[2], row[3], valReconstruido, row[6], row[7]]; }
                let obj = {}; obj['Data'] = row[0]; obj['Descrição'] = row[1]; obj['Categoria'] = row[2]; obj['Tipo'] = row[3]; obj['Valor'] = row[4]; obj['Conta'] = row[5];
                dataObjs.push(obj);
            }
            state.dadosBrutos = parseInteligente(dataObjs);
            state.dadosBrutos.sort((a, b) => a.dataObj - b.dataObj);
            popularSelectMeses(); aplicarFiltros();
        }
    });
}

function parseInteligente(dados) {
    return dados.map(d => {
        let dataStr = d['Data']; let dataObj = null;
        if (dataStr) {
            if (dataStr.includes('-')) { const parts = dataStr.split('-'); dataObj = new Date(parts[0], parts[1] - 1, parts[2]); dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`; }
            else if (dataStr.includes('/')) { const parts = dataStr.split('/'); dataObj = new Date(parts[2], parts[1] - 1, parts[0]); }
        }
        let valRaw = d['Valor'], valor = 0;
        if (valRaw) { let v = valRaw.toString().replace('R$', '').trim(); if (v.includes(',') && v.includes('.')) v = v.replace('.', '').replace(',', '.'); else if (v.includes(',')) v = v.replace(',', '.'); valor = parseFloat(v); }
        return {
            dataStr: dataStr || '', descricao: d['Descrição'], categoria: d['Categoria'] || 'Outros',
            tipo: d['Tipo'] ? d['Tipo'].trim() : '', conta: d['Conta'] ? d['Conta'].trim() : 'Geral',
            valor: valor || 0, dataObj: dataObj, mesAno: dataObj ? `${(dataObj.getMonth() + 1).toString().padStart(2, '0')}/${dataObj.getFullYear()}` : '', valid: dataObj && !isNaN(valor)
        };
    }).filter(x => x.valid);
}

// --- CONTROLE DE FILTROS E UI ---

function sincronizarSelectsMes(valor) {
    const ids = ['sel-mes', 'sel-mes-extrato'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = valor || "";
    });
}

function popularSelectMeses() {
    const mesesUnicos = [...new Set(state.dadosBrutos.map(d => d.mesAno))];

    mesesUnicos.sort((a, b) => {
        const [ma, ya] = a.split('/');
        const [mb, yb] = b.split('/');
        return new Date(ya, ma - 1) - new Date(yb, mb - 1);
    });

    ['sel-mes', 'sel-mes-extrato'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">Todos os Meses</option>';
            mesesUnicos.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.innerText = m;
                select.appendChild(opt);
            });
            select.value = state.filtros.mesEspecifico || "";
        }
    });
}

function filtrarHoje() {
    const hoje = new Date();

    // Atualiza visualmente o Flatpickr
    if (state.datePicker) {
        state.datePicker.setDate([hoje, hoje]);
    }

    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

    state.filtros.dataInicio = inicio;
    state.filtros.dataFim = fim;
    state.filtros.mesEspecifico = null;

    const btn = document.getElementById('btn-hoje');
    if (btn) {
        btn.classList.remove('bg-slate-800', 'border-slate-700', 'text-white');
        btn.classList.add('bg-accent', 'border-accent', 'text-white', 'font-bold');
    }

    sincronizarSelectsMes("");
    aplicarFiltros();
}

function alterarFiltroMes(valor) {
    state.filtros.mesEspecifico = valor || null;

    if (valor) {
        state.filtros.dataInicio = null;
        state.filtros.dataFim = null;

        // Limpa o datepicker
        if (state.datePicker) state.datePicker.clear();

        const btn = document.getElementById('btn-hoje');
        if (btn) {
            btn.classList.remove('bg-accent', 'border-accent', 'font-bold');
            btn.classList.add('bg-slate-800', 'border-slate-700');
        }
    }

    sincronizarSelectsMes(valor);
    aplicarFiltros();
}

function atualizarMeta(v) { state.meta = parseFloat(v) || 2000; localStorage.setItem('finance_meta', state.meta); aplicarFiltros(); }
function toggleFiltroTipo(t) { state.filtros.tipo = (state.filtros.tipo === t) ? null : t; aplicarFiltros(); }
function setFiltroInterativo(k, v) {
    state.filtros[k] = (state.filtros[k] === v) ? null : v;
    if (k === 'mesEspecifico') {
        alterarFiltroMes(state.filtros[k]);
    } else {
        aplicarFiltros();
    }
}
function filtrarPorConta(c) { state.filtros.contaEspecifica = (state.filtros.contaEspecifica === c) ? null : c; aplicarFiltros(); }

function limparFiltrosInterativos() {
    state.filtros.categoria = null; state.filtros.tipo = null; state.filtros.dataEspecifica = null;
    state.filtros.mesEspecifico = null; state.filtros.contaEspecifica = null;
    state.filtros.dataInicio = null; state.filtros.dataFim = null;

    // Limpa Datepicker
    if (state.datePicker) state.datePicker.clear();

    sincronizarSelectsMes("");

    const btn = document.getElementById('btn-hoje');
    if (btn) {
        btn.classList.remove('bg-accent', 'border-accent', 'font-bold');
        btn.classList.add('bg-slate-800', 'border-slate-700');
    }

    aplicarFiltros();
}

function mudarPagina(delta) {
    const totalPaginas = Math.ceil(state.dadosFiltrados.length / state.paginacao.itensPorPagina);
    const novaPagina = state.paginacao.atual + delta;

    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
        state.paginacao.atual = novaPagina;
        renderizarTabelaPaginada();
    }
}

function renderizarTabelaPaginada() {
    const tbody = document.getElementById('tabela-corpo');
    tbody.innerHTML = '';

    const dadosOrdenados = state.dadosFiltrados.slice().reverse();

    const totalItens = dadosOrdenados.length;
    const itensPorPag = state.paginacao.itensPorPagina;
    const totalPaginas = Math.ceil(totalItens / itensPorPag) || 1;

    if (state.paginacao.atual > totalPaginas) state.paginacao.atual = 1;

    const inicio = (state.paginacao.atual - 1) * itensPorPag;
    const fim = inicio + itensPorPag;
    const dadosPagina = dadosOrdenados.slice(inicio, fim);

    dadosPagina.forEach(i => {
        const cor = i.tipo === 'Receita' ? 'text-success' : 'text-danger';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-700/50 transition border-b border-slate-700">
                <td class="p-3 text-slate-400">${i.dataStr}</td>
                <td class="p-3 text-slate-200">${i.descricao}</td>
                <td class="p-3"><span class="bg-slate-700 px-2 py-1 rounded text-xs text-slate-300">${i.categoria}</span></td>
                <td class="p-3 text-gray-400 text-xs">${i.conta}</td>
                <td class="p-3 text-right ${cor} font-mono">${formatMoney(i.valor)}</td>
            </tr>`;
    });

    document.getElementById('info-paginacao').innerText =
        totalItens > 0
            ? `Mostrando ${inicio + 1}-${Math.min(fim, totalItens)} de ${totalItens}`
            : 'Nenhum dado encontrado';

    document.getElementById('btn-ant').disabled = state.paginacao.atual === 1;
    document.getElementById('btn-prox').disabled = state.paginacao.atual >= totalPaginas || totalItens === 0;
}

function aplicarFiltros() {
    const f = state.filtros;
    state.dadosFiltrados = state.dadosBrutos.filter(d => {
        if (f.dataInicio && d.dataObj < f.dataInicio) return false;
        if (f.dataFim && d.dataObj > f.dataFim) return false;
        if (f.dataEspecifica && d.dataStr !== f.dataEspecifica) return false;
        if (f.categoria && d.categoria !== f.categoria) return false;
        if (f.tipo && d.tipo !== f.tipo) return false;
        if (f.mesEspecifico && d.mesAno !== f.mesEspecifico) return false;
        if (f.contaEspecifica && d.conta !== f.contaEspecifica) return false;
        return true;
    });

    state.paginacao.atual = 1;
    atualizarUI();
}

function atualizarUI() {
    let rec = 0, desp = 0; let catMap = {}, evoMap = {}, mensalMap = {};
    state.dadosFiltrados.forEach(d => {
        if (d.tipo === 'Receita') rec += d.valor;
        else { desp += d.valor; catMap[d.categoria] = (catMap[d.categoria] || 0) + d.valor; }
        if (!evoMap[d.mesAno]) evoMap[d.mesAno] = { r: 0, d: 0, sortKey: d.dataObj.getFullYear() * 100 + d.dataObj.getMonth() };
        if (d.tipo === 'Receita') evoMap[d.mesAno].r += d.valor; else evoMap[d.mesAno].d += d.valor;
    });
    const dadosGerais = state.dadosBrutos.filter(d => {
        const f = state.filtros;
        if (f.dataInicio && d.dataObj < f.dataInicio) return false;
        if (f.dataFim && d.dataObj > f.dataFim) return false;
        if (f.categoria && d.categoria !== f.categoria) return false;
        if (f.tipo && d.tipo !== f.tipo) return false;
        if (f.contaEspecifica && d.conta !== f.contaEspecifica) return false;
        return true;
    });
    dadosGerais.forEach(d => {
        if (!mensalMap[d.mesAno]) mensalMap[d.mesAno] = { r: 0, d: 0, sortKey: d.dataObj.getFullYear() * 100 + d.dataObj.getMonth() };
        if (d.tipo === 'Receita') mensalMap[d.mesAno].r += d.valor; else mensalMap[d.mesAno].d += d.valor;
    });

    const cRec = document.getElementById('card-receita'); const cDesp = document.getElementById('card-despesa'); const cSaldo = document.getElementById('card-saldo');
    cRec.classList.remove('active', 'inactive'); cDesp.classList.remove('active', 'inactive'); cSaldo.classList.remove('active', 'inactive');
    if (state.filtros.tipo === 'Receita') { cRec.classList.add('active'); cDesp.classList.add('inactive'); cSaldo.classList.add('inactive'); }
    else if (state.filtros.tipo === 'Despesa') { cDesp.classList.add('active'); cRec.classList.add('inactive'); cSaldo.classList.add('inactive'); }
    else if (state.painelContasAberto) { cSaldo.classList.add('active'); cRec.classList.add('inactive'); cDesp.classList.add('inactive'); }

    document.getElementById('kpi-receitas').innerText = formatMoney(rec);
    document.getElementById('kpi-despesas').innerText = formatMoney(desp);
    const saldo = rec - desp;
    const elSaldo = document.getElementById('kpi-saldo'); elSaldo.innerText = formatMoney(saldo); elSaldo.className = `text-3xl font-bold mt-1 ${saldo >= 0 ? 'text-success' : 'text-danger'}`;

    const pct = state.meta > 0 ? Math.min((desp / state.meta) * 100, 100) : 0;
    const barra = document.getElementById('meta-barra');
    document.getElementById('meta-porcentagem').innerText = `${pct.toFixed(1)}%`;
    document.getElementById('meta-texto').innerText = `Gasto: ${formatMoney(desp)} de ${formatMoney(state.meta)}`;
    barra.style.width = `${pct}%`;
    if (pct < 50) barra.className = 'h-4 rounded-full progress-fill bg-success neon-bar-green';
    else if (pct < 90) barra.className = 'h-4 rounded-full progress-fill bg-warning neon-bar-yellow';
    else barra.className = 'h-4 rounded-full progress-fill bg-danger neon-bar-red';

    const temFiltro = state.filtros.categoria || state.filtros.tipo || state.filtros.dataEspecifica || state.filtros.mesEspecifico || state.filtros.contaEspecifica || state.filtros.dataInicio;
    document.getElementById('btn-limpar').className = temFiltro ? "px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition flex items-center gap-2" : "hidden";

    let contasDisponiveis = {};
    state.dadosBrutos.forEach(d => {
        if (state.filtros.dataInicio && d.dataObj < state.filtros.dataInicio) return;
        if (state.filtros.dataFim && d.dataObj > state.filtros.dataFim) return;
        if (state.filtros.mesEspecifico && d.mesAno !== state.filtros.mesEspecifico) return;
        if (!contasDisponiveis[d.conta]) contasDisponiveis[d.conta] = 0;
        if (d.tipo === 'Receita') contasDisponiveis[d.conta] += d.valor; else contasDisponiveis[d.conta] -= d.valor;
    });
    const divContas = document.getElementById('container-contas'); divContas.innerHTML = '';
    Object.keys(contasDisponiveis).sort().forEach(conta => {
        const val = contasDisponiveis[conta];
        const isSelected = state.filtros.contaEspecifica === conta;
        const neonClass = val >= 0 ? 'conta-pos' : 'conta-neg';
        const btn = document.createElement('div');
        btn.className = `bg-slate-800 p-3 rounded-lg btn-conta ${neonClass} ${isSelected ? 'active' : ''}`;
        btn.onclick = () => filtrarPorConta(conta);
        btn.innerHTML = `<p class="text-xs text-gray-400 font-bold uppercase flex justify-between">${conta} ${isSelected ? '<span class="text-accent">●</span>' : ''}</p><p class="text-sm font-mono mt-1 ${val >= 0 ? 'text-success' : 'text-danger'}">${formatMoney(val)}</p>`;
        divContas.appendChild(btn);
    });

    renderizarTabelaPaginada();
    renderizarGraficos(catMap, evoMap, mensalMap);
}

function renderizarGraficos(catMap, evoMap, mensalMap) {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = '#334155';

    // --- Gráfico Mensal (Barras) ---
    const meses = Object.keys(mensalMap).sort((a, b) => mensalMap[a].sortKey - mensalMap[b].sortKey);
    const bgR = meses.map(m => state.filtros.mesEspecifico && m !== state.filtros.mesEspecifico ? 'rgba(16, 185, 129, 0.2)' : '#10b981');
    const bgD = meses.map(m => state.filtros.mesEspecifico && m !== state.filtros.mesEspecifico ? 'rgba(239, 68, 68, 0.2)' : '#ef4444');

    if (state.charts.mensal) state.charts.mensal.destroy();
    state.charts.mensal = new Chart(document.getElementById('chartMensal'), {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { label: 'Receitas', data: meses.map(m => mensalMap[m].r), backgroundColor: bgR },
                { label: 'Despesas', data: meses.map(m => mensalMap[m].d), backgroundColor: bgD }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#334155' } } },
            onClick: (e, el) => { if (el.length) setFiltroInterativo('mesEspecifico', meses[el[0].index]); }
        }
    });

    // --- Gráfico de Categorias (Donut) ---
    if (state.charts.cat) state.charts.cat.destroy();
    state.charts.cat = new Chart(document.getElementById('chartCategorias'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(catMap),
            datasets: [{
                data: Object.values(catMap),
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#14b8a6', '#06b6d4', '#6366f1'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            const value = context.raw;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1) + '%';
                            return label + formatMoney(value) + ' (' + percentage + ')';
                        }
                    }
                }
            },
            onClick: (e, el) => { if (el.length) setFiltroInterativo('categoria', Object.keys(catMap)[el[0].index]); }
        }
    });

    // --- Gráfico de Evolução (Linha) ---
    const mesesEvo = Object.keys(evoMap).sort((a, b) => evoMap[a].sortKey - evoMap[b].sortKey);
    if (state.charts.evo) state.charts.evo.destroy();
    state.charts.evo = new Chart(document.getElementById('chartEvolucao'), {
        type: 'line',
        data: {
            labels: mesesEvo,
            datasets: [
                { label: 'Receitas', data: mesesEvo.map(m => evoMap[m].r), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3 },
                { label: 'Despesas', data: mesesEvo.map(m => evoMap[m].d), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            interaction: { mode: 'index', intersect: false },
            onClick: (e, el) => { if (el.length) setFiltroInterativo('mesEspecifico', mesesEvo[el[0].index]); }
        }
    });
}

// Garante que o HTML carregou antes de rodar o script
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Registra Service Worker (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA registrado!', reg))
            .catch(err => console.log('Erro PWA:', err));
    });
}

function toggleMenu() {
    const menu = document.getElementById('mobile-filters');
    menu.classList.toggle('hidden');
    menu.classList.toggle('flex');
}