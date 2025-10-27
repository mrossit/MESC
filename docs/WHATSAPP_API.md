# 📱 API de Integração WhatsApp - MESC

API REST para integração do sistema MESC com WhatsApp via Make (Integromat) + OpenAI.

## 🔐 Autenticação

Todas as rotas (exceto `/health`) requerem autenticação via **API Key**.

### Configurar API Key

1. No painel do Replit, vá em **Secrets**
2. Adicione a variável:
   ```
   WHATSAPP_API_KEY=sua-chave-super-segura-aqui
   ```
3. Gere uma chave forte (recomendado 32+ caracteres aleatórios)

### Como Enviar a API Key

**Opção 1: Header HTTP (Recomendado)**
```http
X-API-Key: sua-chave-super-segura-aqui
```

**Opção 2: Query Parameter**
```
?api_key=sua-chave-super-segura-aqui
```

---

## 📡 Endpoints

Total de **9 endpoints** disponíveis para consulta e gestão de escalas e substituições.

### Base URL
- **Desenvolvimento**: `http://localhost:5000/api/whatsapp`
- **Produção**: `https://saojudastadeu.replit.app/api/whatsapp`

---

### 1️⃣ Consultar Escala Específica

Retorna a escala de um ministro em uma data específica.

**Endpoint:** `POST /api/whatsapp/escala`

**Body:**
```json
{
  "telefone": "19998887766",
  "data": "2025-10-26"
}
```

**Observações:**
- `telefone`: Aceita qualquer formato (com/sem espaços, parênteses, traços)
- `data`: Formato YYYY-MM-DD (ISO 8601)

**Resposta (Encontrado):**
```json
{
  "encontrado": true,
  "ministro": "João da Silva",
  "data": "26/10/2025",
  "diaSemana": "Domingo",
  "horario": "09:00",
  "funcao": "Auxiliar 1",
  "local": "Santuário São Judas Tadeu",
  "tipo": "Missa",
  "observacoes": null
}
```

**Resposta (Não Encontrado):**
```json
{
  "encontrado": false,
  "mensagem": "Olá João da Silva! Você não está escalado para o dia 26/10/2025."
}
```

**Resposta (Ministro Não Cadastrado):**
```json
{
  "encontrado": false,
  "mensagem": "Ministro não encontrado com o telefone 19998887766. Verifique se o número está cadastrado."
}
```

---

### 2️⃣ Próximas Missas do Ministro

Retorna as 3 próximas missas escaladas para o ministro.

**Endpoint:** `POST /api/whatsapp/proximas`

**Body:**
```json
{
  "telefone": "19998887766"
}
```

**Resposta (Com Escalas):**
```json
{
  "encontrado": true,
  "ministro": "João da Silva",
  "totalProximas": 3,
  "proximasMissas": [
    {
      "data": "27/10/2025",
      "diaSemana": "Segunda",
      "horario": "07:00",
      "funcao": "Auxiliar 2",
      "local": "Santuário São Judas Tadeu",
      "tipo": "Missa",
      "observacoes": null
    },
    {
      "data": "03/11/2025",
      "diaSemana": "Domingo",
      "horario": "09:00",
      "funcao": "Auxiliar 1",
      "local": "Santuário São Judas Tadeu",
      "tipo": "Missa",
      "observacoes": null
    },
    {
      "data": "10/11/2025",
      "diaSemana": "Domingo",
      "horario": "19:00",
      "funcao": "Auxiliar 4",
      "local": "Santuário São Judas Tadeu",
      "tipo": "Missa",
      "observacoes": "Festa de São Judas"
    }
  ]
}
```

**Resposta (Sem Escalas):**
```json
{
  "encontrado": true,
  "ministro": "João da Silva",
  "proximasMissas": [],
  "mensagem": "Olá João da Silva! Você não tem escalas futuras no momento."
}
```

---

### 3️⃣ Próxima Escala do Ministro

Retorna apenas a **próxima escala** do ministro (a partir de hoje). Ideal para respostas rápidas no chatbot.

**Endpoint:** `POST /api/whatsapp/proxima-escala`

**Body:**
```json
{
  "telefone": "19998887766"
}
```

**Resposta (Escala Encontrada):**
```json
{
  "status": "ok",
  "encontrado": true,
  "ministro": "João da Silva",
  "escala": {
    "date": "2025-11-03",
    "data": "03/11/2025",
    "diaSemana": "Domingo",
    "horario": "09:00",
    "posicao": 1,
    "funcao": "Auxiliar 1",
    "celebracao": "Missa",
    "local": "Santuário São Judas Tadeu",
    "observacoes": null
  }
}
```

**Resposta (Sem Escalas Futuras):**
```json
{
  "status": "ok",
  "encontrado": false,
  "escala": null,
  "mensagem": "Olá João da Silva! Você não tem escalas futuras no momento."
}
```

**Diferença entre `/proximas` e `/proxima-escala`:**
- `/proximas`: Retorna até 3 missas futuras (mais completo)
- `/proxima-escala`: Retorna apenas a próxima (mais simples e direto)

---

### 4️⃣ Escalas do Mês

Retorna **todas as escalas** de um ministro em um mês específico.

**Endpoint:** `POST /api/whatsapp/escala-mes`

**Body:**
```json
{
  "telefone": "19998887766",
  "mes": 11,
  "ano": 2025
}
```

**Observações:**
- `mes`: Número de 1 a 12 (Janeiro = 1, Dezembro = 12)
- `ano`: Ano com 4 dígitos (ex: 2025)

**Resposta (Com Escalas):**
```json
{
  "status": "ok",
  "encontrado": true,
  "ministro": "João da Silva",
  "mes": "Novembro",
  "ano": 2025,
  "totalEscalas": 4,
  "escalas": [
    {
      "date": "2025-11-03",
      "data": "03/11/2025",
      "diaSemana": "Domingo",
      "horario": "09:00",
      "posicao": 1,
      "funcao": "Auxiliar 1",
      "celebracao": "Missa",
      "local": "Santuário São Judas Tadeu",
      "observacoes": null
    },
    {
      "date": "2025-11-10",
      "data": "10/11/2025",
      "diaSemana": "Domingo",
      "horario": "10:30",
      "posicao": 2,
      "funcao": "Auxiliar 2",
      "celebracao": "Missa",
      "local": "Santuário São Judas Tadeu",
      "observacoes": null
    },
    {
      "date": "2025-11-17",
      "data": "17/11/2025",
      "diaSemana": "Domingo",
      "horario": "19:00",
      "posicao": 3,
      "funcao": "Auxiliar 3",
      "celebracao": "Missa",
      "local": "Santuário São Judas Tadeu",
      "observacoes": null
    },
    {
      "date": "2025-11-24",
      "data": "24/11/2025",
      "diaSemana": "Domingo",
      "horario": "09:00",
      "posicao": 1,
      "funcao": "Auxiliar 1",
      "celebracao": "Missa",
      "local": "Capela Santo Antônio",
      "observacoes": "Festa do padroeiro"
    }
  ],
  "mensagem": null
}
```

**Resposta (Sem Escalas no Mês):**
```json
{
  "status": "ok",
  "encontrado": true,
  "ministro": "João da Silva",
  "mes": "Dezembro",
  "ano": 2025,
  "totalEscalas": 0,
  "escalas": [],
  "mensagem": "Você não tem escalas em Dezembro de 2025."
}
```

**Resposta (Mês Inválido):**
```json
{
  "erro": "Mês deve estar entre 1 e 12"
}
```

---

### 5️⃣ Colegas da Mesma Missa

Retorna todos os ministros escalados em uma missa específica.

**Endpoint:** `POST /api/whatsapp/colegas`

**Body:**
```json
{
  "data": "2025-10-27",
  "horario": "09:00"
}
```

**Observações:**
- `horario`: Aceita formato `HH:MM` ou `HH:MM:SS`

**Resposta (Missa Encontrada):**
```json
{
  "encontrado": true,
  "data": "27/10/2025",
  "diaSemana": "Domingo",
  "horario": "09:00",
  "totalMinistros": 8,
  "ministros": [
    {
      "nome": "João da Silva",
      "funcao": "Auxiliar 1",
      "telefone": "19998887766",
      "observacoes": null
    },
    {
      "nome": "Maria Santos",
      "funcao": "Auxiliar 2",
      "telefone": "19997776655",
      "observacoes": null
    },
    {
      "nome": "José Oliveira",
      "funcao": "Auxiliar 3",
      "telefone": "19996665544",
      "observacoes": null
    }
  ]
}
```

**Resposta (Missa Não Encontrada):**
```json
{
  "encontrado": false,
  "mensagem": "Nenhum ministro escalado para 27/10/2025 às 09:00."
}
```

---

### 6️⃣ Substituições em Aberto

Retorna lista de substituições disponíveis para aceite.

**Endpoint:** `GET /api/whatsapp/substituicoes-abertas`

**Query Parameters (opcionais):**
- `limite`: número de resultados (padrão 5, máximo 20)

**Exemplo de URL:**
```
/api/whatsapp/substituicoes-abertas?limite=10
```

**Resposta (Com Vagas):**
```json
{
  "encontrado": true,
  "totalVagas": 3,
  "vagas": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "data": "27/10/2025",
      "diaSemana": "Domingo",
      "horario": "09:00",
      "funcao": "Auxiliar 3",
      "local": "Santuário São Judas Tadeu",
      "ministroOriginal": "João da Silva",
      "telefoneOriginal": "19998887766",
      "motivo": "Viagem",
      "urgencia": "Média",
      "dataPublicacao": "25/10/2025"
    },
    {
      "id": "b2c3d4e5-f6g7-8901-bcde-f12345678901",
      "data": "03/11/2025",
      "diaSemana": "Domingo",
      "horario": "19:00",
      "funcao": "Auxiliar 2",
      "local": "Santuário São Judas Tadeu",
      "ministroOriginal": "Maria Santos",
      "telefoneOriginal": "19997776655",
      "motivo": "Compromisso familiar",
      "urgencia": "Alta",
      "dataPublicacao": "26/10/2025"
    }
  ]
}
```

**Resposta (Sem Vagas):**
```json
{
  "encontrado": false,
  "totalVagas": 0,
  "vagas": [],
  "mensagem": "Não há substituições disponíveis no momento."
}
```

---

### 7️⃣ Aceitar Substituição

Permite que um ministro aceite uma substituição via WhatsApp. A substituição fica com status "pending" aguardando aprovação do coordenador.

**Endpoint:** `POST /api/whatsapp/aceitar-substituicao`

**Body:**
```json
{
  "telefone": "19998887766",
  "id_substituicao": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "mensagem": "Posso substituir, sem problemas!"
}
```

**Observações:**
- `mensagem`: Campo opcional para o substituto enviar uma mensagem ao coordenador

**Resposta (Sucesso):**
```json
{
  "sucesso": true,
  "substituto": "Pedro Oliveira",
  "data": "27/10/2025",
  "diaSemana": "Domingo",
  "horario": "09:00",
  "funcao": "Auxiliar 3",
  "ministroOriginal": "João da Silva",
  "mensagem": "Substituição aceita com sucesso! Aguarde a aprovação do coordenador.",
  "proximoPasso": "O coordenador será notificado e aprovará sua substituição em breve."
}
```

**Resposta (Substituição Já Preenchida):**
```json
{
  "sucesso": false,
  "mensagem": "Esta substituição já foi aceita e aguarda aprovação."
}
```

**Resposta (Tentando Substituir a Si Mesmo):**
```json
{
  "sucesso": false,
  "mensagem": "Você não pode aceitar sua própria substituição."
}
```

---

### 8️⃣ Minhas Substituições

Retorna as substituições solicitadas ou aceitas pelo ministro.

**Endpoint:** `POST /api/whatsapp/minhas-substituicoes`

**Body:**
```json
{
  "telefone": "19998887766",
  "tipo": "todas"
}
```

**Observações:**
- `tipo`: Pode ser `"solicitadas"`, `"aceitas"` ou `"todas"` (padrão)

**Resposta (Com Substituições):**
```json
{
  "encontrado": true,
  "ministro": "João da Silva",
  "totalSubstituicoes": 2,
  "substituicoes": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "data": "27/10/2025",
      "diaSemana": "Domingo",
      "horario": "09:00",
      "funcao": "Auxiliar 3",
      "local": "Santuário São Judas Tadeu",
      "ministroOriginal": "João da Silva",
      "status": "Aguardando Aprovação",
      "motivo": "Viagem",
      "urgencia": "Média",
      "mensagem": "Pedro aceitou substituir"
    },
    {
      "id": "b2c3d4e5-f6g7-8901-bcde-f12345678901",
      "data": "20/10/2025",
      "diaSemana": "Domingo",
      "horario": "19:00",
      "funcao": "Auxiliar 1",
      "local": "Santuário São Judas Tadeu",
      "ministroOriginal": "Maria Santos",
      "status": "Aprovada",
      "motivo": "Doença",
      "urgencia": "Crítica",
      "mensagem": "Substituição emergencial"
    }
  ]
}
```

**Status Possíveis:**
- `Disponível` - Aguardando substituto
- `Aguardando Aprovação` - Substituto aceito, aguarda coordenador
- `Aprovada` - Coordenador aprovou
- `Rejeitada` - Coordenador rejeitou
- `Cancelada` - Ministro cancelou a solicitação
- `Auto-aprovada` - Aprovação automática pelo sistema

---

### 9️⃣ Health Check

Verifica se a API está funcionando.

**Endpoint:** `GET /api/whatsapp/health`

**Observações:** Não requer autenticação

**Resposta:**
```json
{
  "status": "ok",
  "service": "MESC WhatsApp API",
  "version": "1.0.0",
  "endpoints": 9,
  "timestamp": "2025-10-26T20:00:00.000Z"
}
```

---

## 🛠️ Integração com Make (Integromat)

### Exemplo de Fluxo no Make:

```
WhatsApp (Trigger)
    ↓
[Parse Message] → Extrai telefone e mensagem
    ↓
[HTTP Request] → Chama /api/whatsapp/proximas
    ↓
[OpenAI] → Formata resposta humanizada
    ↓
[WhatsApp] → Envia resposta ao usuário
```

### Configuração do Módulo HTTP no Make:

**URL:** `https://saojudastadeu.replit.app/api/whatsapp/proximas`

**Method:** `POST`

**Headers:**
```
X-API-Key: sua-chave-super-segura-aqui
Content-Type: application/json
```

**Body:**
```json
{
  "telefone": "{{phone}}"
}
```

---

## 🤖 Exemplos de Prompts para OpenAI

### Prompt 1: Formatação de Resposta Amigável
```
Você é um assistente virtual do Santuário São Judas Tadeu.

Dados recebidos:
{{http.response}}

Formate uma resposta amigável e clara para WhatsApp, incluindo:
- Saudação personalizada com o nome do ministro
- Lista das próximas missas em formato de lista
- Incentivo espiritual breve
- Despedida cordial

Mantenha o tom respeitoso e acolhedor.
```

### Prompt 2: Interpretação de Perguntas
```
Você é um assistente do MESC que ajuda ministros com suas escalas.

Pergunta do usuário: {{whatsapp.message}}

Identifique a intenção:
1. Se perguntar sobre próximas missas → retorne "proximas"
2. Se perguntar sobre uma data específica → retorne "escala|YYYY-MM-DD"
3. Se perguntar sobre colegas → retorne "colegas|YYYY-MM-DD|HH:MM"
4. Caso contrário → retorne "ajuda"
```

---

## ⚠️ Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Campos obrigatórios ausentes ou formato inválido |
| 401 | API Key inválida ou ausente |
| 500 | Erro interno do servidor ou API Key não configurada |

**Exemplo de Erro 401:**
```json
{
  "erro": "API key inválida ou ausente. Envie via header 'X-API-Key' ou query parameter 'api_key'"
}
```

**Exemplo de Erro 400:**
```json
{
  "erro": "Campos obrigatórios: telefone e data (formato YYYY-MM-DD)"
}
```

---

## 🔒 Segurança

1. ✅ **Nunca exponha a API Key** publicamente
2. ✅ Use **HTTPS** em produção (automático no Replit)
3. ✅ A API **não expõe emails ou senhas**
4. ✅ Números de telefone são **normalizados** automaticamente
5. ✅ Apenas ministros **ativos e cadastrados** são consultados

---

## 🔄 Fluxo Completo de Substituição via WhatsApp

### Cenário: Ministro Pede Substituição

1. **Ministro solicita substituição** no sistema web
2. **Sistema cria substituição** com status `available`
3. **Chatbot WhatsApp consulta vagas** via `/substituicoes-abertas`
4. **OpenAI formata lista** de vagas disponíveis
5. **Ministro substituto aceita** via `/aceitar-substituicao`
6. **Status muda para `pending`** (aguardando coordenador)
7. **Coordenador aprova** no sistema web
8. **Status muda para `approved`** (confirmado)
9. **Substituto recebe confirmação** via WhatsApp

---

## 📊 Testando a API

### Com cURL:

```bash
# Testar Health Check
curl https://saojudastadeu.replit.app/api/whatsapp/health

# Consultar próximas missas
curl -X POST https://saojudastadeu.replit.app/api/whatsapp/proximas \
  -H "X-API-Key: sua-chave-aqui" \
  -H "Content-Type: application/json" \
  -d '{"telefone":"19998887766"}'

# Consultar escala específica
curl -X POST https://saojudastadeu.replit.app/api/whatsapp/escala \
  -H "X-API-Key: sua-chave-aqui" \
  -H "Content-Type: application/json" \
  -d '{"telefone":"19998887766","data":"2025-10-27"}'

# Consultar colegas de missa
curl -X POST https://saojudastadeu.replit.app/api/whatsapp/colegas \
  -H "X-API-Key: sua-chave-aqui" \
  -H "Content-Type: application/json" \
  -d '{"data":"2025-10-27","horario":"09:00"}'

# Listar substituições abertas
curl -X GET 'https://saojudastadeu.replit.app/api/whatsapp/substituicoes-abertas?limite=5' \
  -H "X-API-Key: sua-chave-aqui"

# Aceitar uma substituição
curl -X POST https://saojudastadeu.replit.app/api/whatsapp/aceitar-substituicao \
  -H "X-API-Key: sua-chave-aqui" \
  -H "Content-Type: application/json" \
  -d '{"telefone":"19998887766","id_substituicao":"a1b2c3d4-1234-5678-90ab-cdef12345678","mensagem":"Posso substituir!"}'

# Consultar minhas substituições
curl -X POST https://saojudastadeu.replit.app/api/whatsapp/minhas-substituicoes \
  -H "X-API-Key: sua-chave-aqui" \
  -H "Content-Type: application/json" \
  -d '{"telefone":"19998887766","tipo":"todas"}'
```

### Com Postman:

1. **Method:** POST
2. **URL:** `https://saojudastadeu.replit.app/api/whatsapp/proximas`
3. **Headers:**
   - `X-API-Key`: `sua-chave-aqui`
   - `Content-Type`: `application/json`
4. **Body (raw JSON):**
```json
{
  "telefone": "19998887766"
}
```

---

## 📞 Suporte

Para problemas ou dúvidas sobre a API, entre em contato com a equipe de TI do Santuário.

**Versão:** 5.4.2  
**Última Atualização:** Outubro 2025
