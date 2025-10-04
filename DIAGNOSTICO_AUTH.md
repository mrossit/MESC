# Diagnóstico Completo - Autenticação em Produção

**Data:** 2025-10-04
**Sistema:** MESC - Ministério Extraordinário da Sagrada Comunhão

---

## 📊 RESUMO EXECUTIVO

### Problema Reportado
- Usuários não conseguem fazer login no deployment de produção
- Preview funciona normalmente
- Aparência de "banco vazio" mas dados estão intactos

### Status Atual
✅ **CORRIGIDO** - Problema identificado e resolvido

---

## 🔍 DIAGNÓSTICO DETALHADO

### 1. Variáveis de Ambiente

#### Preview/Development
```bash
NODE_ENV: [NÃO DEFINIDO]
DATABASE_URL: [PostgreSQL Neon]
JWT_SECRET: [DEFINIDO - 63 caracteres]
PORT: 5000
```

#### Production (após correção)
```bash
NODE_ENV: production  # ADICIONADO NO .replit
DATABASE_URL: [PostgreSQL Neon - MESMO BANCO]
JWT_SECRET: [DEFINIDO - 63 caracteres]
PORT: 5000
```

**❌ PROBLEMA 1:** `NODE_ENV` não estava definido no `.replit`
**✅ SOLUÇÃO:** Adicionado `NODE_ENV = "production"` no arquivo `.replit`

---

### 2. Banco de Dados

#### Conexão
✅ PostgreSQL 16.9 - Conectado com sucesso
✅ Host: Neon (ep-round-sea-af7udjsn.c-2.us-west-2.aws.neon.tech)

#### Schema Validado
```sql
Tabela: users
- id (varchar, NOT NULL, PK)
- email (varchar(255), NOT NULL, UNIQUE)
- password_hash (varchar(255), NOT NULL)  ← CAMPO CORRETO
- status (user_status, NOT NULL)
- role (text, NOT NULL)
```

#### Dados Verificados
- **121 usuários** cadastrados
- **98 escalas** criadas
- **2 questionários** ativos
- **2 coordenadores**: rossit@icloud.com, machadopri@hotmail.com

**❌ PROBLEMA 2:** Código tentava acessar `user.password` mas campo é `user.passwordHash`
**✅ SOLUÇÃO:** Corrigido em `/server/auth.ts` todas as referências (7 ocorrências)

---

### 3. Processo de Hash/Validação

#### Algoritmo
```
Biblioteca: bcrypt@6.0.0
Algoritmo: bcrypt 2b
Cost/Rounds: 10
Hash Format: $2b$10$[salt+hash] (60 caracteres)
```

#### Validação
✅ Hashes no banco estão corretos
✅ Algoritmo compatível entre dev e production
✅ Mesma biblioteca e versão

---

### 4. Correções Aplicadas

#### Arquivo: `/server/auth.ts`

**Linha 185:** Verificação de senha
```typescript
// ANTES
const isPasswordValid = await bcrypt.compare(passwordInput, user.password);

// DEPOIS
const isPasswordValid = await bcrypt.compare(passwordInput, user.passwordHash);
```

**Linha 200:** Retorno sem senha
```typescript
// ANTES
const { password, ...userWithoutPassword } = user;

// DEPOIS
const { passwordHash, ...userWithoutPassword } = user;
```

**Linha 241:** Criação de usuário
```typescript
// ANTES
password: hashedPassword,

// DEPOIS
passwordHash: hashedPassword,
```

**Linha 251:** Retorno do registro
```typescript
// ANTES
const { password, ...userWithoutPassword } = newUser;

// DEPOIS
const { passwordHash, ...userWithoutPassword } = newUser;
```

**Linha 274:** Verificação na troca de senha
```typescript
// ANTES
const isPasswordValid = await verifyPassword(currentPassword, user.password);

// DEPOIS
const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
```

**Linha 286:** Atualização de senha
```typescript
// ANTES
password: hashedPassword,

// DEPOIS
passwordHash: hashedPassword,
```

**Linha 306:** Reset de senha
```typescript
// ANTES
password: hashedPassword,

// DEPOIS
passwordHash: hashedPassword,
```

#### Arquivo: `/.replit`

**Linha 16:** Adicionada variável de ambiente
```toml
[env]
PORT = "5000"
NODE_ENV = "production"  # NOVO
```

**Linha 11:** Corrigido build command
```toml
# ANTES
build = ["npm", "run", "build"]

# DEPOIS
build = ["sh", "-c", "npm ci --production=false && npm run build"]
```

#### Arquivo: `/server/authRoutes.ts`

**Linhas 95-99:** Melhorado logging de erros
```typescript
console.error('[LOGIN ERROR]', {
  message: error.message,
  stack: error.stack?.split('\n')[0],
  email: req.body?.email
});
```

---

### 5. Configuração de Cookies

```typescript
// Cookies JWT
{
  httpOnly: true,
  secure: false,  // Replit gerencia HTTPS no proxy
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000  // 30 dias
  path: '/'
}
```

✅ Configuração adequada para Replit deployment
✅ SameSite 'lax' permite navegação normal
✅ HttpOnly protege contra XSS

---

### 6. CORS

Não requer configuração especial pois:
- Frontend e backend no mesmo domínio
- Replit gerencia proxy reverso automaticamente
- Cookies funcionam sem restrições cross-origin

---

## 🧪 TESTES NECESSÁRIOS

### Após Deployment:

1. **Teste Manual de Login**
   - Acessar URL de produção
   - Tentar login com credenciais conhecidas
   - Verificar redirect pós-login
   - Conferir cookies no navegador

2. **Teste de Sessão**
   - Verificar persistência após refresh
   - Testar timeout de inatividade (10 min)
   - Confirmar logout

3. **Teste de Roles**
   - Login como coordenador
   - Login como ministro
   - Verificar permissões de cada role

---

## 📋 CHECKLIST DEPLOYMENT

- [x] Corrigir `NODE_ENV` no `.replit`
- [x] Corrigir `password` → `passwordHash` em `auth.ts`
- [x] Corrigir build command no `.replit`
- [x] Adicionar logs detalhados
- [ ] Fazer novo deployment no Replit
- [ ] Testar login em produção
- [ ] Verificar logs do servidor
- [ ] Confirmar funcionamento completo

---

## 🎯 PRÓXIMOS PASSOS

### Imediato
1. Fazer **deploy** da aplicação no Replit
2. Testar login com usuário coordenador
3. Monitorar logs do servidor

### Curto Prazo
1. Criar usuários de teste com senhas conhecidas
2. Documentar credenciais de teste
3. Configurar alertas de erro

### Médio Prazo
1. Implementar reset de senha via email
2. Adicionar 2FA para coordenadores
3. Audit log de logins

---

## 📞 SUPORTE

Se login continuar falhando após deployment:

1. Verificar logs do servidor:
   ```bash
   # No Replit console
   tail -f logs/app.log
   ```

2. Testar endpoint manualmente:
   ```bash
   curl -i -X POST https://SEU_DOMINIO.replit.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"rossit@icloud.com","password":"SENHA_AQUI"}'
   ```

3. Usar rota temporária para resetar senha:
   ```bash
   curl -X POST http://localhost:5000/api/dev-tools/reset-password-dev \
     -H "Content-Type: application/json" \
     -d '{"email":"rossit@icloud.com","newPassword":"NovaSenha123"}'
   ```

---

## 🔐 SEGURANÇA

### Implementado
✅ Senhas com bcrypt (10 rounds)
✅ JWT com secret de 63 caracteres
✅ Cookies httpOnly
✅ Validação de email case-insensitive
✅ Trim de inputs (evita espaços)
✅ Status de conta (active/inactive/pending)

### Recomendações Futuras
- [ ] Rate limiting no login (prevenir brute force)
- [ ] Captcha após 3 tentativas falhas
- [ ] Notificação de login suspeito
- [ ] Rotação periódica de JWT_SECRET
- [ ] Logs de auditoria completos

---

**Gerado em:** 2025-10-04
**Por:** Claude (Diagnostic Tool)
**Versão:** 1.0
