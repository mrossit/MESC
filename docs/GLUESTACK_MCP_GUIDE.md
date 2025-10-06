# Guia de Uso do MCP Gluestack

## 📦 Instalação Completa

O MCP do Gluestack foi instalado em `/home/runner/gluestack-mcp/` com sucesso!

### Dependências Instaladas
- `@modelcontextprotocol/sdk`: ^1.11.5
- `zod`: ^3.25.20

---

## 🔧 Configuração do Claude Desktop

### Passo 1: Localizar o Arquivo de Configuração

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```powershell
%AppData%\Claude\claude_desktop_config.json
```

### Passo 2: Adicionar Configuração do MCP

Edite o arquivo `claude_desktop_config.json` e adicione:

```json
{
  "mcpServers": {
    "gluestack-ui": {
      "command": "node",
      "args": ["/home/runner/gluestack-mcp/index.js"]
    }
  }
}
```

**⚠️ Importante:** Ajuste o caminho completo conforme sua instalação.

### Passo 3: Reiniciar Claude Desktop

Feche completamente e reabra o Claude Desktop. O servidor MCP aparecerá no menu de ferramentas.

---

## 🎨 Componentes Disponíveis (37 componentes)

### Layout Components
- **Box** - Container básico com styling
- **Center** - Centraliza conteúdo
- **HStack** - Stack horizontal
- **VStack** - Stack vertical
- **Grid** - Sistema de grid
- **ScrollView** - Container com scroll

### Form Components
- **Button** - Botões interativos
- **Input** - Campo de entrada
- **Textarea** - Área de texto
- **Checkbox** - Caixa de seleção
- **Radio** - Botão de rádio
- **Switch** - Interruptor
- **Slider** - Controle deslizante
- **FormControl** - Container de formulário

### Data Display
- **Text** - Texto estilizado
- **Heading** - Cabeçalhos
- **Avatar** - Avatar de usuário
- **Badge** - Distintivo
- **Image** - Imagem otimizada
- **Icon** - Ícones
- **Table** - Tabelas de dados
- **Divider** - Divisor visual

### Feedback
- **Alert** - Mensagens de alerta
- **Toast** - Notificações temporárias
- **Progress** - Barra de progresso
- **Skeleton** - Loading placeholder
- **Spinner** - Indicador de carregamento

### Overlay
- **Modal** - Janela modal
- **Drawer** - Gaveta lateral
- **ActionSheet** - Menu de ações
- **AlertDialog** - Diálogo de confirmação
- **Popover** - Popover informativo
- **Tooltip** - Dica de ferramenta
- **Menu** - Menu dropdown

### Navigation
- **Link** - Link navegável
- **FAB** - Floating Action Button
- **Pressable** - Componente pressionável

### Utils
- **Portal** - Renderização em portal
- **Accordion** - Acordeão expansível

---

## 🛠️ Ferramentas MCP Disponíveis

### 1. `get_all_components_metadata`
Retorna metadata (título e descrição) de todos os 37 componentes.

**Uso:**
```
Chame a ferramenta sem parâmetros para ver lista completa
```

**Retorno:**
```json
{
  "button": {
    "title": "Button",
    "description": "Interactive component for triggering actions..."
  },
  "input": {
    "title": "Input",
    "description": "Text input field with customizable properties..."
  }
}
```

---

### 2. `select_components`
Seleciona componentes específicos para usar no projeto.

**Parâmetros:**
- `selectedComponents`: Array de strings com nomes dos componentes

**Exemplo:**
```json
{
  "selectedComponents": ["button", "input", "vstack", "hstack"]
}
```

**Retorno:**
```
You have selected: button, input, vstack, hstack.
Now proceed to get full documentation for ALL these components at once using get_selected_components_docs.
```

---

### 3. `get_selected_components_docs`
Retorna documentação completa dos componentes selecionados.

**Parâmetros:**
- `component_names`: Array de strings com nomes dos componentes

**Exemplo:**
```json
{
  "component_names": ["button", "input"]
}
```

**Retorno:**
Documentação completa em formato markdown incluindo:
- Props disponíveis
- Exemplos de uso
- Variantes e tamanhos
- Estados (disabled, loading, etc)

---

## 💡 Como Usar no Claude Desktop

### Fluxo de Trabalho Recomendado

1. **Descobrir Componentes**
   ```
   "Use a ferramenta get_all_components_metadata para ver todos os componentes disponíveis"
   ```

2. **Selecionar Componentes**
   ```
   "Selecione os componentes button, input, vstack e form-control"
   ```

3. **Obter Documentação**
   ```
   "Obtenha a documentação completa dos componentes selecionados"
   ```

4. **Gerar Código**
   ```
   "Crie uma tela de login usando os componentes do gluestack-ui"
   ```

---

## 📋 Exemplo Prático: Tela de Login

```jsx
import { VStack } from "@/components/ui/vstack";
import { Heading } from "@/components/ui/heading";
import { FormControl } from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";

function LoginScreen() {
  return (
    <VStack className="flex-1 p-6 bg-white justify-center" space="xl">
      <Heading size="2xl" className="text-center mb-8">
        Bem-vindo
      </Heading>

      <FormControl>
        <Input variant="outline" size="md">
          <InputField placeholder="Email" />
        </Input>
      </FormControl>

      <FormControl>
        <Input variant="outline" size="md">
          <InputField placeholder="Senha" type="password" />
        </Input>
      </FormControl>

      <Button size="lg" className="w-full">
        <ButtonText>Entrar</ButtonText>
      </Button>
    </VStack>
  );
}
```

---

## 🎨 Sistema de Cores

O Gluestack inclui um sistema de cores completo:

### Primary (Grayscale)
- `primary-0` a `primary-950` - Tons de cinza

### Secondary (Light Grays)
- `secondary-0` a `secondary-950` - Cinzas claros

### Tertiary (Orange)
- `tertiary-0` a `tertiary-950` - Tons de laranja

### Error (Red)
- `error-0` a `error-950` - Tons de vermelho

### Success (Green)
- `success-0` a `success-950` - Tons de verde

### Warning (Yellow)
- `warning-0` a `warning-950` - Tons de amarelo

### Info (Blue)
- `info-0` a `info-950` - Tons de azul

---

## ⚡ Regras do Sistema

O MCP do Gluestack segue estas regras automaticamente:

1. **✅ Apenas Componentes Gluestack** - Não usa bibliotecas externas
2. **✅ TailwindCSS** - Estilização via className
3. **❌ Sem HTML Tags** - Não usa `<div>`, `<button>`, `<input>`, etc
4. **❌ Sem StyleSheet** - Não usa React Native StyleSheet
5. **✅ Imagens Unsplash** - Usa apenas imagens do unsplash.com
6. **✅ Imports Individuais** - Importa cada componente separadamente
7. **✅ VStack/HStack Preferred** - Preferência sobre Box
8. **✅ Responsivo** - Código mobile-friendly e scrollable

---

## 🚀 Comandos Úteis

### Testar MCP Localmente
```bash
cd /home/runner/gluestack-mcp
node index.js
```

### Ver Logs
O MCP mostra no console:
```
✅ Selected components: button, input
✅ Getting documentation for components: button, input
Use Gluestack Components MCP Server running on stdio
```

---

## 📚 Recursos Adicionais

- **Repositório:** https://github.com/gluestack/mcp
- **Docs Gluestack:** https://gluestack.io/ui/docs
- **MCP Protocol:** https://modelcontextprotocol.io

---

## 🐛 Troubleshooting

### MCP não aparece no Claude Desktop
1. Verifique o caminho no `claude_desktop_config.json`
2. Certifique-se que o Node.js está instalado
3. Reinicie completamente o Claude Desktop
4. Verifique se não há erros de sintaxe no JSON

### Componente não encontrado
1. Use `get_all_components_metadata` para ver lista atualizada
2. Nomes devem estar em lowercase (ex: "button", não "Button")
3. Verifique se o arquivo .md existe em `/src/components/`

### Erro ao gerar código
1. Certifique-se de chamar as ferramentas na ordem correta:
   - `get_all_components_metadata`
   - `select_components`
   - `get_selected_components_docs`
2. Aguarde cada ferramenta retornar antes da próxima

---

## ✨ Dicas de Uso

1. **Sempre comece com metadata** - Veja quais componentes existem
2. **Selecione múltiplos componentes** - Mais eficiente que um por vez
3. **Use VStack/HStack** - Melhor para layouts do que Box
4. **Aproveite variants** - Cada componente tem múltiplas variantes
5. **Combine com TailwindCSS** - Classes como `p-4`, `mx-2`, `bg-primary-500`

---

**Data de Instalação:** 06/10/2025
**Versão:** 1.0.0
**Status:** ✅ Operacional
