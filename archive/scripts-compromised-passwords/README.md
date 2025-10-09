# Scripts Arquivados - Senhas Hardcoded

**Data do Arquivamento:** 2025-10-09
**Motivo:** Vulnerabilidade crítica de segurança

## ⚠️ ATENÇÃO

Estes scripts foram **REMOVIDOS** do projeto ativo por conterem **SENHAS HARDCODED**.

### Senhas Encontradas:
- `senha123` - Usado em múltiplos scripts de teste
- `Admin@2024` - Script de reset de senha do Rossit
- `september2024` - Script de admin temporário
- `Admin123456` - Scripts de criação simples
- `admin123` - Scripts locais

## 📋 Scripts Arquivados

### Scripts de Criação de Usuários (CRÍTICOS)
1. `create-rossit-user.ts` - Criava usuário com senha hardcoded
2. `reset-rossit-password.ts` - Resetava senha para valor conhecido
3. `create-temp-admin.ts` - Admin temporário com senha exposta
4. `create-simple-user.ts` - Criação simples com senha padrão
5. `create-local-user.ts` - Usuário local com senha hardcoded
6. `create-user-simple.ts` - Variação de criação simples
7. `populate-database.ts` - População com senhas padrão
8. `create-test-users.ts` - Usuários de teste com senhas conhecidas

### Scripts de Teste (MÉDIO RISCO)
9. `test-password-reset.ts` - Testes com senhas reais
10. `force-cache-invalidation.ts` - Cache com credenciais
11. `test-dashboard-coordenador.ts` - Testes de dashboard
12. `test-pending-api.ts` - Testes de API
13. `test-coordinator-self-role.ts` - Testes de roles
14. `test-family-api.ts` - Testes de família
15. `check-users.ts` - Verificação com credenciais
16. `reopen-september-questionnaire.ts` - Reabertura com auth

## 🚨 Impacto de Segurança

### Antes do Arquivamento:
- ✅ Qualquer pessoa com acesso ao repo podia criar admins
- ✅ Senhas conhecidas publicamente no código
- ✅ Risco de acesso não autorizado ao sistema

### Após Arquivamento:
- ✅ Scripts removidos do diretório ativo
- ✅ Não são mais importados ou executados
- ✅ Marcados como ARQUIVADOS no Git

## 🔐 Recomendações

### Para Criação de Usuários:
```bash
# Use a interface web de registro
https://saojudastadeu.app/register

# OU use o endpoint da API com dados fornecidos pelo usuário
curl -X POST /api/auth/register -d '{"email":"...","password":"..."}'
```

### Para Reset de Senha:
```bash
# Use o sistema de recuperação de senha
https://saojudastadeu.app/password-reset

# OU use o endpoint com código de verificação
curl -X POST /api/password-reset/request -d '{"email":"..."}'
```

### Para Testes:
```bash
# Use fixtures com dados gerados dinamicamente
npm run test -- --fixtures

# OU crie usuários via API em cada teste
beforeEach(async () => {
  const password = crypto.randomBytes(16).toString('hex');
  await createTestUser({ email: '...', password });
});
```

## 📊 Auditoria

**Arquivado por:** Claude (AI Assistant)
**Sob supervisão de:** Vangrey
**Referência:** CLAUDE_AUDIT_SUMMARY_4_Vangrey.md
**Vulnerabilidade:** CRÍTICO #1 - 18 senhas hardcoded

## ⚠️ NÃO RESTAURAR

**Estes scripts NÃO devem ser restaurados ao diretório ativo.**

Se precisar da funcionalidade, **REESCREVA sem senhas hardcoded**, usando:
- Variáveis de ambiente (`process.env.ADMIN_PASSWORD`)
- Prompts interativos (`readline`)
- Geração aleatória de senhas temporárias

---

**Status:** ✅ ARQUIVADO - NÃO USAR
