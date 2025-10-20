# 🚨 INSTRUÇÕES URGENTES DE DEPLOY - Correção de Autenticação

## Problema Identificado

Os usuários não conseguem fazer login em produção porque:

1. **Causa**: A busca de email era **case-sensitive** (diferenciava maiúsculas/minúsculas)
2. **Impacto**: Emails cadastrados como `Marco@Example.com` não conseguiam logar com `marco@example.com`
3. **Quando**: Após a atualização do formatador de nomes (commit fe34e31)

## Correção Aplicada

✅ Normalização de emails para **lowercase** em:
- Login (`server/auth.ts` - função `login`)
- Registro (`server/auth.ts` - função `register`)
- Reset de senha (`server/auth.ts` - função `resetPassword`)

## 📋 PASSOS OBRIGATÓRIOS PARA DEPLOY

### 1. Fazer Deploy do Código Corrigido

```bash
# O código já está corrigido, basta fazer o deploy normal
git add .
git commit -m "Fix: Normalize email to lowercase for case-insensitive authentication"
git push
```

### 2. **EXECUTAR SCRIPT DE NORMALIZAÇÃO EM PRODUÇÃO**

⚠️ **IMPORTANTE**: Execute este script **IMEDIATAMENTE** após o deploy em produção:

```bash
# No ambiente de produção, execute:
tsx scripts/normalize-emails.ts
```

Este script irá:
- Converter todos os emails existentes para lowercase
- Não alterar senhas (senhas permanecem as mesmas)
- Atualizar automaticamente todos os usuários
- Exibir relatório de quantos emails foram normalizados

### 3. Verificar que o Script Foi Executado com Sucesso

Você deve ver uma saída similar a:

```
🔄 Iniciando normalização de emails...

📊 Total de usuários encontrados: 150

✏️  Normalizando: Marco@Example.com → marco@example.com (Marco Silva)
✏️  Normalizando: MARIA@GMAIL.COM → maria@gmail.com (Maria Santos)
...

✅ Normalização concluída!
   - Emails atualizados: 45
   - Emails já normalizados: 105
   - Total processado: 150
```

### 4. Testar o Login

Após executar o script, teste imediatamente:
1. Faça login com um email que estava com problemas
2. Use o email em **qualquer combinação** de maiúsculas/minúsculas
3. Exemplo: `marco@example.com`, `MARCO@example.com`, `Marco@Example.com` - todos devem funcionar

## 🔍 Verificação de Sucesso

Execute esta query no banco de produção para confirmar que todos os emails estão em lowercase:

```sql
SELECT email, name 
FROM users 
WHERE email != LOWER(email);
```

**Resultado esperado**: 0 registros (todos os emails devem estar em lowercase)

## ⚠️ Se Algo Der Errado

Se houver problemas após o deploy:

1. **Erro de "email duplicado"**: 
   - Significa que há usuários com emails idênticos exceto por maiúsculas/minúsculas
   - Exemplo: `marco@test.com` e `Marco@test.com`
   - Solução: Identifique manualmente e mescle/desative um dos usuários

2. **Usuários ainda não conseguem logar**:
   - Verifique se o script foi executado com sucesso
   - Confirme que o código foi deployado corretamente
   - Verifique os logs de erro do servidor

## 📝 Checklist Final

- [ ] Código deployado em produção
- [ ] Script `normalize-emails.ts` executado com sucesso
- [ ] Verificação manual: todos os emails em lowercase
- [ ] Teste de login realizado com sucesso
- [ ] Usuários notificados que o problema foi resolvido

## 📞 Suporte

Se precisar de ajuda, verifique:
- Logs do servidor: procure por erros de autenticação
- Console do navegador: erros de API
- Banco de dados: query acima para verificar normalização
