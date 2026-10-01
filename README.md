# Caderneta v1 — finanças pessoais (descontinuada)

> ⚠️ **Esta é a primeira versão do projeto e não recebe mais atualizações.**
> A versão atual é o **[Caderneta 2](https://github.com/thiagoizdro/Caderneta_v2)** — PWA offline-first com React, IndexedDB, API Node/Express e PostgreSQL, com sincronização entre dispositivos.
> 🔗 Demo da v2: https://caderneta-v2.onrender.com/ · 📄 Estudo de caso: https://thiagoizdro.github.io/Case_caderneta/

## Sobre

Aplicativo web (PWA) de controle financeiro pessoal, feito para quem recebe **por diária** ou **salário mensal**. Foi o meu primeiro projeto completo de front-end e o ponto de partida do Caderneta 2.

## Funcionalidades

- Escolha do modo de controle: **Diária** ou **Salário Mensal**
- Calendário de dias trabalhados com cálculo automático do valor a receber
- Registro de entradas e saídas, com lista dos últimos lançamentos
- Resumo do mês
- Dados salvos no navegador (**LocalStorage**), sem precisar de cadastro
- Instalável no celular como **PWA** (manifest + service worker)

## Tecnologias

HTML5 · CSS3 · JavaScript (vanilla) · LocalStorage · Service Worker / PWA

## Como rodar

Não há build: basta abrir o `index.html` no navegador ou servir a pasta com qualquer servidor estático, por exemplo:

```bash
npx serve .
```

## O que aprendi e levei para a v2

- Guardar tudo no LocalStorage limita o app a um único aparelho → na v2 os dados ficam no IndexedDB e sincronizam com uma API.
- Um único `app.js` cresce rápido → na v2 o código foi separado em componentes React e as regras financeiras viraram funções puras com testes.

---

Feito por [Thiago Izidro Fernandes](https://github.com/thiagoizdro) · [Portfólio](https://thiagoizdro.github.io/Portfolio/)
