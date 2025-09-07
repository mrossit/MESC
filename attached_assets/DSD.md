# Design System Document (DSD) - MESC

## Design System de Referência

### Cores Principais

#### Light Mode
- **Primary**: `#8B3A3A` (Vermelho queimado - ações primárias)
- **Secondary**: `#D6C1A6` (Bege terroso - elementos secundários)
- **Background**: `#F8F4ED` (Off-white suave - fundo principal)
- **Text**: `#3A2F26` (Marrom escuro - texto padrão)

#### Dark Mode
- **Primary**: `#C9A86A` (Dourado litúrgico - destaque)
- **Secondary**: `#2a2a2a` (Cinza escuro secundário)
- **Background**: `#0a0a0a` (Preto quase puro - fundo)
- **Text**: `#f5f5f5` (Texto claro)

#### Paleta Completa MESC
```css
--mesc-off-white: #F8F4ED;     /* Fundo claro - Off-white suave */
--mesc-bronze: #5C4033;         /* Fundo escuro - Bronze profundo */
--mesc-gold: #C9A86A;           /* Destaques - Dourado litúrgico */
--mesc-red: #8B3A3A;            /* Ação primária - Vermelho queimado */
--mesc-text: #3A2F26;           /* Texto padrão - Marrom escuro */
--mesc-text-light: #F3E9D2;     /* Texto invertido - Creme claro */
--mesc-beige: #D6C1A6;          /* Detalhes suaves - Bege terroso */
--mesc-gold-dark: #A07C48;      /* Dourado escurecido - Hover */
--mesc-terracotta: #A05244;     /* Terracota envelhecida - Cards */
--mesc-sand: #E9DCC9;           /* Areia litúrgica - Fundos alternados */
```

### Estilo Visual

#### Cards
- **Border Radius**: `0.75rem` (12px)
- **Border**: `1px solid` com cor `border` (var(--border))
- **Background**: `bg-card` (branco no light, #141414 no dark)
- **Shadow**: `shadow-sm` padrão, `shadow-liturgical` para destaque especial
- **Padding**: `p-6` (24px) para header/content/footer

```tsx
// Exemplo de Card
<Card className="rounded-lg border bg-card text-card-foreground shadow-sm">
  <CardHeader className="p-6">
    <CardTitle className="text-2xl font-semibold">Título</CardTitle>
    <CardDescription className="text-sm text-muted-foreground">
      Descrição
    </CardDescription>
  </CardHeader>
  <CardContent className="p-6 pt-0">
    {/* Conteúdo */}
  </CardContent>
</Card>
```

#### Bordas
- **Radius Base**: `--radius: 0.75rem`
- **Radius Variações**:
  - `rounded-lg`: var(--radius)
  - `rounded-md`: calc(var(--radius) - 2px)
  - `rounded-sm`: calc(var(--radius) - 4px)
- **Border Color**: Usa variável CSS `--border`

#### Espaçamento Consistente
- **Padding Padrão**: 
  - Mobile: `p-4` (16px)
  - Desktop: `p-6` (24px)
- **Gap em Grids/Flex**: `gap-4` (16px) ou `gap-6` (24px)
- **Margin entre seções**: `space-y-6` (24px)

#### Hover Effects Suaves com Transições
- **Duração padrão**: `transition-colors` (150ms)
- **Botões**: `hover:bg-primary/90` (opacidade reduzida)
- **Cards/Links**: `hover:bg-accent hover:text-accent-foreground`
- **Animações especiais**:
  - Accordion: `0.2s ease-out`
  - Collapsible: `duration-200`

### Componentes Padrão

#### Button
```tsx
// Variantes disponíveis
<Button variant="default">Primário</Button>  // bg-primary hover:bg-primary/90
<Button variant="secondary">Secundário</Button>  // bg-secondary hover:bg-secondary/80
<Button variant="outline">Outline</Button>  // border hover:bg-accent
<Button variant="ghost">Ghost</Button>  // hover:bg-accent
<Button variant="destructive">Destrutivo</Button>  // bg-destructive
<Button variant="link">Link</Button>  // text-primary underline

// Tamanhos
<Button size="sm">Pequeno</Button>  // h-9 px-3
<Button size="default">Padrão</Button>  // h-10 px-4 py-2
<Button size="lg">Grande</Button>  // h-11 px-8
<Button size="icon">Ícone</Button>  // h-10 w-10
```

#### Input
```tsx
<Input 
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
  placeholder="Digite aqui..."
/>
```

#### Alert
```tsx
<Alert variant="default">
  <AlertTitle>Título do Alerta</AlertTitle>
  <AlertDescription>Descrição do alerta aqui.</AlertDescription>
</Alert>
```

#### Typography
- **Font Family**: `'Inter', system-ui, sans-serif`
- **Font Weights**: 300, 400, 500, 600, 700
- **Heading Sizes**:
  - h1: `text-4xl font-bold`
  - h2: `text-2xl font-semibold`
  - h3: `text-xl font-semibold`
  - h4: `text-lg font-medium`
- **Body Text**: `text-base` (16px) ou `text-sm` (14px)
- **Muted Text**: `text-muted-foreground`

### Estrutura de Layout

#### Sidebar com Recolhimento à Esquerda
- **Largura Expandida**: Automática baseada no conteúdo
- **Largura Recolhida**: Apenas ícones (collapsible="icon")
- **Posição**: Fixa à esquerda
- **Background**: `var(--sidebar)` (#5C4033 light, #0f0f0f dark)
- **Foreground**: `var(--sidebar-foreground)` (texto claro)

#### Header com Altura Fixa
- **Altura Mobile**: `h-14` (56px)
- **Altura Desktop**: `h-16` (64px)
- **Position**: `sticky top-0`
- **Background**: `bg-background`
- **Border**: `border-b`

#### Container Principal
- **Max Width Dialog/Modal**: `max-w-lg` (512px)
- **Max Width Cards**: `max-w-md` (448px) a `max-w-2xl` (672px)
- **Max Width Formulários**: `max-w-md` (448px)
- **Max Width Admin**: `max-w-6xl` (1152px)
- **Padding**: `p-4 sm:p-6` (16px mobile, 24px desktop)

#### Grid Responsivo e Breakpoints
- **Breakpoints Tailwind**:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - 2xl: 1536px

- **Grid Patterns**:
```tsx
// Grid responsivo comum
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Items */}
</div>

// Grid para dashboard
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
  {/* Cards de estatísticas */}
</div>
```

### Utilities Customizadas

```css
/* Gradiente de fundo */
.gradient-bg {
  background: linear-gradient(135deg, var(--mesc-off-white) 0%, var(--mesc-sand) 100%);
}

/* Sombra litúrgica */
.shadow-liturgical {
  box-shadow: 0 4px 20px rgba(92, 64, 51, 0.1);
}

/* Padrão de fundo */
.pattern-bg {
  background-image: radial-gradient(circle at 1px 1px, rgba(201, 168, 106, 0.1) 1px, transparent 0);
  background-size: 20px 20px;
}
```

### Animações

```tsx
// Animações do Tailwind configuradas
animation: {
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up': 'accordion-up 0.2s ease-out'
}

// Transições padrão
transition-colors  // Para mudanças de cor
transition-all     // Para mudanças gerais
transition-transform duration-200  // Para rotações/transformações
```

### Padrões de Implementação

#### Estrutura de Página Típica
```tsx
<Layout title="Título da Página" subtitle="Subtítulo opcional">
  <div className="space-y-6">
    {/* Seção 1 */}
    <Card>
      <CardHeader>
        <CardTitle>Título</CardTitle>
        <CardDescription>Descrição</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Conteúdo */}
      </CardContent>
    </Card>
    
    {/* Seção 2 - Grid */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Cards ou componentes */}
    </div>
  </div>
</Layout>
```

#### Formulário Padrão
```tsx
<Card className="w-full max-w-md">
  <CardHeader>
    <CardTitle>Título do Formulário</CardTitle>
    <CardDescription>Instruções</CardDescription>
  </CardHeader>
  <CardContent>
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="campo">Campo</Label>
        <Input id="campo" type="text" />
      </div>
      <Button type="submit" className="w-full">
        Enviar
      </Button>
    </form>
  </CardContent>
</Card>
```

### Dark Mode

O sistema suporta dark mode através da classe `.dark` no elemento root. Todas as cores são definidas através de variáveis CSS que mudam automaticamente:

```css
/* Light mode (padrão) */
:root {
  --background: #F8F4ED;
  --foreground: #3A2F26;
  /* ... */
}

/* Dark mode */
.dark {
  --background: #0a0a0a;
  --foreground: #f5f5f5;
  /* ... */
}
```

### Acessibilidade

- Todos os componentes interativos têm estados de foco visíveis
- Uso de `focus-visible:ring-2 focus-visible:ring-ring`
- Labels semanticamente corretos para formulários
- Uso de ARIA attributes quando necessário
- Contraste adequado entre texto e fundo

### Responsividade

Padrão mobile-first com breakpoints em:
- **Mobile**: < 640px (base)
- **Tablet**: 640px - 1024px (sm, md)
- **Desktop**: > 1024px (lg, xl, 2xl)

Exemplos de classes responsivas:
- `p-4 sm:p-6` - Padding adaptativo
- `text-base sm:text-lg` - Tamanho de texto responsivo
- `hidden sm:block` - Visibilidade condicional
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` - Grid responsivo