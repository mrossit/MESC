# 🚨 CORREÇÃO URGENTE DE AUTENTICAÇÃO EM PRODUÇÃO

## Problema Identificado

Após a atualização do formatador de nomes (20/10/2025), usuários não conseguiam fazer login em produção mesmo com senha correta.

**Causa**: A busca de email no banco de dados era **case-sensitive**, mas os emails podiam estar cadastrados em diferentes formatos (ex: `Marco@Example.com` vs `marco@example.com`).

## Solução Aplicada

✅ **Normalização automática de emails para lowercase** em:
- Login (`server/auth.ts`)
- Registro de novos usuários (`server/auth.ts`)
- Reset de senha (`server/auth.ts`)

## ⚡ AÇÃO IMEDIATA NECESSÁRIA

### Passo 1: Deploy do Código
O código já foi corrigido. Faça o deploy normalmente.

### Passo 2: Executar Script de Migração
**IMPORTANTE**: Logo após o deploy, execute este comando no ambiente de produção:

```bash
tsx scripts/normalize-emails.ts
```

Este script vai:
- ✅ Converter todos os emails para lowercase
- ✅ Manter as senhas inalteradas
- ✅ Não perder nenhum dado
- ✅ Mostrar relatório de quantos emails foram atualizados

### Passo 3: Verificar Sucesso
Teste fazendo login com qualquer variação do email:
- `marco@example.com` ✅
- `MARCO@EXAMPLE.COM` ✅
- `Marco@Example.com` ✅

Todos devem funcionar!

## 📋 Arquivos Modificados

- `server/auth.ts` - Funções login, register, resetPassword
- `scripts/normalize-emails.ts` - Script de migração (NOVO)
- `scripts/DEPLOY_INSTRUCTIONS.md` - Instruções detalhadas (NOVO)
- `replit.md` - Documentação atualizada

## ✅ Status

- [x] Código corrigido
- [x] Build testado com sucesso
- [x] Script de migração criado
- [ ] **PENDENTE**: Executar script em produção
- [ ] **PENDENTE**: Testar login dos usuários

## 📞 Dúvidas?

Consulte `scripts/DEPLOY_INSTRUCTIONS.md` para instruções detalhadas passo a passo.
