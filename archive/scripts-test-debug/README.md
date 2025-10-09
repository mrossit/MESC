# Scripts Arquivados - Teste e Debug

**Data do Arquivamento:** 2025-10-09
**Motivo:** Limpeza de débito técnico - scripts temporários e de debug

## 📊 Resumo

- **Total arquivado:** 69 scripts
- **Tipos:** test-*.ts, debug-*.ts, check-*.ts
- **Impacto:** Redução de ~30-40% do diretório /scripts

## 📋 Categorias

### Scripts de Teste (test-*.ts)
Scripts criados para testar funcionalidades específicas durante o desenvolvimento:
- `test-login.ts` - Testes de autenticação
- `test-api-*.ts` - Testes de endpoints da API
- `test-family-*.ts` - Testes de funcionalidades de família
- `test-dashboard-*.ts` - Testes de dashboards
- `test-profile-*.ts` - Testes de perfil
- `test-password-reset.ts` - Testes de recuperação de senha
- `test-pending-api.ts` - Testes de pendências
- ... e mais 40+ scripts de teste

### Scripts de Debug (debug-*.ts)
Scripts criados para debugar problemas específicos:
- `debug-login.ts` - Debug de autenticação
- `debug-user-status.ts` - Debug de status de usuários
- ... e mais scripts de debug

### Scripts de Verificação (check-*.ts)
Scripts para verificar estado do sistema:
- `check-user.ts` - Verificar usuários
- `check-users.ts` - Listar usuários
- `check-user-status.ts` - Status de usuários
- ... e mais scripts de verificação

## ⚠️ Por Que Foram Arquivados?

1. **Débito Técnico:** 125 scripts no total, 69 eram temporários
2. **Manutenção:** Scripts ad-hoc criados para debugging pontual
3. **Não Usados:** Maioria não é mais utilizada no desenvolvimento
4. **Desorganização:** Misturados com scripts produtivos

## ✅ Alternativas Recomendadas

### Para Testes:
```bash
# Use testes automatizados ao invés de scripts manuais
npm run test

# Ou crie testes unitários em /test
npm run test:unit
```

### Para Debug:
```bash
# Use o debugger integrado
npm run dev:debug

# Ou adicione logs estruturados no código
import { logger } from './server/utils/logger';
logger.debug('Debug info', { data });
```

### Para Verificação:
```bash
# Use endpoints da API REST
curl http://localhost:5005/api/users

# Ou use o painel de administração
https://saojudastadeu.app/admin
```

## 🔧 Scripts Mantidos em /scripts (Produtivos)

Scripts que **PERMANECERAM** no diretório ativo:
- `backup-db.ts` - Backup do banco de dados
- `encrypt-religious-data.ts` - Migração de dados sensíveis (LGPD)
- `add-database-indexes.ts` - Otimização de performance
- `populate-formation-content.sql` - População de conteúdo

## 📖 Lições Aprendidas

1. ✅ **Criar testes automatizados** ao invés de scripts ad-hoc
2. ✅ **Usar logging estruturado** para debug permanente
3. ✅ **Documentar scripts produtivos** com README
4. ✅ **Limpar regularmente** scripts temporários

## 🚫 NÃO Restaurar

Estes scripts NÃO devem ser restaurados. Se precisar da funcionalidade:
1. Crie testes unitários apropriados em `/test`
2. Use o sistema de logging em `/server/utils/logger.ts`
3. Adicione endpoints de debug na API (somente em dev)

---

**Status:** ✅ ARQUIVADO - Mantido para referência histórica
**Auditoria:** CLAUDE_AUDIT_SUMMARY_4_Vangrey.md - Seção "Débito Técnico"
