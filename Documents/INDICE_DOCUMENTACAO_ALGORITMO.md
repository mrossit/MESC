# 📚 Índice - Documentação do Algoritmo de Escalas

> **Sistema de Geração Automática de Escalas - MESC**
>
> Documentação completa em linguagem não-técnica

---

## 📖 Guia de Leitura

Escolha o documento de acordo com sua necessidade:

### 🚀 Para começar rapidamente:
**→ [GUIA_RAPIDO_ALGORITMO.md](GUIA_RAPIDO_ALGORITMO.md)**
- ⏱️ Leitura: 5 minutos
- 📋 Resumo executivo
- ✅ Checklist prático
- 🎯 Solução rápida de problemas

---

### 📘 Para entender em detalhes:
**→ [EXPLICACAO_ALGORITMO_ESCALAS.md](EXPLICACAO_ALGORITMO_ESCALAS.md)**
- ⏱️ Leitura: 15-20 minutos
- 📚 Explicação completa passo a passo
- 🔍 Todas as etapas do processo
- 💡 Dicas e boas práticas
- ❓ Perguntas frequentes

---

### 🎨 Para visualizar o processo:
**→ [DIAGRAMA_FLUXO_ESCALAS.md](DIAGRAMA_FLUXO_ESCALAS.md)**
- ⏱️ Leitura: 10 minutos
- 🔄 Diagramas de fluxo
- 📊 Exemplos visuais
- ➡️ Passo a passo ilustrado
- 🎯 Árvores de decisão

---

### 💼 Para casos específicos:
**→ [CASOS_PRATICOS_ESCALAS.md](CASOS_PRATICOS_ESCALAS.md)**
- ⏱️ Leitura: 20-25 minutos
- 📝 10 casos práticos detalhados
- 🎯 Situações reais explicadas
- 💡 Soluções para problemas comuns
- 🔧 Como configurar casos especiais

---

## 🗂️ Estrutura da Documentação

```
DOCUMENTAÇÃO DO ALGORITMO
├── INDICE_DOCUMENTACAO_ALGORITMO.md (você está aqui)
│   └── Navegação entre documentos
│
├── GUIA_RAPIDO_ALGORITMO.md
│   ├── Visão geral em 1 página
│   ├── Tabelas de referência rápida
│   └── Glossário e legendas
│
├── EXPLICACAO_ALGORITMO_ESCALAS.md
│   ├── ETAPA 1: Coleta de Informações
│   ├── ETAPA 2: Ordenação das Missas
│   ├── ETAPA 3: Seleção de Ministros
│   ├── ETAPA 4: Atribuição de Posições
│   ├── Regras Especiais
│   ├── Exemplo Prático Completo
│   └── Perguntas Frequentes
│
├── DIAGRAMA_FLUXO_ESCALAS.md
│   ├── Fluxo Principal (diagrama)
│   ├── Fluxo de Atribuição (diagrama)
│   ├── Fluxo de Posição (diagrama)
│   ├── Exemplo Visual Passo a Passo
│   └── Resumo das Prioridades
│
└── CASOS_PRATICOS_ESCALAS.md
    ├── Caso 1: Todos querem a mesma posição
    ├── Caso 2: Ninguém quer fazer o Salmo
    ├── Caso 3: Casal quer servir junto
    ├── Caso 4: Festa São Judas (poucos disponíveis)
    ├── Caso 5: Ministro ultrapassou limite mensal
    ├── Caso 6: Domingo com muitas missas
    ├── Caso 7: Ministro inativo com questionário
    ├── Caso 8: Posição especial só para alguns
    ├── Caso 9: Ministro novo (primeira vez)
    └── Caso 10: Festa com muitos querendo servir
```

---

## 🎯 Roteiro de Estudo Sugerido

### Para Ministros:
```
1. Leia: GUIA_RAPIDO_ALGORITMO.md (5 min)
   → Entenda o básico

2. Consulte: EXPLICACAO_ALGORITMO_ESCALAS.md
   → Seções:
     - "De onde vem a informação"
     - "Como funciona a prioridade"
     - "Perguntas Frequentes"

3. Se tiver dúvidas específicas:
   → CASOS_PRATICOS_ESCALAS.md
   → Procure sua situação
```

### Para Coordenadores:
```
1. Leia: EXPLICACAO_ALGORITMO_ESCALAS.md (completo)
   → Base teórica

2. Estude: DIAGRAMA_FLUXO_ESCALAS.md
   → Visualize o processo

3. Pratique: CASOS_PRATICOS_ESCALAS.md
   → Todos os 10 casos

4. Mantenha à mão: GUIA_RAPIDO_ALGORITMO.md
   → Referência rápida no dia a dia
```

### Para Gestores/Desenvolvedores:
```
1. Leia todos os documentos (ordem recomendada):
   a) GUIA_RAPIDO_ALGORITMO.md
   b) EXPLICACAO_ALGORITMO_ESCALAS.md
   c) DIAGRAMA_FLUXO_ESCALAS.md
   d) CASOS_PRATICOS_ESCALAS.md

2. Compare com código-fonte:
   → /server/services/scheduleGenerator.ts

3. Valide exemplos práticos:
   → Gere escalas de teste
   → Compare resultados com documentação
```

---

## 🔍 Busca Rápida por Tópico

### Conceitos Básicos
- **O que é o algoritmo?** → [GUIA_RAPIDO_ALGORITMO.md](GUIA_RAPIDO_ALGORITMO.md#o-que-o-algoritmo-faz-em-3-frases)
- **De onde vem a informação?** → [EXPLICACAO_ALGORITMO_ESCALAS.md](EXPLICACAO_ALGORITMO_ESCALAS.md#etapa-1-coleta-de-informações)
- **Como funciona a prioridade?** → [EXPLICACAO_ALGORITMO_ESCALAS.md](EXPLICACAO_ALGORITMO_ESCALAS.md#etapa-4-atribuição-de-posições)

### Prioridades e Níveis
- **Sistema de 4 níveis** → [EXPLICACAO_ALGORITMO_ESCALAS.md](EXPLICACAO_ALGORITMO_ESCALAS.md#etapa-4-atribuição-de-posições)
- **Como desempata?** → [GUIA_RAPIDO_ALGORITMO.md](GUIA_RAPIDO_ALGORITMO.md#como-desempata)
- **Diagrama de prioridades** → [DIAGRAMA_FLUXO_ESCALAS.md](DIAGRAMA_FLUXO_ESCALAS.md#fluxo-atribuir-ministro-a-uma-posição)

### Regras Especiais
- **Casais (servir junto/separado)** → [CASOS_PRATICOS_ESCALAS.md](CASOS_PRATICOS_ESCALAS.md#caso-3-casal-quer-servir-junto)
- **Festa São Judas** → [CASOS_PRATICOS_ESCALAS.md](CASOS_PRATICOS_ESCALAS.md#caso-4-festa-de-são-judas)
- **Limite mensal (25 escalas)** → [CASOS_PRATICOS_ESCALAS.md](CASOS_PRATICOS_ESCALAS.md#caso-5-ministro-ultrapassou-o-limite-mensal)
- **Ministro inativo** → [CASOS_PRATICOS_ESCALAS.md](CASOS_PRATICOS_ESCALAS.md#caso-7-ministro-respondeu-questionário-mas-está-inativo)

### Situações Práticas
- **Todos querem a mesma posição** → [CASOS_PRATICOS_ESCALAS.md](CASOS_PRATICOS_ESCALAS.md#caso-1-todos-querem-a-mesma-posição)
- **Ninguém quer fazer Salmo** → [CASOS_PRATICOS_ESCALAS.md](CASOS_PRATICOS_ESCALAS.md#caso-2-ninguém-quer-fazer-o-salmo)
- **Domingo com muitas missas** → [CASOS_PRATICOS_ESCALAS.md](CASOS_PRATICOS_ESCALAS.md#caso-6-domingo-com-muitas-missas)
- **Ministro novo (primeira vez)** → [CASOS_PRATICOS_ESCALAS.md](CASOS_PRATICOS_ESCALAS.md#caso-9-ministro-novo-primeira-vez)

### Configuração e Uso
- **Checklist antes de gerar** → [GUIA_RAPIDO_ALGORITMO.md](GUIA_RAPIDO_ALGORITMO.md#checklist-antes-de-gerar-escalas)
- **Solução de problemas** → [GUIA_RAPIDO_ALGORITMO.md](GUIA_RAPIDO_ALGORITMO.md#solução-rápida-de-problemas)
- **Mensagens do sistema** → [GUIA_RAPIDO_ALGORITMO.md](GUIA_RAPIDO_ALGORITMO.md#entendendo-as-mensagens-do-sistema)
- **Dicas para melhores resultados** → [EXPLICACAO_ALGORITMO_ESCALAS.md](EXPLICACAO_ALGORITMO_ESCALAS.md#dicas-para-melhores-resultados)

---

## 📊 Comparação dos Documentos

| Documento | Público-Alvo | Profundidade | Uso Recomendado |
|-----------|--------------|--------------|-----------------|
| **Guia Rápido** | Todos | ⭐ | Consulta diária |
| **Explicação** | Coordenadores | ⭐⭐⭐ | Estudo inicial |
| **Diagrama** | Visual learners | ⭐⭐ | Complemento |
| **Casos Práticos** | Coordenadores | ⭐⭐⭐⭐ | Resolução de problemas |

---

## 🎓 Perguntas? Sugestões?

### Documentação Incompleta?
Se você encontrou algo que não está explicado:
1. Anote sua dúvida específica
2. Consulte o Guia Rápido primeiro
3. Se não encontrar, busque em Casos Práticos
4. Ainda com dúvida? Relate ao desenvolvedor

### Documentação Confusa?
Se algo não ficou claro:
1. Tente ler o mesmo tópico em outro documento
2. Veja os diagramas visuais
3. Procure exemplos práticos
4. Relate o trecho confuso para melhorias

---

## 📝 Informações Técnicas

### Arquivos do Sistema:
- **Código-fonte do algoritmo:** `/server/services/scheduleGenerator.ts`
- **Parser de questionários:** `/server/services/questionnaireParser.ts`
- **Interface de tipos:** Ver código-fonte

### Versão:
- **Documentação:** 1.0
- **Sistema:** 5.4.2
- **Última atualização:** Outubro 2025

### Compatibilidade:
- ✅ Funciona com questionários novos (estruturados)
- ✅ Funciona com questionários antigos (legado)
- ✅ Suporta casais/famílias
- ✅ Suporta eventos especiais

---

## 🔄 Histórico de Atualizações

### Versão 1.0 - Outubro 2025
- ✅ Criação inicial da documentação
- ✅ 4 documentos completos
- ✅ 10 casos práticos documentados
- ✅ Diagramas visuais incluídos
- ✅ Guia rápido de referência

---

## 💡 Como Usar Esta Documentação

### 1️⃣ Identificação do Perfil:
```
Sou ministro?
  → Leia: Guia Rápido + seções específicas da Explicação

Sou coordenador?
  → Leia: TUDO, na ordem sugerida acima

Sou gestor/desenvolvedor?
  → Leia: TUDO + compare com código-fonte
```

### 2️⃣ Consulta por Necessidade:
```
Preciso entender rápido?
  → Guia Rápido (5 min)

Tenho tempo para estudar?
  → Explicação (20 min) + Diagramas (10 min)

Tenho um problema específico?
  → Casos Práticos (encontre seu caso)

Quero apenas visualizar?
  → Diagramas de Fluxo
```

### 3️⃣ Referência Contínua:
- **Guia Rápido**: Imprima e mantenha próximo ao computador
- **Casos Práticos**: Marque os mais comuns para sua paróquia
- **Diagramas**: Use para treinar novos coordenadores

---

## ✅ Checklist de Compreensão

Após ler a documentação, você deve saber responder:

- [ ] De onde vem a disponibilidade dos ministros?
- [ ] De onde vem as preferências de posição?
- [ ] Quais são os 4 níveis de prioridade?
- [ ] O que acontece quando empata?
- [ ] Como funciona o limite de 25 escalas?
- [ ] O que é VACANT?
- [ ] Como funciona para casais?
- [ ] Quando usa "último recurso"?
- [ ] Por que às vezes fui escalado em posição que evito?
- [ ] Como melhorar os resultados da geração?

**Se respondeu SIM a todas**: ✅ Documentação bem compreendida!
**Se ficou com dúvidas**: 📖 Releia o documento específico do tópico

---

**Bom estudo! 📚**

Este conjunto de documentos foi criado para **desmistificar** o algoritmo
e permitir que **qualquer pessoa**, independente de conhecimento técnico,
possa entender, revisar e melhorar o processo de geração de escalas.
