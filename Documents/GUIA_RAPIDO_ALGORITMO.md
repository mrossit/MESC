# ⚡ Guia Rápido - Algoritmo de Escalas

> **Versão Ultra-Resumida para Consulta Rápida**

---

## 🎯 O que o algoritmo faz em 3 frases:

1. **Busca** todos os ministros que responderam o questionário
2. **Distribui** de forma justa nas missas do mês
3. **Prioriza** quem tem preferência pela posição e quem serviu menos

---

## 📋 De onde vem a informação?

| Dado | Origem | Quando usar |
|------|--------|-------------|
| **Disponibilidade de Dias** | Questionário Mensal | Para saber QUANDO o ministro pode |
| **Posições Preferenciais** | Cadastro do Ministro | Para saber QUAL posição ele prefere |
| **Posições a Evitar** | Cadastro do Ministro | Para saber qual posição ele NÃO quer |
| **Pode Substituir** | Questionário | Para emergências e eventos especiais |

---

## 🏆 Sistema de Prioridades (do melhor para o pior)

### Ao escolher ministro para uma posição:

```
🥇 NÍVEL 1: Ministro TEM a posição nas PREFERENCIAIS
   → Exemplo: Precisa M1, João tem M1 nas preferenciais
   → ✅ PERFEITO! João é escolhido

🥈 NÍVEL 2: Ministro escolheu no sistema antigo
   → ✅ BOM! É escolhido

🥉 NÍVEL 3: Ministro NÃO tem a posição em EVITAR
   → ⚠️ ACEITÁVEL. É escolhido

🔴 NÍVEL 4: Qualquer ministro (mesmo se está em EVITAR)
   → ❌ ÚLTIMO RECURSO. Melhor que vazio

❌ NÍVEL 5: Nenhum ministro disponível
   → Posição fica VACANT (vazia)
```

---

## ⚖️ Como Desempata (se vários querem a mesma posição)

```
Critério 1: Quem TEM a posição nas preferenciais?
           ↓ Empate
Critério 2: Quem serviu MENOS no mês?
           ↓ Empate
Critério 3: Menor número de posição preferida
```

**Exemplo:**
```
Precisa: Ministro 1

Candidatos:
- João: Tem M1 nas preferenciais, 2 escalas
- Maria: Tem M1 nas preferenciais, 5 escalas
- Pedro: Tem M1 nas preferenciais, 2 escalas

1º Critério: ✅ TODOS têm M1 nas preferenciais (empate)
2º Critério: João=2, Pedro=2, Maria=5
             → Empate entre João e Pedro (menos escalas)
3º Critério: M1 é igual para ambos
             → Sistema escolhe o primeiro da lista

RESULTADO: João ou Pedro (aleatório entre os empatados)
```

---

## 🚨 Regras Especiais

| Situação | O que acontece |
|----------|----------------|
| **Festa São Judas (28/10)** | Se faltar ministros, chama quem marcou "Pode substituir" |
| **Casais** | Se marcaram "servir juntos" = permite na mesma missa <br> Se marcaram "servir separados" = nunca na mesma missa |
| **Limite 25 escalas/mês** | Ministro que atingiu 25 não é mais escalado |
| **Status inativo** | Não entra na geração, mesmo com questionário |
| **Sem questionário** | Não é escalado (disponibilidade = zero) |

---

## ✅ Checklist Antes de Gerar Escalas

### Para ter bons resultados:

- [ ] Todos os ministros responderam o questionário?
- [ ] Cadastros estão atualizados (preferenciais/evitar)?
- [ ] Ministros inativos foram marcados como "inactive"?
- [ ] Data da geração está correta?
- [ ] Já gerou escalas deste mês antes? (vai substituir)

---

## 🔢 Exemplo Numérico Simples

### Entrada:
```
MISSA: Domingo 09h
PRECISA: 3 ministros (M1, M2, Salmo)

DISPONÍVEIS: 5 ministros
├─ João     - Preferencial: M1      - Escalas: 2
├─ Maria    - Preferencial: M2      - Escalas: 3
├─ Pedro    - Preferencial: Salmo   - Escalas: 1
├─ Ana      - Preferencial: nenhuma - Escalas: 4
└─ Carlos   - Preferencial: nenhuma - Escalas: 0
```

### Processamento:

**Posição M1:**
- João tem M1 nas preferenciais → ✅ João

**Posição M2:**
- Maria tem M2 nas preferenciais → ✅ Maria

**Posição Salmo:**
- Pedro tem Salmo nas preferenciais → ✅ Pedro

### Saída:
```
M1    : João   ✅ (preferência + 2 escalas)
M2    : Maria  ✅ (preferência + 3 escalas)
Salmo : Pedro  ✅ (preferência + 1 escala)

NÃO ESCALADOS:
- Ana (4 escalas) - Outros tinham preferência
- Carlos (0 escalas) - Outros tinham preferência
```

---

## 📊 Entendendo as Mensagens do Sistema

| Mensagem | Significado | Ação Necessária |
|----------|-------------|-----------------|
| `X/Y posições preenchidas` | X de Y posições foram escaladas | Se X < Y, revisar vazias |
| `VACANT` | Nenhum ministro disponível | Preencher manualmente |
| `🆘 Baixa disponibilidade` | Poucos ministros marcaram disponibilidade | Convidar mais ministros |
| `Incluiu substitutos` | Chamou quem pode substituir | Confirmar com os ministros |
| `✅ Geração completa` | Escala gerada com sucesso | Revisar e publicar |

---

## 🎓 Glossário Rápido

| Termo | O que significa |
|-------|-----------------|
| **Preferencial** | Posição que o ministro GOSTA de fazer |
| **Evitar** | Posição que o ministro PREFERE não fazer |
| **Disponibilidade** | Dias/horários que o ministro PODE servir |
| **VACANT** | Posição vazia (sem ministro) |
| **Substituição** | Ministro pode ser chamado em emergências |
| **Contador de escalas** | Quantas vezes o ministro serviu no mês |
| **Família** | Grupo de ministros relacionados (casais) |
| **Último recurso** | Escalar mesmo não sendo ideal |

---

## ❓ 5 Perguntas Mais Comuns

### 1. Por que não fui escalado?
**R:** Outros tinham preferência pela posição OU você já serviu muitas vezes.

### 2. Por que fui escalado numa posição que evito?
**R:** Último recurso. Não havia outro ministro disponível.

### 3. Posso ser escalado sem responder questionário?
**R:** NÃO. Sem questionário, disponibilidade = zero.

### 4. Como o sistema sabe minha preferência?
**R:** Pelo campo "Posições Preferenciais" no seu cadastro.

### 5. Posso mudar a escala depois de gerada?
**R:** SIM. Coordenadores podem editar tudo manualmente.

---

## 🔧 Solução Rápida de Problemas

| Problema | Solução |
|----------|---------|
| Muitos VACANT | → Verificar se ministros responderam questionário <br> → Ampliar disponibilidades <br> → Treinar ministros para posições difíceis |
| Sempre os mesmos escalados | → Verificar se outros marcaram preferências <br> → Verificar se outros responderam questionário <br> → Sistema já faz rodízio automático |
| Ministro em posição errada | → Ajustar manualmente <br> → Atualizar preferências do ministro <br> → Re-gerar escala |
| Casal na mesma missa | → Verificar preferência de família <br> → Se deve ser separado, ajustar cadastro |

---

## 💡 Dica de Ouro

> **O algoritmo é uma FERRAMENTA de AJUDA, não uma decisão final.**
>
> SEMPRE revise as escalas geradas e ajuste conforme necessário.
> O conhecimento pessoal dos coordenadores sobre os ministros
> é mais importante que qualquer algoritmo!

---

## 📞 Resumo em 1 Imagem

```
    MINISTRO
       |
       | Responde Questionário
       ↓
   [Disponibilidade]
       |
       | Marca Preferências
       ↓
   [Preferenciais/Evitar]
       |
       ↓
   ALGORITMO GERA ESCALA
       |
       ├→ Prioriza preferências
       ├→ Distribui de forma justa
       ├→ Respeita disponibilidade
       └→ Evita posições indesejadas
       |
       ↓
   ESCALA GERADA
       |
       | Coordenador Revisa
       ↓
   AJUSTES MANUAIS
       |
       ↓
   PUBLICAÇÃO
```

---

**Versão:** 5.4.2 | **Data:** Outubro 2025
**Tempo médio de geração:** 2-5 segundos para 1 mês completo
