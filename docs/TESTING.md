# Testes - Sistema MESC

## 🧪 Visão Geral

Framework de testes completo usando **Vitest** + **React Testing Library** para garantir qualidade e confiabilidade do código.

---

## 📊 Estrutura de Testes

```
/test
├── setup.ts                 # Configuração global dos testes
├── unit/                    # Testes unitários
│   ├── components/          # Testes de componentes React
│   │   └── Button.test.tsx
│   ├── server/              # Testes de servidor
│   │   └── rateLimiter.test.ts
│   ├── utils.test.ts        # Testes de utilitários
│   ├── validation.test.ts   # Testes de validação Zod
│   ├── constants.test.ts    # Testes de constantes
│   └── auth.test.ts         # Testes de autenticação
├── integration/             # Testes de integração
│   └── schedules.test.ts    # Workflow completo de escalas
└── e2e/                     # Testes end-to-end (futuro)
```

---

## 🚀 Comandos

### Executar Testes

```bash
# Rodar todos os testes (modo interativo)
npm test

# Rodar testes uma vez (CI/CD)
npm run test:run

# Rodar com interface visual
npm run test:ui

# Rodar em modo watch (desenvolvimento)
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

### Rodar Testes Específicos

```bash
# Apenas testes de componentes
npm test -- components

# Apenas testes de servidor
npm test -- server

# Arquivo específico
npm test -- Button.test.tsx
```

---

## 📋 Tipos de Testes

### 1. Testes Unitários

Testam unidades isoladas de código (funções, componentes, utilitários).

**Exemplo - Componente:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

it('should call onClick when clicked', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  fireEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

**Exemplo - Função:**
```typescript
import { cn } from '@/lib/utils';

it('should merge class names', () => {
  const result = cn('text-red-500', 'bg-blue-500');
  expect(result).toBe('text-red-500 bg-blue-500');
});
```

### 2. Testes de Integração

Testam interação entre múltiplos componentes/módulos.

**Exemplo - Workflow de Escala:**
```typescript
it('should generate schedule for a month', async () => {
  // 1. Buscar questionários
  // 2. Processar disponibilidades
  // 3. Gerar escalas
  // 4. Verificar resultado

  expect(result.success).toBe(true);
  expect(result.schedulesCreated).toBeGreaterThan(0);
});
```

### 3. Testes E2E (Planejado)

Testam fluxos completos da aplicação do ponto de vista do usuário.

---

## 📈 Cobertura de Código

**Meta Atual: 40%** de cobertura em:
- Statements (linhas de código)
- Branches (condições if/else)
- Functions (funções)
- Lines (linhas executadas)

### Ver Relatório de Cobertura

```bash
npm run test:coverage

# Abrir relatório HTML
open coverage/index.html  # Mac
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### Áreas Cobertas

✅ **Componentes UI**:
- Button
- (Adicionar mais conforme implementado)

✅ **Utilitários**:
- `cn()` - Class name merger
- Validações Zod
- Constantes do sistema

✅ **Lógica de Negócio**:
- Rate limiting
- Horários de missa
- Formatos de data/hora

⏳ **Pendente**:
- Autenticação (mocks complexos)
- Geração de escalas (requer DB mock)
- Rotas de API (requer setup completo)

---

## 🛠️ Configuração

### vitest.config.ts

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      statements: 40,
      branches: 40,
      functions: 40,
      lines: 40,
    },
  },
});
```

### test/setup.ts

Configuração global executada antes de todos os testes:

- ✅ Cleanup automático após cada teste
- ✅ Mock de `window.matchMedia`
- ✅ Mock de `IntersectionObserver`
- ✅ Mock de `ResizeObserver`
- ✅ Matchers do jest-dom (`toBeInTheDocument`, etc)

---

## 📝 Boas Práticas

### 1. Organize por Funcionalidade

```typescript
describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with text', () => {
      // ...
    });
  });

  describe('Interactions', () => {
    it('should call onClick', () => {
      // ...
    });
  });
});
```

### 2. Use Descrições Claras

```typescript
// ❌ Ruim
it('works', () => {});

// ✅ Bom
it('should call onClick handler when clicked', () => {});
```

### 3. Teste Comportamentos, Não Implementação

```typescript
// ❌ Ruim - testa implementação
it('should set state to true', () => {});

// ✅ Bom - testa comportamento
it('should show success message after save', () => {});
```

### 4. Mock Apenas o Necessário

```typescript
// ✅ Mock de fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' }),
});
```

### 5. Cleanup de Mocks

```typescript
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks(); // Limpa todos os mocks antes de cada teste
});
```

---

## 🎯 O Que Testar?

### ✅ Prioridade Alta

1. **Lógica de Negócio Crítica**:
   - Geração de escalas
   - Auto-substituição
   - Validações de dados

2. **Componentes Reutilizáveis**:
   - Button, Input, Select
   - Cards, Dialogs
   - Forms

3. **Utilitários**:
   - Funções de formatação
   - Validações
   - Transformações de dados

4. **Security**:
   - Rate limiting
   - CSRF protection
   - Autenticação/Autorização

### ⏳ Prioridade Média

1. **Componentes de Página**:
   - Dashboard
   - Schedules
   - Ministers

2. **Hooks Customizados**:
   - useAuth
   - useCsrfToken
   - useToast

3. **API Routes**:
   - GET /api/schedules
   - POST /api/substitutions
   - etc.

### 🔽 Prioridade Baixa

1. **Componentes Muito Simples**:
   - Wrappers básicos
   - Componentes puramente visuais

2. **Código Gerado**:
   - Schema Drizzle
   - Tipos gerados

---

## 🐛 Debugging de Testes

### Ver Output de Componente

```typescript
import { render, screen, debug } from '@testing-library/react';

it('debug example', () => {
  render(<MyComponent />);
  screen.debug(); // Imprime HTML do componente
});
```

### Queries Disponíveis

```typescript
// Por texto
screen.getByText('Click me');

// Por role (mais semântico)
screen.getByRole('button', { name: 'Submit' });

// Por label
screen.getByLabelText('Email');

// Por placeholder
screen.getByPlaceholderText('Enter email...');

// Por test ID (último recurso)
screen.getByTestId('submit-button');
```

### Queries Assíncronas

```typescript
// Espera elemento aparecer (máx 1s)
const element = await screen.findByText('Success!');

// Espera elemento desaparecer
await waitForElementToBeRemoved(() => screen.getByText('Loading...'));
```

---

## 🔄 CI/CD Integration

### GitHub Actions (exemplo)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 📊 Relatórios

### Console Output

```
✓ test/unit/utils.test.ts (4)
  ✓ Utils (4)
    ✓ cn (className merger) (4)
      ✓ should merge class names correctly
      ✓ should handle conditional classes
      ✓ should filter out falsy values
      ✓ should override conflicting Tailwind classes

Test Files  6 passed (6)
     Tests  25 passed (25)
  Start at  15:30:00
  Duration  2.34s
```

### Coverage HTML

Relatório interativo mostrando:
- ✅ Linhas cobertas (verde)
- ❌ Linhas não cobertas (vermelho)
- ⚠️ Branches parcialmente cobertos (amarelo)

---

## 🎓 Recursos Adicionais

### Documentação

- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [User Event](https://testing-library.com/docs/user-event/intro/)

### Padrões Comuns

**Teste de Form Submission:**
```typescript
it('should submit form with valid data', async () => {
  const handleSubmit = vi.fn();
  render(<MyForm onSubmit={handleSubmit} />);

  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
  await userEvent.type(screen.getByLabelText('Password'), '123456');
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: '123456',
  });
});
```

**Teste de Loading State:**
```typescript
it('should show loading spinner', async () => {
  render(<MyComponent />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
```

---

## 📞 Ajuda

**Dúvidas sobre testes?**

1. Verificar se o teste está na pasta correta (`unit/`, `integration/`, `e2e/`)
2. Executar com `npm run test:ui` para debug visual
3. Verificar setup.ts para mocks globais
4. Consultar documentação do Vitest/Testing Library

**Testes falhando?**

1. Executar `npm run test -- --reporter=verbose` para mais detalhes
2. Usar `screen.debug()` para ver HTML renderizado
3. Verificar se mocks estão corretos
4. Limpar cache: `npm run test -- --clearCache`

---

**Última atualização**: Outubro 2025
**Versão**: 1.0
**Cobertura Atual**: ~20% (Meta: 40%)
**Responsável**: Equipe MESC DevOps
