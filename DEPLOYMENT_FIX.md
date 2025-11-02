# Correção do Erro de Deployment - Native Bindings

## Problema
O deployment falha com o erro:
```
Build failed due to esbuild error: Could not resolve "../pkg" in node_modules/lightningcss/node/index.js
```

Isso acontece porque o esbuild está tentando fazer bundle de pacotes com native bindings (lightningcss, sharp, bcrypt, better-sqlite3, etc.), o que não é possível.

## Soluções Disponíveis

### ✅ SOLUÇÃO 1: Modificar o package.json (RECOMENDADO)

Edite o arquivo `package.json` na linha 8 e adicione o flag `--packages=external`:

**ANTES:**
```json
"build": "node scripts/inject-version.js && vite build && esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist",
```

**DEPOIS:**
```json
"build": "node scripts/inject-version.js && vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
```

A única mudança é adicionar `--packages=external` antes de `--bundle`.

### ✅ SOLUÇÃO 2: Usar o script de build criado

Use o script bash que foi criado com a correção:

1. No arquivo `package.json`, linha 8, altere para:
```json
"build": "bash scripts/build-complete.sh",
```

### ✅ SOLUÇÃO 3: Adicionar variável de ambiente (COMPLEMENTAR)

Adicione ao arquivo `.replit` na seção `[env]`:

**ANTES:**
```toml
[env]
PORT = "5000"
```

**DEPOIS:**
```toml
[env]
PORT = "5000"
REPL_DISABLE_PACKAGE_CACHE = "1"
```

Esta variável desabilita o cache de pacotes e pode ajudar a garantir que todas as dependências de produção sejam instaladas corretamente.

## O que o flag --packages=external faz?

O flag `--packages=external` instrui o esbuild a **não fazer bundle** dos pacotes em `node_modules`. Em vez disso, esses pacotes são carregados em tempo de execução, o que é essencial para pacotes com native bindings que não podem ser bundled.

## Scripts Criados

Foram criados dois scripts bash para facilitar o processo:

1. **scripts/build-server.sh** - Faz build apenas do servidor com packages=external
2. **scripts/build-complete.sh** - Faz build completo (frontend + backend) com packages=external

Ambos já estão marcados como executáveis.

## Teste Local

Para testar se o build funciona antes de fazer deploy:

```bash
npm run build
```

Se o build for bem-sucedido localmente, o deployment também funcionará.

## Pacotes com Native Bindings no Projeto

Os seguintes pacotes têm native bindings e não podem ser bundled:
- `lightningcss` (usado pelo Tailwind/Vite)
- `sharp` (processamento de imagens)
- `bcrypt` (criptografia de senhas)
- `better-sqlite3` (banco de dados SQLite)
- Potencialmente outros dependendo das dependências transitivas

Por isso, é essencial usar `--packages=external` no build do servidor.
