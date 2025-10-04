# Fixed Footer - Menu Inferior Sobreposto

Menu de navegação fixo na base da tela com 4 botões principais: **HOME**, **ESCALA**, **SUBSTITUIÇÕES** e **PERFIL**.

## 📋 Visão Geral

O Fixed Footer é um componente de navegação sobreposto (overlay) que permanece sempre visível na base da tela, em mobile e desktop. Oferece:

- ✅ Navegação rápida entre páginas principais
- ✅ Badges de notificação em tempo real
- ✅ Indicadores visuais de rota ativa
- ✅ Persistência de última rota visitada
- ✅ Suporte completo a acessibilidade (ARIA)
- ✅ Responsividade mobile-first com safe areas
- ✅ Polling fallback (15s) + WebSocket futuro

## 🏗️ Arquitetura

### Componentes

```
client/src/components/
├── FixedFooter.tsx          # Componente React principal
└── __tests__/
    └── FixedFooter.test.tsx  # Testes unitários

client/src/index.css          # Estilos CSS (linhas 534-772)

server/routes/
└── footer.ts                 # Endpoints da API

migrations/
└── add_footer_support.sql    # Migração do banco de dados
```

### Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/escala/unread-count?user_id={PID}` | Contagem de escalas não lidas |
| `POST` | `/api/escala/mark-seen` | Marca escalas como vistas |
| `GET` | `/api/user/{userId}/profile-alert` | Verifica alertas de perfil |
| `POST` | `/api/navigation/log` | Registra navegação (analytics) |
| `GET` | `/api/navigation/stats` | Estatísticas de navegação (admin) |

### Banco de Dados

**Tabela: `navigation_logs`**
```sql
CREATE TABLE navigation_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  route VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip VARCHAR(45)
);
```

**Coluna adicionada: `users.last_seen_schedules`**
```sql
ALTER TABLE users ADD COLUMN last_seen_schedules TIMESTAMP;
```

## 🚀 Instalação e Deploy

### 1. Executar Migração

```bash
psql $DATABASE_URL -f migrations/add_footer_support.sql
```

### 2. Verificar Rotas Registradas

Confirme que estas linhas existem em `server/routes.ts`:

```typescript
// Fixed Footer routes
app.use('/api/escala', (await import('./routes/footer')).default);
app.use('/api/user', (await import('./routes/footer')).default);
app.use('/api/navigation', (await import('./routes/footer')).default);
```

### 3. Verificar Integração no Layout

Confirme que `client/src/components/layout.tsx` importa e renderiza o footer:

```tsx
import { FixedFooter } from "@/components/FixedFooter";

export function Layout({ children, title, subtitle }: LayoutProps) {
  return (
    <SidebarProvider>
      {/* ... resto do layout ... */}

      <FixedFooter />
    </SidebarProvider>
  );
}
```

### 4. Build e Deploy

```bash
npm run build
npm start
```

## ⚙️ Configuração

### Variáveis CSS

Personalize as cores e dimensões em `client/src/index.css`:

```css
:root {
  --footer-height: 64px;                    /* Altura do footer */
  --footer-bg: var(--color-beige-light);    /* Cor de fundo */
  --footer-border-top: rgba(0, 0, 0, 0.06); /* Borda superior */
  --footer-item-color: var(--color-text-primary); /* Cor dos itens */
  --footer-item-active: linear-gradient(...); /* Gradiente ativo */
  --footer-icon-size: 22px;                 /* Tamanho dos ícones */
}
```

### Intervalo de Polling

O footer busca atualizações de badges a cada **15 segundos**. Para alterar:

```tsx
// client/src/components/FixedFooter.tsx

const { data: unreadData } = useQuery<UnreadCount>({
  // ...
  refetchInterval: 15000 // Altere aqui (em milissegundos)
});
```

## 📱 Responsividade

### Mobile (< 360px)
- Altura: 64px
- Ícones: 20px
- Labels sempre visíveis

### Tablet/Desktop (>= 1024px)
- Altura: 56px
- Ícones: 22px
- Labels apenas no hover (opcional)

### Safe Areas (iOS)
O footer detecta automaticamente `safe-area-inset-bottom` para evitar sobreposição em dispositivos com notch/home indicator.

## 🎨 Estados Visuais

### Rota Ativa
- Fundo com gradiente verde
- Texto branco
- Transform translateY(-4px)
- Shadow elevado

### Badge de Escalas Não Lidas
- Badge vermelho (#DC2626)
- Número até 9, depois "9+"
- Animação de pop ao aparecer

### Dot de Alerta de Perfil
- Ponto vermelho pulsante
- Aparece quando perfil incompleto

## 🔒 Segurança

### Autenticação
Todos os endpoints exigem autenticação:
- Token Bearer em headers
- Validação de `user_id` no backend
- **Nunca usa senha como chave**

### Privacidade
- Logs de navegação são opcionais
- IP e user-agent armazenados anonimamente
- Dados agregados apenas para analytics

## 🧪 Testes

### Unitários

```bash
npm test -- FixedFooter.test.tsx
```

**Cobertura:**
- ✅ Renderização dos 4 botões
- ✅ Estado ativo baseado em rota
- ✅ Navegação entre páginas
- ✅ Badges e notificações
- ✅ Acessibilidade (ARIA)
- ✅ Persistência no localStorage

### E2E (Playwright/Cypress)

```bash
# TODO: Implementar testes E2E
npx playwright test footer
```

**Casos de teste:**
1. Footer aparece visível após login
2. Clicar em HOME navega para `/`
3. Badge aparece com unread count > 0
4. Rota salva é restaurada após reload
5. Labels responsivas em mobile/desktop

### Visual Regression

```bash
# Baseline
npx playwright test --update-snapshots footer-visual

# Comparação
npx playwright test footer-visual
```

## 📊 Analytics e Logs

### Visualizar Estatísticas

```bash
curl -X GET http://localhost:5000/api/navigation/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resposta:**
```json
[
  {
    "route": "home",
    "visits": 1523,
    "unique_users": 87,
    "last_visit": "2025-10-04T15:30:00Z"
  },
  {
    "route": "escala",
    "visits": 892,
    "unique_users": 65,
    "last_visit": "2025-10-04T15:29:45Z"
  }
]
```

### Desabilitar Logs de Navegação

Se não quiser armazenar logs (GDPR compliance):

```typescript
// server/routes/footer.ts

router.post('/log', async (req: AuthRequest, res: Response) => {
  // Comentar ou remover a inserção no banco
  // await db.execute(sql`INSERT INTO navigation_logs ...`);

  res.json({ success: true }); // Apenas retorna sucesso
});
```

## 🐛 Troubleshooting

### Footer não aparece

**Problema:** Footer não é renderizado na página.

**Solução:**
1. Verificar se `<FixedFooter />` está no `layout.tsx`
2. Verificar se há erro no console do navegador
3. Confirmar que estilos CSS foram carregados (inspecionar elemento `.fixed-footer`)

### Badges não atualizam

**Problema:** Contagem de escalas não atualiza.

**Solução:**
1. Verificar endpoint `/api/escala/unread-count` retorna JSON válido:
   ```bash
   curl http://localhost:5000/api/escala/unread-count?user_id=YOUR_ID
   ```
2. Verificar coluna `last_seen_schedules` existe na tabela `users`
3. Aumentar intervalo de polling se servidor estiver lento

### Footer sobrepõe conteúdo

**Problema:** Footer bloqueia elementos importantes.

**Solução:**
1. Adicionar `.footer-spacer` ao final do `<main>`:
   ```tsx
   <main className="flex-1 overflow-y-auto">
     {children}
     <div className="footer-spacer" />
   </main>
   ```
2. Ajustar `--footer-height` no CSS se necessário

### Navegação não funciona

**Problema:** Clicar nos botões não muda a rota.

**Solução:**
1. Verificar se `wouter` está instalado:
   ```bash
   npm install wouter
   ```
2. Confirmar que rotas existem em `client/src/App.tsx`
3. Verificar console para erros de JavaScript

## 🔄 Rollback

Se precisar reverter a implementação:

### 1. Remover do Layout

```tsx
// client/src/components/layout.tsx
// Comentar ou deletar:
// import { FixedFooter } from "@/components/FixedFooter";
// <FixedFooter />
```

### 2. Reverter Migração

```bash
psql $DATABASE_URL << EOF
ALTER TABLE users DROP COLUMN IF EXISTS last_seen_schedules;
DROP TABLE IF EXISTS navigation_logs CASCADE;
EOF
```

### 3. Remover Rotas

```typescript
// server/routes.ts
// Comentar ou deletar:
// app.use('/api/escala', ...);
// app.use('/api/user', ...);
// app.use('/api/navigation', ...);
```

### 4. Rebuild

```bash
npm run build
npm start
```

## 📚 Referências

- **Wouter (Router):** https://github.com/molefrog/wouter
- **React Query:** https://tanstack.com/query/latest
- **Lucide Icons:** https://lucide.dev
- **ARIA Best Practices:** https://www.w3.org/WAI/ARIA/apg/

## 🤝 Contribuindo

### Adicionar Nova Rota ao Footer

1. Adicionar ao array `ROUTES` em `FixedFooter.tsx`:
   ```tsx
   {
     id: 'admin',
     path: '/admin',
     label: 'ADMIN',
     icon: Shield,
     ariaLabel: 'Ir para Admin'
   }
   ```

2. Atualizar estilos se necessário (ajustar `gap` ou `max-width`)

3. Adicionar rota no router principal (`App.tsx`)

### Adicionar Novo Badge

1. Criar endpoint da API (ex: `/api/admin/notifications`)

2. Adicionar query no componente:
   ```tsx
   const { data: adminNotif } = useQuery({
     queryKey: ['/api/admin/notifications', user?.id],
     queryFn: async () => { /* ... */ },
     refetchInterval: 15000
   });
   ```

3. Renderizar badge condicionalmente no JSX

## 📄 Licença

MIT - Projeto interno SJT MESC

---

**Última atualização:** 2025-10-04
**Versão:** 1.0.0
**Autor:** Claude (Anthropic)
