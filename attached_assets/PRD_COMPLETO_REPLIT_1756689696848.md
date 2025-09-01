# 📋 PRD COMPLETO - Sistema MESC (Ministros Extraordinários da Sagrada Comunhão)
## Documento de Requisitos para Desenvolvimento do Zero no Replit
### Santuário São Judas Tadeu - Sorocaba/SP

**Versão:** 4.0 FINAL  
**Data:** 31/08/2025  
**Propósito:** Instruções completas para desenvolvimento do zero

---

## 🎯 1. VISÃO EXECUTIVA

### 1.1 Contexto
O Santuário São Judas Tadeu possui **200+ Ministros Extraordinários da Sagrada Comunhão** que servem em **15 missas semanais**. Atualmente, a gestão é feita via WhatsApp e planilhas, causando:
- Conflitos de escala e ausências não comunicadas
- Sobrecarga dos coordenadores
- Falta de controle sobre disponibilidade
- Dificuldade em gerenciar substituições

### 1.2 Objetivo Principal
Desenvolver um **sistema web completo** para:
- Automatizar a criação de escalas mensais
- Gerenciar disponibilidade via questionários pré-configurado e editável
- Facilitar substituições entre ministros
- Facilitar as instruções dos auxiliares nos momento da missa
- Centralizar comunicações
- Acompanhar formação continuada

### 1.3 Usuários
- **1 Reitor**: Pe. Flávio Júnior (supervisor geral)
- **2 Coordenadores**: Marco Rossit (gestão técnica), Priscila Machado e Ana Paula (gestão operacional e litúrgica)
- **200+ Ministros**: Membros ativos do ministério

---

## 🎨 2. DESIGN SYSTEM E IDENTIDADE VISUAL

### 2.1 Paleta de Cores

#### Light Mode (Tema Claro)
```css
:root {
  /* Cores Primárias - Roxo São Judas */
  --primary: #8B5CF6;          /* Roxo principal */
  --primary-hover: #7C3AED;    /* Roxo hover */
  --primary-light: #EDE9FE;    /* Roxo claro para backgrounds */
  --primary-dark: #6D28D9;     /* Roxo escuro para textos */
  
  /* Cores de Background */
  --background: #FFFFFF;        /* Fundo principal */
  --background-secondary: #F9FAFB;  /* Fundo secundário */
  --background-card: #FFFFFF;   /* Cards */
  --background-hover: #F3F4F6; /* Hover em itens */
  
  /* Cores de Texto */
  --text-primary: #111827;      /* Texto principal */
  --text-secondary: #6B7280;    /* Texto secundário */
  --text-muted: #9CA3AF;        /* Texto desabilitado */
  --text-inverse: #FFFFFF;      /* Texto em fundos escuros */
  
  /* Cores de Status */
  --success: #10B981;           /* Verde sucesso */
  --success-light: #D1FAE5;    /* Verde claro */
  --warning: #F59E0B;           /* Amarelo alerta */
  --warning-light: #FEF3C7;    /* Amarelo claro */
  --error: #EF4444;             /* Vermelho erro */
  --error-light: #FEE2E2;      /* Vermelho claro */
  --info: #3B82F6;              /* Azul informação */
  --info-light: #DBEAFE;       /* Azul claro */
  
  /* Bordas e Divisores */
  --border: #E5E7EB;            /* Borda padrão */
  --border-hover: #D1D5DB;      /* Borda hover */
  --divider: #F3F4F6;           /* Linha divisória */
  
  /* Sombras */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}
```

#### Dark Mode (Tema Escuro)
```css
[data-theme="dark"] {
  /* Cores Primárias - Roxo São Judas */
  --primary: #A78BFA;          /* Roxo principal (mais claro) */
  --primary-hover: #8B5CF6;    /* Roxo hover */
  --primary-light: #2E1065;    /* Roxo escuro para backgrounds */
  --primary-dark: #C4B5FD;     /* Roxo claro para textos */
  
  /* Cores de Background */
  --background: #0F172A;        /* Fundo principal */
  --background-secondary: #1E293B;  /* Fundo secundário */
  --background-card: #1E293B;   /* Cards */
  --background-hover: #334155;  /* Hover em itens */
  
  /* Cores de Texto */
  --text-primary: #F1F5F9;      /* Texto principal */
  --text-secondary: #CBD5E1;    /* Texto secundário */
  --text-muted: #94A3B8;        /* Texto desabilitado */
  --text-inverse: #0F172A;      /* Texto em fundos claros */
  
  /* Cores de Status (ajustadas para dark mode) */
  --success: #34D399;           /* Verde sucesso */
  --success-light: #064E3B;    /* Verde escuro */
  --warning: #FBBF24;           /* Amarelo alerta */
  --warning-light: #78350F;    /* Amarelo escuro */
  --error: #F87171;             /* Vermelho erro */
  --error-light: #7F1D1D;      /* Vermelho escuro */
  --info: #60A5FA;              /* Azul informação */
  --info-light: #1E3A8A;       /* Azul escuro */
  
  /* Bordas e Divisores */
  --border: #334155;            /* Borda padrão */
  --border-hover: #475569;      /* Borda hover */
  --divider: #1E293B;           /* Linha divisória */
  
  /* Sombras (mais sutis no dark mode) */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.25);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.6);
}
```

### 2.2 Tipografia e Fontes

#### Sistema de Fontes
```css
/* Importar fontes de alta qualidade */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap');

/* Configuração Base */
:root {
  /* Família de Fontes */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-heading: 'Poppins', var(--font-sans);
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  
  /* Tamanhos de Fonte (rem para acessibilidade) */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */
  
  /* Peso das Fontes */
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;
  
  /* Altura de Linha */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
  --leading-loose: 2;
  
  /* Espaçamento de Letras */
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;
}

/* Configuração de Alta Resolução */
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  
  /* Otimização de renderização para alta resolução */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "kern" 1, "liga" 1;
  
  /* Suporte para telas de alta densidade (Retina) */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    font-weight: var(--font-normal);
    letter-spacing: var(--tracking-normal);
  }
}

/* Classes Utilitárias de Tipografia */
.heading-1 {
  font-family: var(--font-heading);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

.heading-2 {
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
}

.heading-3 {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-normal);
}

.body-text {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-relaxed);
}

.caption {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  letter-spacing: var(--tracking-wide);
}

.label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
}
```

### 2.3 Configuração de Alta Resolução

#### Tailwind Config para Alta Qualidade
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        // Breakpoints otimizados para alta resolução
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        '4k': '2560px',
        '5k': '2880px'
      },
      
      // Configuração de cores customizadas
      colors: {
        primary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
          950: '#3B0764'
        }
      },
      
      // Animações suaves
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  darkMode: 'class' // Ativar dark mode via classe
}
```

#### Componentes de Alta Qualidade
```tsx
// Configuração de imagens em alta resolução
<Image
  src="/LogoSJT.png"
  alt="Santuário São Judas Tadeu"
  width={200}
  height={200}
  quality={100}
  priority
  className="w-auto h-auto"
  // Suporte para diferentes densidades de tela
  srcSet="/LogoSJT.png 1x, /LogoSJT@2x.png 2x, /LogoSJT@3x.png 3x"
/>

// Ícones em SVG para escalabilidade perfeita
<svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
  <path d="..." />
</svg>

// Cards com sombras e gradientes suaves
<Card className="
  bg-gradient-to-br from-background to-background-secondary
  shadow-lg hover:shadow-xl
  transition-all duration-300 ease-in-out
  backdrop-blur-sm
  border border-border/50
">
  {/* Conteúdo */}
</Card>
```

### 2.4 Sistema de Scroll e Navegação

#### Configuração Global de Scroll
```css
/* Reset e configuração base de scroll */
* {
  /* Scroll suave em todo o app */
  scroll-behavior: smooth;
  
  /* Prevenir scroll horizontal indesejado */
  max-width: 100vw;
  overflow-x: hidden;
}

html, body {
  /* Garantir altura total */
  height: 100%;
  width: 100%;
  
  /* Prevenir bounce effect no iOS */
  overscroll-behavior: none;
  
  /* Scroll suave com inércia */
  -webkit-overflow-scrolling: touch;
}

/* Container principal do app */
.app-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden; /* Previne scroll duplo */
}

/* Sidebar fixa */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 250px;
  overflow-y: auto; /* Scroll interno se necessário */
  overflow-x: hidden;
  z-index: 100;
  
  /* Scrollbar customizada */
  scrollbar-width: thin;
  scrollbar-color: var(--primary) var(--background);
}

/* Área de conteúdo principal */
.main-content {
  margin-left: 250px; /* Espaço para sidebar */
  width: calc(100% - 250px);
  height: 100vh;
  overflow-y: auto; /* Scroll vertical */
  overflow-x: hidden; /* Sem scroll horizontal */
  position: relative;
  
  /* Padding para evitar conteúdo cortado */
  padding: 20px;
  padding-bottom: 100px; /* Espaço extra no final */
}

/* Mobile: Layout empilhado */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
    width: 100%;
    padding: 10px;
  }
}
```

#### Scrollbar Customizada
```css
/* Webkit browsers (Chrome, Safari, Edge) */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: var(--background-secondary);
  border-radius: 5px;
}

::-webkit-scrollbar-thumb {
  background: var(--primary);
  border-radius: 5px;
  border: 2px solid var(--background-secondary);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--primary-hover);
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--primary) var(--background-secondary);
}

/* Scrollbar invisível mas funcional em mobile */
@media (max-width: 768px) {
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: transparent;
  }
  
  /* Mostrar apenas durante scroll */
  .scrolling::-webkit-scrollbar-thumb {
    background: var(--primary);
    opacity: 0.5;
  }
}
```

#### Componentes com Scroll Otimizado
```tsx
// Layout principal com scroll controlado
export function Layout({ children }: { children: React.ReactNode }) {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Detectar scroll para mostrar/ocultar elementos
  const handleScroll = () => {
    setIsScrolling(true);
    
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };
  
  // Prevenir scroll horizontal acidental
  useEffect(() => {
    const preventHorizontalScroll = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('wheel', preventHorizontalScroll, { passive: false });
    return () => document.removeEventListener('wheel', preventHorizontalScroll);
  }, []);
  
  return (
    <div className="app-container">
      <Sidebar className="sidebar" />
      
      <main 
        ref={mainContentRef}
        className={cn(
          "main-content",
          isScrolling && "scrolling"
        )}
        onScroll={handleScroll}
      >
        {/* Botão voltar ao topo */}
        <ScrollToTop show={isScrolling} />
        
        {/* Indicador de progresso de scroll */}
        <ScrollProgress />
        
        {/* Conteúdo */}
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}

// Componente de Scroll para o Topo
function ScrollToTop({ show }: { show: boolean }) {
  const scrollToTop = () => {
    document.querySelector('.main-content')?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  return (
    <button
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "bg-primary text-white rounded-full p-3",
        "shadow-lg transition-all duration-300",
        "hover:bg-primary-hover",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
      onClick={scrollToTop}
      aria-label="Voltar ao topo"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}

// Indicador de Progresso de Scroll
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const updateProgress = () => {
      const mainContent = document.querySelector('.main-content');
      if (!mainContent) return;
      
      const scrollHeight = mainContent.scrollHeight - mainContent.clientHeight;
      const scrolled = (mainContent.scrollTop / scrollHeight) * 100;
      setProgress(scrolled);
    };
    
    const mainContent = document.querySelector('.main-content');
    mainContent?.addEventListener('scroll', updateProgress);
    
    return () => mainContent?.removeEventListener('scroll', updateProgress);
  }, []);
  
  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-background-secondary z-50">
      <div 
        className="h-full bg-primary transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```

#### Tabelas com Scroll Horizontal
```tsx
// Tabela responsiva com scroll horizontal
export function ResponsiveTable({ data, columns }: TableProps) {
  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-background z-10">
            {/* Cabeçalho fixo */}
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-2">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                {/* Conteúdo */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Indicadores de scroll horizontal */}
      <div className="scroll-indicators">
        <div className="scroll-left">←</div>
        <div className="scroll-right">→</div>
      </div>
    </div>
  );
}

// CSS para tabela com scroll
.table-container {
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: visible;
  max-width: 100%;
  
  /* Scroll suave */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  
  /* Sombras indicando scroll */
  background:
    linear-gradient(90deg, var(--background) 0%, transparent 10%),
    linear-gradient(-90deg, var(--background) 0%, transparent 10%);
  background-attachment: local, local;
}

/* Indicadores visuais de scroll */
.scroll-indicators {
  position: absolute;
  top: 50%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}

.scroll-left, .scroll-right {
  padding: 10px;
  background: var(--primary);
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
}

.can-scroll-left .scroll-left,
.can-scroll-right .scroll-right {
  opacity: 1;
}
```

#### Listas Virtualizadas para Performance
```tsx
// Para listas muito grandes, usar virtualização
import { FixedSizeList } from 'react-window';

export function VirtualizedMinisterList({ ministers }: { ministers: Minister[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="minister-row">
      <MinisterCard minister={ministers[index]} />
    </div>
  );
  
  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeList
          height={height}
          width={width}
          itemCount={ministers.length}
          itemSize={100} // Altura de cada item
          overscanCount={5} // Renderizar 5 items extras
        >
          {Row}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
}
```

#### Solução para Problemas Comuns de Scroll

```css
/* 1. Prevenir scroll duplo em modais */
body.modal-open {
  overflow: hidden;
  position: fixed;
  width: 100%;
}

/* 2. Fix para scroll em iOS Safari */
.ios-scroll-fix {
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

/* 3. Prevenir zoom indesejado em inputs mobile */
input, textarea, select {
  font-size: 16px !important; /* Previne zoom no iOS */
}

/* 4. Container com altura 100% sem scroll duplo */
.full-height-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.full-height-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* Importante para Firefox */
}

/* 5. Scroll snap para seções */
.scroll-snap-container {
  scroll-snap-type: y mandatory;
  overflow-y: scroll;
  height: 100vh;
}

.scroll-snap-section {
  scroll-snap-align: start;
  min-height: 100vh;
}
```

### 2.5 Acessibilidade e Performance

```css
/* Garantir contraste adequado */
.high-contrast {
  /* WCAG AAA compliance */
  --text-primary: #000000;
  --background: #FFFFFF;
  --primary: #6D28D9; /* Contraste mínimo 7:1 */
}

/* Modo de alto contraste para acessibilidade */
@media (prefers-contrast: high) {
  :root {
    --border: #000000;
    --text-secondary: #374151;
  }
}

/* Respeitar preferências do sistema */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Otimização para impressão */
@media print {
  body {
    font-size: 12pt;
    color: black;
    background: white;
  }
}
```

---

## 🏗️ 3. ARQUITETURA TÉCNICA DEFINITIVA

### 3.1 Stack Obrigatória

```yaml
Frontend:
  - Framework: React 18 + TypeScript
  - UI Components: ShadcnUI (última versão)
  - Styling: TailwindCSS
  - Routing: Wouter (simples e leve)
  - State: TanStack Query v5
  - Forms: React Hook Form + Zod
  - Build: Vite
  - PWA: Vite PWA Plugin

Backend:
  - Runtime: Node.js 20 + Express
  - Language: TypeScript
  - ORM: Drizzle ORM
  - Database: PostgreSQL (NeonDB)
  - Auth: Express Session + bcrypt
  - Validation: Zod
  - File Upload: Multer + Sharp

Database:
  - Provider: NeonDB (PostgreSQL as a Service)
  - Connection: Pool com 20 conexões
  - URL: Via variável ambiente DATABASE_URL

Infrastructure:
  - Host: Replit (com Autoscale habilitado)
  - Domain: saojudastadeu.replit.app
  - Storage: Local filesystem para uploads
  - SSL: Habilitado automaticamente
```

### 3.2 Estrutura de Pastas Obrigatória

```
projeto-mesc/
├── client/                    # Frontend React
│   ├── public/               
│   │   ├── favicon.ico
│   │   ├── LogoSJT.png      # Logo do Santuário São Judas Tadeu
│   │   └── manifest.json     # PWA manifest
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis
│   │   │   ├── ui/          # ShadcnUI components
│   │   │   ├── layout.tsx   # Layout principal
│   │   │   └── sidebar.tsx  # Menu lateral
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilitários e API client
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
│
├── server/                   # Backend Express
│   ├── routes/              # Rotas da API
│   ├── middleware/          # Auth, CORS, etc
│   ├── utils/               # Funções auxiliares
│   ├── db-config.ts         # Configuração Drizzle
│   └── index.ts             # Entry point
│
├── shared/                   # Código compartilhado
│   ├── schema.ts            # Schema do banco (Drizzle)
│   ├── types.ts             # TypeScript types
│   └── constants.ts         # Constantes compartilhadas
│
├── scripts/                  # Scripts de manutenção
│   ├── seed.ts              # Popular banco inicial
│   └── backup.ts            # Backup do banco
│
├── uploads/                  # Fotos de perfil
├── .env                      # Variáveis de ambiente
├── .env.production
├── package.json
├── tsconfig.json
├── vite.config.ts
└── drizzle.config.ts
```

### 3.3 Configurações Essenciais

#### package.json
```json
{
  "name": "MESC",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "NODE_ENV=production node dist/server/index.js",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio",
    "seed": "tsx scripts/seed.ts"
  }
}
```

#### .env (Configuração NeonDB)
```env
DATABASE_URL=postgresql://neondb_owner:npg_6BJkuH9xWNGE@ep-fragrant-union-affanq2l.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=mesc_secret_key_2025_sao_judas
PORT=3001
NODE_ENV=development
```

---

## 📊 4. MODELO DE DADOS COMPLETO

### 4.1 Schema PostgreSQL (Drizzle ORM)

```typescript
// shared/schema.ts
import { pgTable, uuid, text, varchar, timestamp, boolean, integer, jsonb, date, time, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['reitor', 'coordenador', 'ministro']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);
export const scheduleStatusEnum = pgEnum('schedule_status', ['draft', 'published', 'completed']);
export const notificationTypeEnum = pgEnum('notification_type', ['schedule', 'substitution', 'announcement', 'reminder']);

// Tabela de Usuários (unificada para todos os tipos)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull().default('ministro'),
  status: userStatusEnum('status').notNull().default('pending'),
  requiresPasswordChange: boolean('requires_password_change').default(true),
  
  // Informações pessoais
  profilePhoto: text('profile_photo'),
  birthDate: date('birth_date'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  zipCode: varchar('zip_code', { length: 10 }),
  maritalStatus: varchar('marital_status', { length: 20 }),
  
  // Dados Sacramentais
  baptismDate: date('baptism_date'),
  baptismParish: varchar('baptism_parish', { length: 255 }),
  confirmationDate: date('confirmation_date'),
  confirmationParish: varchar('confirmation_parish', { length: 255 }),
  marriageDate: date('marriage_date'),
  marriageParish: varchar('marriage_parish', { length: 255 }),
  
  // Preferências ministeriais
  preferredPosition: integer('preferred_position'), // 1-6 posições litúrgicas
  preferredTimes: jsonb('preferred_times').$type<string[]>(), // ['8h', '10h', '19h']
  availableForSpecialEvents: boolean('available_for_special_events').default(true),
  canServeAsCoupul: boolean('can_serve_as_couple').default(false),
  spouseMinisterId: uuid('spouse_minister_id'),
  
  // Experiência e formação
  ministryStartDate: date('ministry_start_date'),
  experience: text('experience'),
  specialSkills: text('special_skills'),
  liturgicalTraining: boolean('liturgical_training').default(false),
  
  // Estatísticas
  lastService: timestamp('last_service'),
  totalServices: integer('total_services').default(0),
  formationCompleted: boolean('formation_completed').default(false),
  
  // Observações
  observations: text('observations'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Tabela de Questionários de Disponibilidade
export const questionnaires = pgTable('questionnaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  month: integer('month').notNull(), // 1-12
  year: integer('year').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  questions: jsonb('questions').notNull(), // Array de perguntas dinâmicas
  deadline: timestamp('deadline'),
  targetUserIds: jsonb('target_user_ids').$type<string[]>(), // IDs específicos ou [] para todos
  notifiedUserIds: jsonb('notified_user_ids').$type<string[]>(), // Controle de envio
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Tabela de Respostas dos Questionários
export const questionnaireResponses = pgTable('questionnaire_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionnaireId: uuid('questionnaire_id').notNull().references(() => questionnaires.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  responses: jsonb('responses').notNull(), // Respostas estruturadas
  
  // Disponibilidade extraída das respostas
  availableSundays: jsonb('available_sundays').$type<string[]>(), // ['2025-08-03', '2025-08-10']
  preferredMassTimes: jsonb('preferred_mass_times').$type<string[]>(), // ['8h', '10h']
  alternativeTimes: jsonb('alternative_times').$type<string[]>(), // Horários alternativos
  dailyMassAvailability: jsonb('daily_mass_availability').$type<string[]>(), // ['Segunda', 'Terça']
  specialEvents: jsonb('special_events'), // Eventos especiais que pode participar
  canSubstitute: boolean('can_substitute').default(false),
  notes: text('notes'),
  
  submittedAt: timestamp('submitted_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Tabela de Escalas
export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  status: scheduleStatusEnum('status').notNull().default('draft'),
  version: integer('version').default(1),
  
  // Metadados
  totalAssignments: integer('total_assignments').default(0),
  totalMinisters: integer('total_ministers').default(0),
  
  createdById: uuid('created_by_id').references(() => users.id),
  publishedAt: timestamp('published_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Tabela de Atribuições de Escala
export const scheduleAssignments = pgTable('schedule_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  
  // Detalhes da atribuição
  date: date('date').notNull(),
  massTime: time('mass_time').notNull(), // '08:00', '10:00', '19:00'
  position: integer('position').notNull(), // 1-6 posições litúrgicas
  
  // Status
  confirmed: boolean('confirmed').default(false),
  confirmedAt: timestamp('confirmed_at'),
  present: boolean('present'),
  
  // Substituição
  isSubstitution: boolean('is_substitution').default(false),
  originalUserId: uuid('original_user_id').references(() => users.id),
  substitutionReason: text('substitution_reason'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Tabela de Notificações
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'), // Dados adicionais específicos do tipo
  read: boolean('read').default(false),
  readAt: timestamp('read_at'),
  actionUrl: text('action_url'), // Link para ação relacionada
  priority: varchar('priority', { length: 10 }).default('normal'), // low, normal, high, urgent
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Tabela de Logs de Atividade
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
});

// Tabela de Relacionamentos Familiares
export const familyRelationships = pgTable('family_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  relatedUserId: uuid('related_user_id').notNull().references(() => users.id),
  relationshipType: varchar('relationship_type', { length: 50 }).notNull(), // spouse, parent, child, sibling
  createdAt: timestamp('created_at').defaultNow()
});

// Tabela de Períodos Bloqueados (férias, afastamentos)
export const blockedPeriods = pgTable('blocked_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: text('reason'),
  approvedById: uuid('approved_by_id').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Tabela de Configuração de Horários de Missa
export const massTimesConfig = pgTable('mass_times_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Domingo, 1=Segunda, etc
  time: time('time').notNull(),
  minMinisters: integer('min_ministers').notNull().default(3),
  maxMinisters: integer('max_ministers').notNull().default(6),
  isActive: boolean('is_active').default(true),
  specialEvent: boolean('special_event').default(false),
  eventName: varchar('event_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Tabela de Padrões de Disponibilidade (para IA futura)
export const userAvailabilityPatterns = pgTable('user_availability_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  pattern: jsonb('pattern').notNull(), // Padrão de disponibilidade histórica
  confidence: integer('confidence').default(0), // 0-100% confiança no padrão
  lastUpdated: timestamp('last_updated').defaultNow()
});
```

---

## 🚀 5. FUNCIONALIDADES DETALHADAS

### 5.1 Sistema de Autenticação

#### Requisitos:
- Login com email e senha
- Senha hasheada com bcrypt (10 rounds)
- Sessão persistente com express-session
- Logout com limpeza de sessão
- Alteração obrigatória de senha no primeiro acesso
- Reset de senha pelo coordenador

#### Implementação:
```typescript
// server/routes/auth.ts
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.select().from(users).where(eq(users.email, email)).first();
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  req.session.userId = user.id;
  req.session.userRole = user.role;
  
  if (user.requiresPasswordChange) {
    return res.json({ requiresPasswordChange: true, user });
  }
  
  res.json({ user });
});
```

### 4.2 Menu Sidebar Completo

#### Estrutura do Menu por Papel:

**COORDENADOR (acesso total):**
1. Dashboard
2. Escalas
   - Questionários
   - Visualizar Escalas
   - Criar/Editar Escala
   - Substituições
   - Aprovar Trocas
3. Ministros
   - Diretório de Ministros
   - Relatórios de Participação
4. Gestão de Usuários
   - Aprovação de Cadastros
   - Gerenciar Permissões
   - Reset de Senhas
5. Formação
   - Trilha Liturgia
   - Espiritualidade
   - Biblioteca
   - Criar Conteúdo
6. Comunicação
   - Avisos Gerais
   - Notificações Push
   - WhatsApp Groups
7. Relatórios
   - Estatísticas Mensais
   - Frequência
   - Exportar Dados
8. Configurações
   - Horários de Missa
   - Posições Litúrgicas
   - Sistema

**REITOR (gestão operacional):**
- Todos os itens do Coordenador, exceto:
  - Configurações do Sistema
  - Gerenciar Permissões (limitado)

**MINISTRO (acesso básico):**
1. Dashboard (visão pessoal)
2. Escalas
   - Minhas Escalas
   - Questionário de Disponibilidade
   - Solicitar Substituição
3. Diretório (somente visualização)
4. Formação
   - Trilha Liturgia
   - Espiritualidade
   - Biblioteca
5. Comunicação (receber avisos)
6. Meu Perfil

### 4.3 Sistema de Escalas Inteligente

#### Algoritmo de Geração:

```typescript
// server/utils/scheduleGenerator.ts
class ScheduleGenerator {
  // Parâmetros de entrada
  month: number;
  year: number;
  ministers: Minister[];
  responses: QuestionnaireResponse[];
  
  // Regras de negócio
  rules = {
    maxAssignmentsPerMonth: 4,        // Máximo por ministro
    minDaysBetweenServices: 7,        // Intervalo mínimo
    couplesSameMass: true,            // Casais na mesma missa
    respectPreferences: true,          // Respeitar horários preferenciais
    balanceWorkload: true,            // Distribuir igualmente
    considerExperience: true,         // Novatos com experientes
    avoidConsecutiveSundays: true     // Evitar domingos seguidos
  };
  
  // Posições litúrgicas por missa dominical
  positions = {
    '08:00': [
      'Auxiliar 1', 'Auxiliar 2',              // Posições 1-2
      'Recolher 3', 'Recolher 4',              // Posições 3-4
      'Velas 5', 'Velas 6',                    // Posições 5-6
      'Adoração 7', 'Adoração 8',              // Posições 7-8
      'Purificar/Expor 9', 'Purificar/Expor 10', 'Purificar/Expor 11', 'Purificar/Expor 12', // Posições 9-12
      'Mezanino 13', 'Mezanino 14', 'Mezanino 15' // Posições 13-15
    ],
    '10:00': [
      'Auxiliar 1', 'Auxiliar 2',              // Posições 1-2
      'Recolher 3', 'Recolher 4',              // Posições 3-4
      'Velas 5', 'Velas 6',                    // Posições 5-6
      'Adoração 7', 'Adoração 8',              // Posições 7-8
      'Purificar/Expor 9', 'Purificar/Expor 10', 'Purificar/Expor 11', 'Purificar/Expor 12', // Posições 9-12
      'Mezanino 13', 'Mezanino 14', 'Mezanino 15', // Posições 13-15
      'Recolher Materiais 16', 'Recolher Materiais 17', 'Recolher Materiais 18', 'Recolher Materiais 19', 'Recolher Materiais 20' // Posições 16-20
    ],
    '19:00': [
      'Auxiliar 1', 'Auxiliar 2',              // Posições 1-2
      'Recolher 3', 'Recolher 4',              // Posições 3-4
      'Velas 5', 'Velas 6',                    // Posições 5-6
      'Adoração 7', 'Adoração 8',              // Posições 7-8
      'Purificar/Expor 9', 'Purificar/Expor 10', 'Purificar/Expor 11', 'Purificar/Expor 12', // Posições 9-12
      'Mezanino 13', 'Mezanino 14', 'Mezanino 15', // Posições 13-15
      'Recolher Materiais 16', 'Recolher Materiais 17', 'Recolher Materiais 18', 'Recolher Materiais 19', 'Recolher Materiais 20' // Posições 16-20
    ]
  };
  
  // Horários de missa dominical
  sundayMasses = [
    { time: '08:00', ministers: 15 },  // Missa das 8h - 15 ministros
    { time: '10:00', ministers: 20 },  // Missa das 10h - 20 ministros
    { time: '19:00', ministers: 20 }   // Missa das 19h - 20 ministros
  ];
  
  // Instruções para auxiliares (simplificado para cada posição)
  positionInstructions = {
    'Auxiliar': 'Auxiliar o celebrante na distribuição da comunhão no presbitério',
    'Recolher': 'Recolher as âmbulas dos ministros após a comunhão',
    'Velas': 'Acender/apagar velas e auxiliar na organização do altar',
    'Adoração': 'Conduzir momento de adoração quando solicitado',
    'Purificar/Expor': 'Purificar vasos sagrados e expor o Santíssimo quando necessário',
    'Mezanino': 'Distribuir comunhão no mezanino/coro',
    'Recolher Materiais': 'Recolher e organizar materiais litúrgicos após a missa'
  };
  
  generateSchedule() {
    // 1. Processar respostas do questionário
    const availability = this.processQuestionnaireResponses();
    
    // 2. Criar matriz de disponibilidade
    const matrix = this.createAvailabilityMatrix(availability);
    
    // 3. Aplicar algoritmo de otimização
    const assignments = this.optimizeAssignments(matrix);
    
    // 4. Validar regras de negócio
    const validated = this.validateAssignments(assignments);
    
    // 5. Gerar escala final
    return this.formatSchedule(validated);
  }
}
```

#### Visualização da Escala:

```typescript
// client/src/pages/Schedules.tsx
// Calendário visual com código de cores:
const statusColors = {
  confirmed: 'bg-green-100 text-green-800',     // Confirmado
  pending: 'bg-yellow-100 text-yellow-800',      // Aguardando confirmação
  substitution: 'bg-blue-100 text-blue-800',     // Substituição
  absent: 'bg-red-100 text-red-800'              // Ausente
};

// Card de dia com ministros escalados - Missa das 10h (20 ministros)
<DayCard date="03/08/2025" mass="10:00">
  <MinisterSlot position="Auxiliar 1" name="João Silva" status="confirmed" />
  <MinisterSlot position="Auxiliar 2" name="Maria Santos" status="pending" />
  <MinisterSlot position="Recolher 3" name="Pedro Costa" status="confirmed" />
  <MinisterSlot position="Recolher 4" name="Ana Lima" status="substitution" />
  <MinisterSlot position="Velas 5" name="Carlos Souza" status="confirmed" />
  <MinisterSlot position="Velas 6" name="Lucia Ferreira" status="confirmed" />
  {/* ... continua até posição 20 */}
</DayCard>
```

### 4.4 Sistema de Acompanhamento de Disponibilidade (CRÍTICO)

#### Dashboard de Pendências do Coordenador:

```typescript
// FUNCIONALIDADE ESSENCIAL: Acompanhar respostas ANTES de gerar escala
interface DashboardPendencias {
  // Resumo Geral
  totalMinisters: 200,              // Total de ministros ativos
  responsesReceived: 145,           // Quantos já responderam
  responseRate: 72.5,               // Percentual de respostas
  missingResponses: 55,             // Quantos FALTAM responder
  daysUntilDeadline: 3,            // Dias restantes para responder
  
  // Análise por Missa (CRÍTICO para saber se há ministros suficientes)
  availabilityByMass: {
    '08:00': {
      required: 15,                // Ministros necessários
      available: 12,                // Ministros disponíveis confirmados
      deficit: 3,                  // FALTAM 3 ministros
      status: 'warning'             // warning | critical | ok
    },
    '10:00': {
      required: 20,
      available: 18,
      deficit: 2,
      status: 'warning'
    },
    '19:00': {
      required: 20,
      available: 22,
      deficit: 0,
      status: 'ok'
    }
  },
  
  // Análise por Domingo
  sundayAnalysis: [
    {
      date: '03/08/2025',
      masses: {
        '08:00': { available: 14, required: 15, deficit: 1 },
        '10:00': { available: 19, required: 20, deficit: 1 },
        '19:00': { available: 20, required: 20, deficit: 0 }
      },
      totalDeficit: 2,
      status: 'manageable'
    },
    {
      date: '10/08/2025',
      masses: {
        '08:00': { available: 10, required: 15, deficit: 5 },
        '10:00': { available: 15, required: 20, deficit: 5 },
        '19:00': { available: 18, required: 20, deficit: 2 }
      },
      totalDeficit: 12,
      status: 'critical'  // ALERTA CRÍTICO!
    }
  ],
  
  // Lista de Ministros Pendentes
  pendingMinisters: [
    { id: '1', name: 'João Silva', phone: '15999999999', lastReminder: '2 dias atrás' },
    { id: '2', name: 'Maria Santos', phone: '15888888888', lastReminder: 'nunca' },
    // ... lista completa dos 55 que não responderam
  ],
  
  // Alertas Automáticos
  alerts: [
    {
      type: 'critical',
      message: 'Domingo 10/08 com déficit crítico de 12 ministros',
      action: 'Enviar lembrete urgente aos pendentes'
    },
    {
      type: 'warning',
      message: '55 ministros ainda não responderam (27.5%)',
      action: 'Ativar campanha de cobrança via WhatsApp'
    },
    {
      type: 'info',
      message: 'Prazo termina em 3 dias',
      action: 'Preparar lista de suplentes'
    }
  ]
}
```

#### Ações do Coordenador com Base nas Pendências:

```typescript
// 1. ENVIAR LEMBRETES (individual ou em massa)
async function sendReminders(ministerIds: string[]) {
  // Gerar link personalizado para cada ministro
  const reminders = ministerIds.map(id => ({
    ministerId: id,
    message: `Olá! Faltam apenas 3 dias para responder o questionário de disponibilidade. 
              Por favor, acesse: ${APP_URL}/questionnaire?token=${generateToken(id)}`,
    channel: 'whatsapp' // ou 'email', 'push'
  }));
  
  return await sendBulkNotifications(reminders);
}

// 2. ATIVAR MODO EMERGÊNCIA (quando déficit > 20%)
async function activateEmergencyMode(month: number, year: number) {
  // Notificar TODOS os ministros sobre necessidade urgente
  // Abrir disponibilidade para ministros inativos temporariamente
  // Solicitar ajuda de ministros de outras paróquias
}

// 3. GERAR ESCALA COM DÉFICIT (quando inevitável)
async function generatePartialSchedule(options: {
  month: number,
  year: number,
  deficitStrategy: 'distribute' | 'concentrate' | 'prioritize'
}) {
  // distribute: Espalhar falta entre todas as missas
  // concentrate: Concentrar falta em uma missa específica
  // prioritize: Priorizar missas mais cheias (10h e 19h)
  
  return {
    schedule: [...],
    warnings: [
      'Missa 08h do dia 10/08 com apenas 10 ministros (faltam 5)',
      'Sugestão: Solicitar apoio de ministros da missa das 10h'
    ]
  };
}
```

#### Visualização na Interface:

```tsx
// Página: /pendencias-disponibilidade
<PendenciasDashboard>
  {/* Card Principal - Resumo */}
  <SummaryCard>
    <ProgressBar value={72.5} label="145 de 200 responderam" />
    <Countdown days={3} label="Prazo termina em" />
    <Button onClick={sendRemindersToAll}>
      Enviar Lembrete aos 55 Pendentes
    </Button>
  </SummaryCard>
  
  {/* Análise Visual por Missa */}
  <MassAvailabilityGrid>
    <MassCard time="08:00" required={15} available={12} status="warning">
      <DeficitAlert>Faltam 3 ministros</DeficitAlert>
    </MassCard>
    <MassCard time="10:00" required={20} available={18} status="warning">
      <DeficitAlert>Faltam 2 ministros</DeficitAlert>
    </MassCard>
    <MassCard time="19:00" required={20} available={22} status="ok">
      <CheckIcon>Ministros suficientes</CheckIcon>
    </MassCard>
  </MassAvailabilityGrid>
  
  {/* Calendário com Análise por Domingo */}
  <CalendarView>
    {sundays.map(sunday => (
      <SundayCard 
        date={sunday.date}
        deficit={sunday.totalDeficit}
        color={sunday.totalDeficit > 10 ? 'red' : sunday.totalDeficit > 5 ? 'yellow' : 'green'}
      />
    ))}
  </CalendarView>
  
  {/* Lista de Pendentes com Ações */}
  <PendingMinistersList>
    <FilterBar>
      <Select options={['Todos', 'Nunca lembrados', 'Última semana']} />
      <Button onClick={exportToWhatsApp}>Exportar Lista WhatsApp</Button>
    </FilterBar>
    
    {pendingMinisters.map(minister => (
      <MinisterRow>
        <Name>{minister.name}</Name>
        <Phone>{minister.phone}</Phone>
        <LastReminder>{minister.lastReminder}</LastReminder>
        <Actions>
          <Button size="sm" onClick={() => sendIndividualReminder(minister.id)}>
            <WhatsAppIcon /> Lembrar
          </Button>
          <Button size="sm" onClick={() => callMinister(minister.phone)}>
            <PhoneIcon /> Ligar
          </Button>
        </Actions>
      </MinisterRow>
    ))}
  </PendingMinistersList>
  
  {/* Botão de Ação Principal */}
  <FloatingActionButton>
    {responseRate < 70 ? (
      <Button variant="danger" onClick={activateCrisisMode}>
        ⚠️ Ativar Modo Crise - Buscar Suplentes
      </Button>
    ) : responseRate < 85 ? (
      <Button variant="warning" onClick={intensifyCampaign}>
        📢 Intensificar Campanha de Respostas
      </Button>
    ) : (
      <Button variant="success" onClick={generateSchedule}>
        ✅ Gerar Escala com {responseRate}% de Respostas
      </Button>
    )}
  </FloatingActionButton>
</PendenciasDashboard>
```

### 4.5 Sistema de Questionários Dinâmicos

#### Geração Automática de Perguntas:

```typescript
// server/utils/questionnaireGenerator.ts
export function generateQuestionnaireQuestions(month: number, year: number) {
  const questions = [];
  
  // 1. Disponibilidade geral
  questions.push({
    id: 'monthly_availability',
    type: 'multiple_choice',
    question: 'Esse mês você tem disponibilidade para servir no seu horário de costume?',
    options: ['Sim', 'Não'],
    required: true,
    metadata: { conditionalTrigger: true }
  });
  
  // 2. Horário principal (condicional - aparece se respondeu "Sim")
  questions.push({
    id: 'main_service_time',
    type: 'multiple_choice',
    question: 'Em qual horário você normalmente serve aos domingos?',
    options: ['8h', '10h', '19h'],
    required: false,
    metadata: {
      dependsOn: 'monthly_availability',
      enabledWhen: 'Sim'
    }
  });
  
  // 3. Disponibilidade para substituição (condicional - aparece se respondeu "Não")
  questions.push({
    id: 'substitute_availability',
    type: 'multiple_choice',
    question: 'Poderá substituir algum ministro caso alguém precise?',
    options: ['Sim', 'Não'],
    required: false,
    metadata: {
      dependsOn: 'monthly_availability',
      enabledWhen: 'Não'
    }
  });
  
  // 4. Domingos específicos (com calendário)
  const sundays = getSundaysOfMonth(month, year);
  questions.push({
    id: 'sunday_availability',
    type: 'checkbox',
    question: 'Em quais domingos você estará disponível?',
    options: sundays.map(s => `Domingo ${format(s, 'dd/MM')}`),
    required: false,
    metadata: {
      sundayDates: sundays,
      dependsOn: 'monthly_availability',
      enabledWhen: 'Sim'
    }
  });
  
  // 5. Horários alternativos
  questions.push({
    id: 'alternative_times',
    type: 'yes_no_with_options',
    question: 'Você pode servir em outros horários além do seu principal?',
    options: ['Sim', 'Não'],
    metadata: {
      conditionalOptions: ['8h', '10h', '19h'],
      dependsOn: 'monthly_availability',
      enabledWhen: 'Sim'
    }
  });
  
  // 6. Missas diárias
  questions.push({
    id: 'daily_mass_availability',
    type: 'yes_no_with_options',
    question: 'Pode servir nas missas diárias das 6h30?',
    options: ['Sim', 'Não', 'Apenas alguns dias'],
    metadata: {
      conditionalOptions: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
      dependsOn: 'monthly_availability',
      enabledWhen: 'Sim'
    }
  });
  
  // 7. Eventos especiais do mês
  const specialEvents = getSpecialEventsForMonth(month, year);
  specialEvents.forEach(event => {
    questions.push({
      id: `event_${event.id}`,
      type: 'multiple_choice',
      question: `Você poderá servir na ${event.name} em ${format(event.date, 'dd/MM')}?`,
      options: ['Sim', 'Não'],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: event.date,
        eventName: event.name,
        eventTime: event.time
      }
    });
  });
  
  // 8. Observações
  questions.push({
    id: 'additional_notes',
    type: 'text',
    question: 'Observações adicionais (opcional)',
    required: false
  });
  
  return questions;
}

// Eventos especiais fixos
function getSpecialEventsForMonth(month: number, year: number) {
  const events = [];
  
  // Primeira quinta: Missa de Cura e Libertação
  const firstThursday = getFirstWeekday(year, month, 4);
  events.push({
    id: 'healing_mass',
    name: 'Missa de Cura e Libertação',
    date: firstThursday,
    time: '19h30'
  });
  
  // Primeira sexta: Sagrado Coração
  const firstFriday = getFirstWeekday(year, month, 5);
  events.push({
    id: 'sacred_heart',
    name: 'Missa do Sagrado Coração',
    date: firstFriday,
    time: '6h30'
  });
  
  // Primeiro sábado: Imaculado Coração
  const firstSaturday = getFirstWeekday(year, month, 6);
  events.push({
    id: 'immaculate_heart',
    name: 'Missa do Imaculado Coração de Maria',
    date: firstSaturday,
    time: '6h30'
  });
  
  // Dia 28: São Judas Tadeu (Padroeiro)
  if (getDayOfMonth(28) <= daysInMonth) {
    const date28 = new Date(year, month - 1, 28);
    const dayOfWeek = date28.getDay(); // 0=Domingo, 6=Sábado
    const isHoliday = checkIfHoliday(28, month, year);
    
    if (dayOfWeek === 0) { // Se for domingo
      // Mantém missas normais de 8h, 10h, 19h e adiciona às 15h
      events.push({
        id: 'st_jude_special',
        name: 'Missa Solene de São Judas Tadeu',
        date: date28,
        time: '15h00'
      });
    } else {
      // Dia de semana: 19h30 (ou 19h se for sábado/feriado)
      const time = (dayOfWeek === 6 || isHoliday) ? '19h00' : '19h30';
      events.push({
        id: 'st_jude',
        name: 'Missa de São Judas Tadeu',
        date: date28,
        time: time
      });
    }
  }
  
  return events;
}
```

### 5.6 Sistema de Substituições

#### Fluxo de Substituição:

1. **Ministro solicita substituição:**
```typescript
// POST /api/schedules/substitution-request
{
  assignmentId: "uuid",
  reason: "Viagem de trabalho",
  suggestedSubstitute: "user-id" // opcional
}
```

2. **Sistema notifica:**
   - Coordenadores (sempre)
   - Ministro sugerido (se houver)
   - Grupo de disponíveis (se houver)
   - Demais ministros (se não houver sugestões anteriores)

3. **Aprovação:**
   - Auto-aprovada se ministro substituto aceitar

4. **Atualização:**
   - Escala atualizada em tempo real
   - Notificações enviadas aos envolvidos e ao auxiliar escalado para aquele dia específico da troca

### 5.7 Diretório de Ministros

#### Funcionalidades:
- Lista completa com fotos
- Busca por nome, telefone, email
- Visualização em grid ou lista
- Card detalhado com:
  - Informações pessoais
  - Contatos
  - Família (se houver membros no ministério)
  - Histórico de serviço
  - Preferências

#### Implementação Visual:
```tsx
// client/src/pages/MinistersDirectory.tsx
<MinisterCard>
  <Avatar src={minister.profilePhoto} />
  <Name>{minister.name}</Name>
  <Role>{minister.role}</Role>
  <Contact>
    <Phone>{minister.phone}</Phone>
    <Email>{minister.email}</Email>
    <WhatsApp href={`https://wa.me/55${cleanPhone}`} />
  </Contact>
  <FamilyMembers>
    {family.map(member => <FamilyBadge>{member.name}</FamilyBadge>)}
  </FamilyMembers>
  <Stats>
    <ServiceCount>{minister.totalServices} serviços</ServiceCount>
    <LastService>{format(minister.lastService, 'dd/MM/yyyy')}</LastService>
  </Stats>
</MinisterCard>
```

### 5.8 Sistema de Formação

#### Módulos:

**1. Trilha Liturgia:**
- Vídeos sobre liturgia
- Documentos da Igreja
- Orientações práticas
- Quiz de verificação

**2. Espiritualidade:**
- Reflexões diárias
- Orações do ministério
- Retiros online
- Materiais de apoio

**3. Biblioteca:**
- PDFs para download
- Links úteis
- Apresentações
- Fotos de eventos

#### Tracking de Progresso:
```typescript
// Registrar visualização de conteúdo
await db.insert(activityLogs).values({
  userId: req.session.userId,
  action: 'VIEW_FORMATION_CONTENT',
  entityType: 'formation',
  entityId: contentId,
  details: { module: 'liturgy', duration: 300 }
});
```

### 5.9 Sistema de Comunicação

#### Canais:
1. **Notificações In-App:**
   - Badge no menu
   - Lista de notificações
   - Marcar como lida
   - Ações diretas

2. **Avisos Gerais:**
   - Banner no dashboard
   - Pop-up para urgentes
   - Histórico de avisos

3. **Integração WhatsApp:**
   - Links diretos para grupos
   - Botão de contato rápido
   - Templates de mensagem

### 5.10 Relatórios e Estatísticas

#### Dashboard Coordenador:
```typescript
// Métricas em tempo real
const dashboardStats = {
  // Estatísticas do mês
  totalMinisters: 200,
  activeThisMonth: 180,
  responseRate: 90, // % questionário respondido
  substitutionsThisMonth: 12,
  
  // Próximas escalas
  nextSunday: {
    date: '03/08/2025',
    assigned: 16,
    confirmed: 14,
    pending: 2
  },
  
  // Alertas
  alerts: [
    { type: 'warning', message: '2 posições sem confirmação para domingo' },
    { type: 'info', message: '5 ministros ainda não responderam o questionário' }
  ],
  
  // Gráficos
  participationByMass: {
    '8h': 85,
    '10h': 95,
    '19h': 90
  }
};
```

#### Relatórios Disponíveis:
1. Frequência mensal por ministro
2. Taxa de confirmação de escalas
3. Substituições por período
4. Participação em eventos especiais
5. Ministros mais/menos ativos
6. Exportação para Excel/PDF

### 5.11 Configurações e Preferências

#### Usuário (Ministro):
- Notificações: push, email, WhatsApp
- Disponibilidade padrão
- Horários preferenciais
- Foto de perfil
- Dados pessoais
- Senha

#### Sistema (Coordenador):
- Horários de missa
- Quantidade de ministros por missa
- Posições litúrgicas
- Prazos de confirmação
- Templates de mensagem
- Regras de escala

---

## 🔒 6. SEGURANÇA E BOAS PRÁTICAS

### 6.1 Autenticação e Autorização

```typescript
// server/middleware/auth.ts
export const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Uso nas rotas
router.post('/schedules', requireAuth, requireRole(['coordenador', 'reitor']), createSchedule);
```

### 6.2 Validação de Dados

```typescript
// Sempre validar com Zod
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3).max(255),
  phone: z.string().regex(/^\d{11}$/),
  role: z.enum(['ministro', 'coordenador', 'reitor'])
});

router.post('/users', async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body);
    // Processar dados validados
  } catch (error) {
    return res.status(400).json({ error: 'Invalid data', details: error.errors });
  }
});
```

### 6.3 Proteção de Dados

```typescript
// Nunca retornar senha
const safeUser = {
  ...user,
  password: undefined
};

// Sanitizar inputs
import DOMPurify from 'isomorphic-dompurify';
const cleanHtml = DOMPurify.sanitize(userInput);

// Rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de requisições
});
```

---

## 📱 7. PWA E MOBILE

### 7.1 Manifest.json

```json
{
  "name": "MESC - Ministros São Judas",
  "short_name": "MESC",
  "description": "Sistema de Gestão dos Ministros da Sagrada Comunhão",
  "theme_color": "#8B5CF6",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/dashboard",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 7.2 Service Worker

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        // manifest acima
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60 // 5 minutos
              }
            }
          }
        ]
      }
    })
  ]
};
```

---

## 🚀 8. PROCESSO DE DESENVOLVIMENTO

### 8.1 Ordem de Implementação

**Fase 1 - Base (Semana 1):**
1. Configurar projeto no Replit
2. Instalar dependências
3. Configurar NeonDB
4. Criar schema do banco
5. Implementar autenticação
6. Criar layout base com sidebar

**Fase 2 - Core (Semana 2):**
1. CRUD de usuários
2. Sistema de questionários
3. Geração de escalas
4. Visualização de calendário
5. Sistema de notificações

**Fase 3 - Features (Semana 3):**
1. Substituições
2. Diretório de ministros
3. Dashboard com estatísticas
4. Sistema de formação
5. Comunicação/avisos

**Fase 4 - Polish (Semana 4):**
1. PWA configuration
2. Testes completos
3. Otimizações
4. Deploy final
5. Documentação

### 8.2 Scripts de Seed Inicial

```typescript
// scripts/seed.ts
import { db } from '../server/db-config';
import bcrypt from 'bcrypt';

async function seed() {
  // 1. Criar reitor
  const hashedPassword = await bcrypt.hash('SaoJudas2025', 10);
  
  await db.insert(users).values({
    email: 'pe.flavio@saojudas.org.br',
    password: hashedPassword,
    name: 'Pe. Flávio Júnior',
    role: 'reitor',
    status: 'active',
    requiresPasswordChange: false
  });
  
  // 2. Criar coordenadores
  await db.insert(users).values([
    {
      email: 'rossit@icloud.com',
      password: hashedPassword,
      name: 'Marco Rossit',
      phone: '15991343638',
      role: 'coordenador',
      status: 'active',
      requiresPasswordChange: false
    },
    {
      email: 'priscila.machado@gmail.com',
      password: hashedPassword,
      name: 'Priscila Machado',
      role: 'coordenador',
      status: 'active',
      requiresPasswordChange: false
    }
  ]);
  
  // 3. Configurar horários de missa
  await db.insert(massTimesConfig).values([
    { dayOfWeek: 0, time: '08:00', minMinisters: 3, maxMinisters: 4 },
    { dayOfWeek: 0, time: '10:00', minMinisters: 5, maxMinisters: 6 },
    { dayOfWeek: 0, time: '19:00', minMinisters: 5, maxMinisters: 6 }
  ]);
  
  console.log('✅ Seed completed!');
}

seed();
```

### 8.3 Variáveis de Ambiente Replit

No Replit, configure os Secrets:
```
DATABASE_URL = postgresql://neondb_owner:npg_6BJkuH9xWNGE@ep-fragrant-union-affanq2l.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET = mesc_sao_judas_2025_secret_key
NODE_ENV = production
PORT = 3000
```

---

## 📝 9. TESTES E VALIDAÇÃO

### 9.1 Checklist de Funcionalidades

#### Autenticação:
- [ ] Login com email/senha
- [ ] Logout limpa sessão
- [ ] Senha obrigatória primeiro acesso
- [ ] Reset de senha funciona

#### Usuários:
- [ ] Cadastro novo ministro
- [ ] Aprovação pelo coordenador
- [ ] Edição de perfil
- [ ] Upload de foto
- [ ] Relacionamentos familiares

#### Questionários:
- [ ] Geração automática mensal
- [ ] Perguntas condicionais funcionam
- [ ] Salvamento de respostas
- [ ] Visualização pelo coordenador

#### Escalas:
- [ ] Geração inteligente
- [ ] Respeita disponibilidade
- [ ] Visualização em calendário
- [ ] Confirmação individual
- [ ] Substituições

#### Comunicação:
- [ ] Notificações aparecem
- [ ] Avisos no dashboard
- [ ] Links WhatsApp funcionam

#### Mobile/PWA:
- [ ] Instalável no celular
- [ ] Responsivo em todas telas
- [ ] Funciona offline (básico)

### 9.2 Dados de Teste

```typescript
// Criar 20 ministros de teste
for (let i = 1; i <= 20; i++) {
  await createTestMinister({
    name: `Ministro Teste ${i}`,
    email: `ministro${i}@teste.com`,
    password: 'teste123',
    preferredTime: ['8h', '10h', '19h'][i % 3],
    availableWeekends: i % 4 !== 0 // 75% disponíveis
  });
}
```

---

## 🎯 10. CRITÉRIOS DE SUCESSO

### 10.1 Métricas Técnicas
- ✅ Suporta 200+ usuários simultâneos
- ✅ Tempo de resposta < 2 segundos
- ✅ Uptime > 99%
- ✅ Zero perda de dados
- ✅ Backup diário automático

### NOTA IMPORTANTE SOBRE AS POSIÇÕES:
As 20 posições nas missas de 10h e 19h são necessárias para cobrir toda a igreja, incluindo o mezanino e a organização pós-missa. A missa das 8h tem menos fiéis, por isso 15 ministros são suficientes.

### 10.2 Métricas de Negócio
- ✅ 90% dos ministros usando o sistema em 30 dias
- ✅ Redução de 80% no tempo de criação de escalas
- ✅ Zero conflitos de escala
- ✅ 95% de confirmação de presença
- ✅ Satisfação > 4.5/5

---

## 📞 11. SUPORTE E MANUTENÇÃO

### 11.1 Contatos
- **Coordenador Técnico:** Marco Rossit
- **Email:** rossit@icloud.com
- **WhatsApp:** +55 15 99134-3638

### 11.2 Documentação Adicional
- README.md - Instruções de instalação
- API.md - Documentação das rotas
- DEPLOYMENT.md - Deploy no Replit
- BACKUP.md - Procedimentos de backup

### 11.3 Evolução Futura
1. **Fase 2:** App mobile nativo
2. **Fase 3:** IA para otimização de escalas
3. **Fase 4:** Integração com sistema paroquial
4. **Fase 5:** Multi-paróquia

---

## ✅ 12. CONCLUSÃO

Este PRD contém **TODAS** as especificações necessárias para desenvolver o sistema MESC do zero no Replit. Seguindo este documento, você terá um sistema:

- **Completo:** Todas funcionalidades necessárias
- **Robusto:** Arquitetura sólida e escalável
- **Seguro:** Boas práticas implementadas
- **Moderno:** Stack atual e performática
- **Manutenível:** Código organizado e documentado

**IMPORTANTE:** Este sistema já foi validado em produção parcial. As funcionalidades aqui descritas foram testadas e aprovadas pelos coordenadores.

---

*Documento preparado por: Marco Rossit*  
*Data: 31/08/2025*  
*Versão: 4.0 FINAL - Para desenvolvimento do zero*

**ESTE É O DOCUMENTO DEFINITIVO PARA CRIAR O SISTEMA MESC NO REPLIT**