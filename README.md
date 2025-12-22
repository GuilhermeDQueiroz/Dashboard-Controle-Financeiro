# 📊 Controle Financeiro PWA

> Um dashboard de finanças pessoais moderno, responsivo e serverless que transforma planilhas do Google Sheets em Business Intelligence.

![Badge Status](https://img.shields.io/badge/Status-Finalizado-success)
![Badge Tech](https://img.shields.io/badge/Tech-HTML%20%7C%20Tailwind%20%7C%20JS-blue)
![Badge PWA](https://img.shields.io/badge/PWA-Ready-purple)

## 🎯 Sobre o Projeto

Este projeto é uma **Single Page Application (SPA)** focada em controle financeiro pessoal. Ele consome dados diretamente de uma planilha do Google Sheets publicada na web, eliminando a necessidade de um backend complexo ou banco de dados dedicado.

O sistema foi desenvolvido com foco em **Performance** e **UX**, utilizando o conceito de PWA (Progressive Web App) para permitir instalação nativa em dispositivos móveis e funcionamento offline.

## ✨ Funcionalidades Principais

* **Conexão em Tempo Real:** Sincronização automática com Google Sheets via Proxy CORS.
* **Dashboard Visual:**
    * KPIs de Receita, Despesa e Saldo Líquido (com indicador visual 🐷).
    * Barra de progresso de meta de gastos com feedback de cor (Neon).
* **Análise de Dados:**
    * Gráfico de Barras: Comparativo Mensal (Receitas vs Despesas).
    * Gráfico de Rosca: Distribuição por Categorias.
    * Gráfico de Linha: Evolução do fluxo de caixa mensal.
* **Filtros Avançados:** Filtragem cruzada por Período, Mês de Referência, Categoria e Contas Bancárias.
* **Cache Busting:** Botão de sincronização manual que força a atualização dos dados ignorando o cache do navegador.
* **PWA:** Instalação como aplicativo no Android e iOS.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (CDN)
* **Lógica:** JavaScript (ES6+ Vanilla)
* **Gráficos:** [Chart.js](https://www.chartjs.org/)
* **Manipulação de CSV:** [PapaParse](https://www.papaparse.com/)
* **Datas:** [Flatpickr](https://flatpickr.js.org/)
* **Infraestrutura:** Serverless (Google Sheets como DB).

## 📂 Estrutura do Projeto

O código foi modularizado para facilitar a manutenção:

```text
MeuFinanceiro/
│
├── index.html        # Estrutura do DOM e imports
├── style.css         # Estilização customizada (Glassmorphism & Neon)
├── app.js            # Lógica de negócio, fetch de dados e gráficos
├── sw.js             # Service Worker (Cache & Offline support)
├── manifest.json     # Configuração do PWA (Ícones, cores, nome)
│
└── icons/            # Ativos gráficos
    ├── icon-192.png
    └── icon-512.png
