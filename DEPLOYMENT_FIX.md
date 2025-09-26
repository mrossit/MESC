# 🚨 CORREÇÃO PARA DEPLOY - GERAÇÃO DE ESCALAS

## Problema
A geração de escalas retorna dados zerados em produção após o deploy.

## Solução Verificada

### 1. Compilar o Projeto ANTES do Deploy
```bash
npm run build
```

### 2. Verificar que o Build Compilou Corretamente
O arquivo `dist/index.js` deve ter aproximadamente 240kb

### 3. Limpar Cache do Navegador
- Fazer hard refresh (Ctrl+Shift+R ou Cmd+Shift+R)
- Ou abrir em aba anônima

### 4. Verificar Dados no Banco de Produção

Execute este script para verificar se há dados necessários:

```bash
NODE_ENV=production npx tsx scripts/check-ministers-data.ts
```

Você deve ter:
- ✅ Pelo menos 1 usuário com role "ministro" ou "coordenador" e status "active"
- ✅ Horários de missa configurados (table: mass_times_config)

### 5. Se Ainda Não Funcionar

Adicione logs para debug no arquivo `server/utils/scheduleGenerator.ts`:

```typescript
// Na linha 86, após loadMinistersData()
console.log('Ministers loaded:', this.ministers.length);

// Na linha 154, após loadAvailabilityData()
console.log('Availability data loaded:', this.availabilityData.size);

// Na linha 180, após loadMassTimesConfig()
console.log('Mass times loaded:', this.massTimes.length);
```

### 6. Ordem de Deploy Correta

1. `git add .`
2. `git commit -m "Fix schedule generation"`
3. `npm run build` (IMPORTANTE!)
4. Fazer o deploy no Replit
5. Aguardar restart completo
6. Limpar cache do navegador

### 7. Teste Rápido via API

Após o deploy, teste diretamente:

```bash
# Login
curl -X POST https://seu-app.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rossit@icloud.com","password":"123Pegou"}'

# Use o token retornado para testar o preview
curl https://seu-app.replit.app/api/schedules/preview/2025/9 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## Dados Esperados

O preview deve retornar algo como:
```json
{
  "success": true,
  "data": {
    "totalSchedules": 24,
    "averageConfidence": 0.8,
    "schedules": [...],
    "qualityMetrics": {
      "uniqueMinistersUsed": 4,
      "averageMinistersPerMass": 4,
      "highConfidenceSchedules": 24,
      "lowConfidenceSchedules": 0
    }
  }
}
```

## Verificação Final

Se tudo estiver OK, você verá no frontend:
- Preview mostrando escalas com ministros
- Confiança média > 0
- Métricas de qualidade preenchidas

## Contato para Suporte

Se o problema persistir após seguir todos os passos, verifique os logs do servidor no Replit Console.