# 📋 Instruções para Atualizar Disponibilidade de Finados - Produção

## 🎯 Objetivo
Atualizar as disponibilidades dos ministros para a **Missa de Finados** que ocorrerá em **02/11/2025 às 15h30 no Cemitério** e garantir que essa missa apareça automaticamente nos próximos questionários de Novembro.

---

## ✅ O que foi feito

### 1. Sistema de Safety Net (Segurança)
- ✅ Implementado sistema que previne perda de dados de questionários
- ✅ Campos `unmappedResponses` e `processingWarnings` adicionados
- ✅ Sistema testado e funcionando perfeitamente

### 2. Gerador de Questionários Atualizado
- ✅ Questionários de **Novembro** agora incluem automaticamente a pergunta:
  - **"Você pode servir em Missa de Finados às 15h30 (Cemitério) (02/11)?"**
- ✅ Essa pergunta aparecerá em todos os questionários de Novembro futuros

### 3. Script de Atualização para Produção
- ✅ SQL gerado para atualizar disponibilidades de **6 ministros**
- ✅ Script salvo em: `sql/production-update-finados-availability.sql`

---

## 📊 Ministros a Atualizar (6 total)

Todos marcados como **DISPONÍVEIS** para Finados:

1. rosana.piazentin@gmail.com
2. eliane.acquati@adv.oabsp.org.br
3. lucianourcioli70@gmail.com
4. ruthalmeidamorelli@gmail.com
5. almeida.miaco@yahoo.com.br
6. andre_amorim3@hotmail.com

---

## 🚀 PASSO A PASSO - Execute no Banco de PRODUÇÃO

### Passo 1: Acesse o Banco de Produção
1. Entre no painel da **Neon** (https://console.neon.tech)
2. Selecione o projeto **MESC**
3. Vá em **SQL Editor**

### Passo 2: Execute o SQL
1. Abra o arquivo: `sql/production-update-finados-availability.sql`
2. **Copie TODO o conteúdo** do arquivo
3. **Cole no SQL Editor** da Neon
4. Clique em **"Run"** ou pressione **Ctrl+Enter**

### Passo 3: Verifique os Resultados
O script irá:
1. Criar uma função auxiliar temporária
2. Atualizar cada ministro individualmente
3. Mostrar uma query SELECT com os resultados

**Resultado esperado:**
```
Ministro <id> atualizado com finados = true
```
Para cada um dos 6 ministros.

### Passo 4: Confira a Query de Verificação
No final do script, uma query SELECT mostrará todos os ministros atualizados:

```sql
SELECT 
  u.name,
  u.email,
  qr.responses->'special_events'->>'finados' as finados_disponivel
FROM questionnaire_responses qr
...
```

Você deve ver **6 linhas** com `finados_disponivel = true`.

---

## ⚠️ IMPORTANTE

### O que o script FAZ:
- ✅ Atualiza **APENAS** os 6 ministros do CSV
- ✅ Marca `finados: true` nos questionários de Novembro/2025
- ✅ Preserva todas as outras respostas existentes
- ✅ Atualiza tanto o campo `responses` quanto `special_events`

### O que o script NÃO FAZ:
- ❌ **NÃO** altera ministros que não estão no CSV
- ❌ **NÃO** cria a escala automaticamente
- ❌ **NÃO** remove dados existentes

### Próximos Passos Após Executar o SQL:
1. ✅ As disponibilidades de Finados estarão salvas
2. ✅ Você poderá gerar a escala de Novembro considerando esses dados
3. ✅ Futuros questionários de Novembro incluirão automaticamente a pergunta de Finados

---

## 🔄 Questionários Futuros

A partir de agora, **todo questionário de Novembro** incluirá automaticamente:

**Pergunta:**  
"Você pode servir em Missa de Finados às 15h30 (Cemitério) (02/11)?"

**Opções:**
- Sim
- Não

Essa pergunta aparecerá como `special_event_1` e será processada automaticamente pelo sistema.

---

## 🆘 Suporte

Se encontrar algum problema:

1. **Ministro não encontrado**: Verifique se o email está correto no banco de produção
2. **Resposta não atualizada**: Verifique se o ministro já respondeu o questionário de Novembro/2025
3. **Erro no SQL**: Entre em contato e forneça a mensagem de erro completa

---

## 📝 Checklist Final

Antes de executar no banco de produção:

- [ ] Arquivo `sql/production-update-finados-availability.sql` revisado
- [ ] Acesso ao painel Neon confirmado
- [ ] SQL Editor aberto
- [ ] Backup/snapshot do banco (opcional, mas recomendado)
- [ ] SQL executado
- [ ] Resultados verificados
- [ ] 6 ministros confirmados com finados = true

---

**Data de criação deste guia:** 31/10/2025  
**Versão do sistema:** 5.4.2 com Safety Net implementado
