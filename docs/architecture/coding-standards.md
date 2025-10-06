# Coding Standards - Sistema MESC

## Princípios Gerais

### 1. Type Safety First
- **TypeScript estrito** em todo o projeto
- Evitar `any` - usar `unknown` quando tipo é incerto
- Usar tipos explícitos em funções públicas
- Compartilhar tipos entre frontend e backend via `/shared`

### 2. Código Limpo e Legível
- Nomes descritivos para variáveis e funções
- Funções pequenas e com responsabilidade única
- Comentários apenas quando necessário (código auto-explicativo)
- Máximo 300 linhas por arquivo (exceto schemas)

### 3. Consistência
- Seguir padrões existentes no codebase
- Usar mesmas bibliotecas para problemas similares
- Manter estrutura de pastas organizada

## Convenções de Nomenclatura

### Arquivos
```typescript
// Components React: PascalCase
Dashboard.tsx
UserProfile.tsx
SubstitutionCard.tsx

// Utilities/Hooks: kebab-case
use-toast.ts
format-date.ts
api-client.ts

// Routes/Pages: PascalCase
Substitutions.tsx
Formation.tsx

// Backend routes: kebab-case
substitutions.ts
mass-pendencies.ts
questionnaire-admin.ts
```

### Variáveis e Funções
```typescript
// camelCase para variáveis e funções
const userName = "João";
function getUserById(id: string) { }

// PascalCase para componentes React
function UserCard() { }

// UPPER_SNAKE_CASE para constantes
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const API_BASE_URL = "https://api.example.com";

// Prefixos descritivos
const isActive = true;          // boolean
const hasPermission = false;    // boolean
const getUserList = () => { };  // função que retorna algo
const handleClick = () => { };  // event handler
```

### Tipos e Interfaces
```typescript
// PascalCase, descritivo
interface User {
  id: string;
  name: string;
}

type SubstitutionRequest = {
  scheduleId: string;
  requesterId: string;
};

// Prefixo "I" apenas se houver conflito de nomes
interface IUserService {
  getUser(id: string): Promise<User>;
}
```

## Estrutura de Código

### Components React

```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// Props interface sempre definida
interface UserCardProps {
  userId: string;
  onSelect?: (user: User) => void;
}

export function UserCard({ userId, onSelect }: UserCardProps) {
  // 1. Hooks primeiro
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/users", userId],
    queryFn: () => fetchUser(userId)
  });

  // 2. Funções auxiliares
  const handleClick = () => {
    if (onSelect && user) {
      onSelect(user);
    }
  };

  // 3. Early returns
  if (isLoading) return <div>Carregando...</div>;
  if (!user) return null;

  // 4. Render principal
  return (
    <div onClick={handleClick}>
      <h3>{user.name}</h3>
    </div>
  );
}
```

### Backend Routes

```typescript
import { Router } from "express";
import { db } from "../db";
import { authenticateToken, requireRole, AuthRequest } from "../auth";

const router = Router();

// GET endpoint - sempre com autenticação
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    // 1. Validação de input
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        message: "Parâmetros month e year são obrigatórios"
      });
    }

    // 2. Lógica de negócio
    const data = await db.select()
      .from(schedules)
      .where(/* conditions */);

    // 3. Resposta estruturada
    res.json({
      success: true,
      data
    });

  } catch (error) {
    // 4. Error handling consistente
    console.error("Error fetching schedules:", error);
    res.status(500).json({
      message: "Erro ao buscar escalas"
    });
  }
});

export default router;
```

## Error Handling

### Frontend
```typescript
// Use try-catch em mutations
const mutation = useMutation({
  mutationFn: async (data) => {
    const response = await fetch("/api/endpoint", {
      method: "POST",
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error("Failed to save");
    }

    return response.json();
  },
  onError: (error) => {
    toast({
      title: "Erro",
      description: error.message,
      variant: "destructive"
    });
  }
});
```

### Backend
```typescript
// Sempre catch errors e retornar resposta apropriada
try {
  const result = await someOperation();
  res.json({ success: true, data: result });
} catch (error) {
  console.error("Operation failed:", error);

  // Diferentes status codes para diferentes erros
  if (error.code === '23505') { // Unique violation
    return res.status(409).json({
      message: "Registro já existe"
    });
  }

  res.status(500).json({
    message: "Erro interno do servidor"
  });
}
```

## Database Queries (Drizzle)

### Boas Práticas
```typescript
// ✅ BOM: Type-safe query
const users = await db
  .select({
    id: users.id,
    name: users.name,
    email: users.email
  })
  .from(users)
  .where(eq(users.status, 'active'))
  .limit(10);

// ❌ EVITAR: Select *
const users = await db.select().from(users);

// ✅ BOM: Joins explícitos
const assignments = await db
  .select({
    schedule: schedules,
    minister: users.name
  })
  .from(schedules)
  .leftJoin(users, eq(schedules.ministerId, users.id));

// ✅ BOM: Usar transações quando necessário
await db.transaction(async (tx) => {
  await tx.insert(schedules).values(newSchedule);
  await tx.update(users).set({ lastService: new Date() });
});
```

## Validation

### Zod Schemas
```typescript
// Definir schemas reutilizáveis
const userSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(['ministro', 'coordenador', 'gestor'])
});

// Usar parse() para validar e gerar erro
const validatedData = userSchema.parse(input);

// Usar safeParse() quando quiser handling manual
const result = userSchema.safeParse(input);
if (!result.success) {
  console.error(result.error);
}
```

## Comments

### Quando Comentar
```typescript
// ✅ BOM: Explicar "por quê", não "o quê"
// Verificar se é último gestor antes de deletar
// para prevenir sistema sem administradores
if (user.role === 'gestor') {
  const activeGestores = await countActiveGestores();
  if (activeGestores <= 1) {
    throw new Error("Cannot delete last gestor");
  }
}

// ❌ EVITAR: Comentários óbvios
// Incrementar contador
counter++;

// ✅ BOM: TODOs com contexto
// TODO: Implementar paginação quando tiver mais de 1000 usuários
const users = await db.select().from(users);

// ✅ BOM: Avisos importantes
// IMPORTANT: Never update this without also updating the cache
await updateUser(id, data);
await invalidateCache(id);
```

## Git Commit Messages

### Formato
```
<type>: <description>

[optional body]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Types
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `refactor`: Refatoração de código
- `test`: Adição de testes
- `chore`: Tarefas de manutenção

### Exemplos
```
feat: add auto-substitute feature for mass assignments

Implemented automatic substitute assignment when minister requests
a substitution. System searches for available ministers based on
questionnaire responses.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Security

### Autenticação
```typescript
// ✅ Sempre validar usuário em rotas protegidas
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  // ...
});

// ✅ Validar permissões por role
router.delete("/:id",
  authenticateToken,
  requireRole(['gestor']),
  async (req, res) => {
    // ...
  }
);
```

### Sanitização
```typescript
// ✅ Validar e sanitizar inputs
const email = z.string().email().parse(input.email);

// ✅ Nunca retornar senhas
const { password, ...userWithoutPassword } = user;
res.json(userWithoutPassword);

// ✅ Hash passwords
const hashedPassword = await bcrypt.hash(password, 10);
```

## Performance

### Frontend
```typescript
// ✅ Memoizar cálculos pesados
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// ✅ Debounce em inputs de busca
const debouncedSearch = useMemo(
  () => debounce((value) => setSearchTerm(value), 300),
  []
);

// ✅ Lazy load de componentes pesados
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Backend
```typescript
// ✅ Usar indexes em queries frequentes
// Definir no schema
export const schedules = pgTable('schedules', {
  // ...
}, (table) => ({
  dateIdx: index('date_idx').on(table.date),
  ministerIdx: index('minister_idx').on(table.ministerId)
}));

// ✅ Limitar resultados
const users = await db.select()
  .from(users)
  .limit(100);

// ✅ Selecionar apenas campos necessários
const users = await db.select({
  id: users.id,
  name: users.name
}).from(users);
```

## Testing (Future)

### Estrutura de Testes
```typescript
describe('UserService', () => {
  it('should create a new user', async () => {
    const user = await createUser({
      name: "Test User",
      email: "test@example.com"
    });

    expect(user).toHaveProperty('id');
    expect(user.name).toBe("Test User");
  });
});
```

## Code Review Checklist

Antes de commit:
- [ ] Código segue convenções de nomenclatura
- [ ] Tipos TypeScript explícitos
- [ ] Error handling implementado
- [ ] Inputs validados com Zod
- [ ] Queries otimizadas (select específico, indexes)
- [ ] Autenticação/autorização verificada
- [ ] Logs adequados
- [ ] Sem console.log de debug
- [ ] Comentários removidos (código morto)
- [ ] Formatação consistente
