# Sistema de Geração de Escalas - Algoritmo Alternativo

## 📋 Visão Geral

Este módulo adiciona um **algoritmo alternativo** de geração de escalas usando Python, permitindo comparar os resultados com o algoritmo atual sofisticado do sistema.

### ⚠️ Importante
- **O sistema atual NÃO foi modificado** - Todas as funcionalidades existentes continuam funcionando normalmente
- Este é um sistema **paralelo** para testes e comparação
- O algoritmo Python é **simplificado** para fins de comparação

## 🗂️ Estrutura de Arquivos

```
server/escala-alternativa/
├── controllers/
│   └── escalaController.ts      # Controladores das rotas
├── services/
│   └── pythonScheduleService.ts # Serviço para executar Python
├── routes/
│   └── escalaRoutes.ts          # Definição das rotas
└── scripts/
    └── gerar_escala.py          # Script Python do algoritmo
```

## 🔌 Endpoints Disponíveis

### 1. Verificar Python
**GET** `/api/escala-alternativa/check-python`

Verifica se Python3 está disponível no sistema.

**Headers:**
```
Authorization: Bearer <token-jwt>
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "pythonAvailable": true,
  "message": "Python3 está disponível no sistema"
}
```

### 2. Gerar Escala Alternativa
**POST** `/api/escala-alternativa/gerar`

Gera uma escala usando o algoritmo Python alternativo.

**Permissões:** Coordenador ou Gestor

**Headers:**
```
Authorization: Bearer <token-jwt>
X-CSRF-Token: <csrf-token>
```

**Body:**
```json
{
  "year": 2025,
  "month": 10
}
```

ou

```json
{
  "questionnaireId": "uuid-do-questionario"
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "algorithm": "python-alternative",
  "questionnaire": {
    "id": "...",
    "title": "Questionário Outubro 2025",
    "month": 10,
    "year": 2025
  },
  "data": [
    {
      "missa": "Domingo 08h",
      "ministro": "João Silva",
      "ministro_id": "uuid-ministro",
      "preferido": true,
      "atribuicoes_totais": 2
    }
  ],
  "stats": {
    "total_assignments": 80,
    "total_ministers": 25,
    "preferred_assignments": 60
  }
}
```

### 3. Comparar Algoritmos (Em Desenvolvimento)
**POST** `/api/escala-alternativa/comparar`

Compara os resultados do algoritmo atual vs alternativo.

**Permissões:** Gestor apenas

## 🔄 Diferenças entre os Algoritmos

### Algoritmo Atual (TypeScript) - `/api/schedules/generate`
✅ Fair Algorithm com limite de 4 missas/mês por ministro  
✅ Sunday Prioritization (Tier A/B)  
✅ Sistema de Família para casais  
✅ Integração completa com questionários  
✅ Eventos especiais (Finados, Nossa Senhora Aparecida)  
✅ Distribuição justa baseada em histórico  
✅ Posições litúrgicas específicas  

### Algoritmo Alternativo (Python) - `/api/escala-alternativa/gerar`
⚠️ Lógica simplificada de disponibilidade  
⚠️ Preferências básicas de horário  
⚠️ Distribuição justa simples (contador de atribuições)  
⚠️ 4 missas padrão fixas  
⚠️ Sem suporte a eventos especiais  

## 📊 Como Usar para Comparação

### Passo 1: Verificar Python
```bash
curl -X GET http://localhost:5000/api/escala-alternativa/check-python \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Passo 2: Gerar com Algoritmo Atual
```bash
curl -X POST http://localhost:5000/api/schedules/preview/2025/10 \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-CSRF-Token: SEU_CSRF_TOKEN"
```

### Passo 3: Gerar com Algoritmo Alternativo
```bash
curl -X POST http://localhost:5000/api/escala-alternativa/gerar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-CSRF-Token: SEU_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "month": 10}'
```

### Passo 4: Comparar Resultados
Compare manualmente os JSON retornados, observando:
- Distribuição de ministros por missa
- Número de atribuições preferidas
- Equilíbrio na distribuição
- Cobertura de todas as missas

## 🛠️ Desenvolvimento

### Modificar o Algoritmo Python

Edite o arquivo `server/escala-alternativa/scripts/gerar_escala.py` para ajustar a lógica:

```python
def gerar_escala(users, responses):
    # Sua lógica aqui
    # ...
    return escala
```

### Testar Script Python Diretamente

```bash
echo '{"users": [...], "responses": [...]}' | \
  python3 server/escala-alternativa/scripts/gerar_escala.py
```

## 🔐 Segurança

- Todos os endpoints requerem autenticação JWT
- CSRF protection habilitado
- Validação de permissões por role
- Input sanitization via Zod schemas

## 📝 Notas Técnicas

### Requisitos
- Python 3.11+ instalado no sistema
- Módulos Python padrão (json, sys, collections)

### Limitações Conhecidas
- Algoritmo Python não acessa banco de dados diretamente
- Não suporta todos os tipos de missa do sistema atual
- Não implementa sistema de família
- Não considera eventos especiais litúrgicos

## 🔮 Roadmap Futuro

- [ ] Implementar endpoint de comparação automática
- [ ] Adicionar métricas de qualidade (variância, cobertura)
- [ ] Dashboard de visualização comparativa
- [ ] Exportação de relatórios de comparação
- [ ] Testes automatizados de ambos os algoritmos

## 💡 Exemplo de Uso no Frontend

```typescript
// Verificar se Python está disponível
const checkPython = async () => {
  const response = await fetch('/api/escala-alternativa/check-python', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Gerar escala alternativa
const gerarAlternativa = async (year: number, month: number) => {
  const response = await fetch('/api/escala-alternativa/gerar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ year, month })
  });
  return response.json();
};
```

## ✅ Status da Implementação

- ✅ Script Python criado e funcional
- ✅ Serviço TypeScript para executar Python
- ✅ Endpoints REST configurados
- ✅ Autenticação e autorização
- ✅ Integração com questionários
- ✅ Sistema preservado 100% funcional
- ⏳ Endpoint de comparação (em desenvolvimento)
- ⏳ Interface frontend (planejado)

---

**Desenvolvido para MESC - Santuário São Judas Tadeu**  
Sistema de comparação de algoritmos de geração de escalas
