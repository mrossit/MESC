# Memória do Projeto - Sistema de Gerenciamento de Ministros (MESC)

## Visão Geral
Sistema web para gerenciamento de ministros e escalas de missas para a paróquia. 

## Stack Tecnológica
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Shadcn/ui, Wouter (routing), React Query
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Autenticação**: JWT, bcrypt, express-session

## Estrutura do Projeto
```
/
├── client/           # Frontend React
│   ├── src/
│   │   ├── components/ui/  # Componentes UI (Shadcn)
│   │   ├── hooks/          # Custom hooks (useAuth, etc)
│   │   ├── pages/          # Páginas da aplicação
│   │   └── App.tsx         # Router principal
├── server/           # Backend Express
│   ├── auth.ts       # Sistema de autenticação
│   ├── authRoutes.ts # Rotas de autenticação
│   ├── routes.ts     # Rotas da API
│   └── seedAdmin.ts  # Script para criar admin
├── shared/          
│   └── schema.ts     # Schemas compartilhados
└── public/          # Assets públicos
```

## Páginas Implementadas
1. **Landing** (`/`) - Página inicial pública
2. **Login** (`/login`) - Autenticação de usuários
3. **Dashboard** (`/dashboard`) - Painel principal (protegido)
4. **Ministers** (`/ministers`) - Gerenciamento de ministros (protegido)
5. **Schedules** (`/schedules`) - Escalas (protegido)
6. **Availability** (`/availability`) - Disponibilidade (protegido)
7. **Masses** (`/masses`) - Missas (protegido)

## Sistema de Autenticação
- Implementado com JWT e bcrypt
- Hook `useAuth` para gerenciar estado de autenticação no frontend
- Rotas protegidas só aparecem quando autenticado
- Session management com express-session

## Assets do Projeto
- `LogoSJT.png` - Logo da paróquia
- `icon_app.ico` / `icon_app.png` - Ícones da aplicação

## Scripts Disponíveis
- `npm run dev` - Desenvolvimento
- `npm run build` - Build de produção
- `npm run check` - Type checking
- `npm run db:push` - Atualizar schema no banco
- `npm run db:seed` - Criar usuário admin

## Status Atual
- Sistema base configurado e funcionando
- Autenticação implementada
- Estrutura de rotas definida
- UI components prontos (Shadcn/ui)
- Páginas principais criadas (mas ainda precisam de implementação completa)
- **Design System MESC implementado**: Seguindo DSD.md com cores litúrgicas
  - Light: Off-white (#F8F4ED), Vermelho queimado (#8B3A3A), Bege terroso (#D6C1A6)
  - Dark: Preto (#0a0a0a), Dourado litúrgico (#C9A86A), Cinza escuro (#2a2a2a)
- **Logo corrigido**: Imagem agora aparece corretamente em `/LogoSJT.png`
- **Login simplificado**: Removidas múltiplas telas, agora direto usuário/senha
- **Usuário master criado**: rossit@icloud.com / 123Pegou$&@

## Funcionalidades Implementadas Hoje
- **Sistema de Cadastro Público**: Usuários podem se cadastrar e aguardar aprovação
- **Página de Registro**: Formulário completo com tipos de ministério e observações
- **Sistema de Aprovação**: Coordenadores podem aprovar/rejeitar cadastros pendentes
- **Validação de Status**: Login verifica se usuário está pendente, ativo ou inativo

## Próximos Passos Sugeridos
1. Criar API endpoints para aprovação/rejeição de usuários
2. Adicionar página de aprovações ao menu do coordenador
3. Implementar notificações por email quando usuário for aprovado/rejeitado
4. Definir e implementar modelos de dados (masses, schedules)
5. Criar dashboard com estatísticas
6. Implementar lógica de escalas e disponibilidade

## Observações
- Projeto rodando em ambiente Replit
- Usando Neon Database (PostgreSQL serverless)
- Theme system implementado (light/dark mode)