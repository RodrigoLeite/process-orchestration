# Design System - Central de Demandas IA

## Stack de UI

- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Biblioteca de componentes baseada em Radix UI
- **Lucide React** - Ícones
- **Framer Motion** - Animações (opcional)
- **Recharts** - Gráficos

---

## Cores (CSS Variables)

O sistema usa CSS variables HSL para fácil customização e suporte a dark mode:

```css
:root {
  /* Cores principais */
  --background: 0 0% 100%;           /* Branco */
  --foreground: 222.2 84% 4.9%;      /* Quase preto */
  
  /* Cores primárias (Azul) */
  --primary: 221.2 83.2% 53.3%;      /* Azul vibrante #3B82F6 */
  --primary-foreground: 210 40% 98%; /* Branco */
  
  /* Cores secundárias */
  --secondary: 210 40% 96.1%;        /* Cinza claro */
  --secondary-foreground: 222.2 47.4% 11.2%;
  
  /* Cores de destaque */
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  
  /* Cores de erro/perigo */
  --destructive: 0 84.2% 60.2%;      /* Vermelho */
  --destructive-foreground: 210 40% 98%;
  
  /* Cores neutras */
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  /* Cards e Popovers */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  
  /* Bordas e Inputs */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  
  /* Sidebar */
  --sidebar: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-primary: 221.2 83.2% 53.3%;
  --sidebar-primary-foreground: 210 40% 98%;
  --sidebar-border: 220 13% 91%;
  
  /* Gráficos */
  --chart-1: 12 76% 61%;   /* Laranja */
  --chart-2: 173 58% 39%;  /* Verde-azulado */
  --chart-3: 197 37% 24%;  /* Azul escuro */
  --chart-4: 43 74% 66%;   /* Amarelo */
  --chart-5: 27 87% 67%;   /* Laranja claro */
  
  /* Tipografia */
  --font-sans: 'Inter', sans-serif;
  
  /* Border Radius */
  --radius: 0.5rem; /* 8px */
}
```

### Dark Mode

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --card: 222.2 84% 4.9%;
  --border: 217.2 32.6% 17.5%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  /* ... demais cores invertidas */
}
```

---

## Tipografia

```css
/* Títulos */
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }  /* H1 - Páginas */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; } /* H2 */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }      /* H3 */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }   /* H4 */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }  /* H5 */

/* Corpo */
.text-base { font-size: 1rem; line-height: 1.5rem; }     /* Parágrafo */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }  /* Labels, descrições */
.text-xs { font-size: 0.75rem; line-height: 1rem; }      /* Metadados, badges */

/* Pesos */
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }
.font-normal { font-weight: 400; }
```

---

## Layout Principal

### Estrutura

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (fixed, left)  │  Header (sticky, top)        │
│  - Logo                 │  - Título do sistema         │
│  - Navigation items     │  - Tenant info               │
│  - Collapse toggle      │  - User menu                 │
│                         ├────────────────────────────────
│                         │  Main Content                │
│                         │  - max-w-7xl mx-auto         │
│                         │  - px-4 py-8                 │
│                         │                              │
│                         ├────────────────────────────────
│                         │  Footer                      │
└─────────────────────────┴────────────────────────────────
```

### Sidebar

```tsx
// Largura
- Expandida: w-64 (256px)
- Colapsada: w-20 (80px)

// Cores
- Background: bg-sidebar (quase branco)
- Texto: text-sidebar-foreground
- Item ativo: bg-sidebar-primary text-sidebar-primary-foreground
- Borda: border-sidebar-border

// Transição suave
transition-all duration-200
```

### Header

```tsx
// Estilo
- Height: h-16 (64px)
- Background: bg-card/50 backdrop-blur-sm
- Borda: border-b
- Sticky: sticky top-0 z-40
```

### Main Content

```tsx
// Container
- Max width: max-w-7xl (1280px)
- Centralizado: mx-auto
- Padding: px-4 py-8
- Full width: w-full
```

---

## Componentes shadcn/ui

### Buttons

```tsx
// Variantes
<Button variant="default">Primary</Button>     // Azul sólido
<Button variant="secondary">Secondary</Button> // Cinza
<Button variant="outline">Outline</Button>     // Borda
<Button variant="ghost">Ghost</Button>         // Transparente
<Button variant="destructive">Delete</Button>  // Vermelho

// Tamanhos
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">🔍</Button>

// Estilo base
rounded-lg px-4 py-2 font-medium transition-colors
```

### Cards

```tsx
<Card className="rounded-xl border bg-card shadow-sm">
  <CardHeader className="pb-2">
    <CardTitle className="text-lg font-semibold">Título</CardTitle>
    <CardDescription className="text-sm text-muted-foreground">
      Descrição
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
  <CardFooter className="pt-4 border-t">
    {/* Ações */}
  </CardFooter>
</Card>
```

### Input / Forms

```tsx
<div className="space-y-2">
  <Label htmlFor="email" className="text-sm font-medium">
    Email
  </Label>
  <Input 
    id="email"
    type="email"
    placeholder="seu@email.com"
    className="h-10 rounded-md border border-input px-3"
  />
</div>
```

### Select

```tsx
<Select>
  <SelectTrigger className="w-full h-10 rounded-md border">
    <SelectValue placeholder="Selecione..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opt1">Opção 1</SelectItem>
    <SelectItem value="opt2">Opção 2</SelectItem>
  </SelectContent>
</Select>
```

### Badge

```tsx
// Variantes
<Badge variant="default">Default</Badge>       // Azul
<Badge variant="secondary">Secondary</Badge>   // Cinza
<Badge variant="outline">Outline</Badge>       // Borda
<Badge variant="destructive">Error</Badge>     // Vermelho

// Customizado por prioridade
const priorityColors = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};
```

### Dialog / Modal

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir Modal</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-lg rounded-xl">
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription>Descrição do modal</DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Conteúdo */}
    </div>
    <DialogFooter className="gap-2">
      <Button variant="outline">Cancelar</Button>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Table

```tsx
<Table>
  <TableHeader>
    <TableRow className="hover:bg-muted/50">
      <TableHead className="font-semibold">Nome</TableHead>
      <TableHead>Email</TableHead>
      <TableHead className="text-right">Ações</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">João</TableCell>
      <TableCell>joao@email.com</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm">Editar</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Tabs

```tsx
<Tabs defaultValue="tab1" className="w-full">
  <TabsList className="grid grid-cols-3 w-full max-w-md">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
    <TabsTrigger value="tab3">Tab 3</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" className="mt-4">
    Conteúdo Tab 1
  </TabsContent>
</Tabs>
```

### Toast / Sonner

```tsx
import { toast } from "sonner";

// Sucesso
toast.success("Salvo com sucesso!");

// Erro
toast.error("Ocorreu um erro");

// Info
toast.info("Informação importante");

// Loading
toast.loading("Processando...");
```

---

## Padrões de Página

### Página Lista

```tsx
export default function ListPage() {
  return (
    <div className="space-y-6">
      {/* Header da página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Título da Página</h1>
          <p className="text-muted-foreground mt-1">
            Descrição breve do que essa página faz
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      </div>

      {/* Filtros (opcional) */}
      <div className="flex gap-4 items-center">
        <Input placeholder="Buscar..." className="max-w-xs" />
        <Select>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>...</SelectContent>
        </Select>
      </div>

      {/* Grid ou Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <Card key={item.id}>...</Card>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhum item encontrado</h3>
          <p className="text-muted-foreground">
            Crie seu primeiro item para começar
          </p>
          <Button className="mt-4">Criar Item</Button>
        </div>
      )}
    </div>
  );
}
```

### Página Detalhe

```tsx
export default function DetailPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back */}
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{item.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{item.status}</Badge>
            <span className="text-muted-foreground text-sm">
              Criado em {formatDate(item.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Editar</Button>
          <Button variant="destructive">Excluir</Button>
        </div>
      </div>

      {/* Conteúdo em Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent>...</CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadados</CardTitle>
            </CardHeader>
            <CardContent>...</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

### Página Form

```tsx
export default function FormPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Criar Novo Item</h1>
        <p className="text-muted-foreground mt-1">
          Preencha os campos abaixo
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" rows={4} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select>...</Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select>...</Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
              <Button type="submit">
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Kanban Board

### PhaseColumn (Coluna)

```tsx
<div className="flex-shrink-0 w-80 bg-muted/30 rounded-xl p-4">
  {/* Header */}
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: phase.color }} 
      />
      <h3 className="font-semibold">{phase.name}</h3>
      <Badge variant="secondary" className="text-xs">
        {cards.length}
      </Badge>
    </div>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="w-4 h-4" />
    </Button>
  </div>

  {/* Cards */}
  <div className="space-y-3">
    {cards.map(card => (
      <CardItem key={card.id} card={card} />
    ))}
  </div>

  {/* Add button */}
  <Button 
    variant="ghost" 
    className="w-full mt-3 border-dashed border-2"
  >
    <Plus className="w-4 h-4 mr-2" />
    Adicionar Card
  </Button>
</div>
```

### CardItem (Cartão)

```tsx
<div className="bg-card rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
  {/* Labels */}
  <div className="flex flex-wrap gap-1 mb-2">
    {card.labels?.map(label => (
      <span 
        key={label}
        className="px-2 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: labelColors[label] }}
      >
        {label}
      </span>
    ))}
  </div>

  {/* Title */}
  <h4 className="font-medium line-clamp-2">{card.title}</h4>

  {/* Description preview */}
  {card.description && (
    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
      {card.description}
    </p>
  )}

  {/* Footer */}
  <div className="flex items-center justify-between mt-3 pt-3 border-t">
    <div className="flex items-center gap-2">
      {/* Priority */}
      <Badge variant="outline" className={priorityColors[card.priority]}>
        {card.priority}
      </Badge>
      
      {/* Comments count */}
      {card.commentsCount > 0 && (
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <MessageSquare className="w-3 h-3" />
          {card.commentsCount}
        </div>
      )}
    </div>

    {/* Assignee */}
    {card.assignee && (
      <Avatar className="w-6 h-6">
        <AvatarImage src={card.assignee.image} />
        <AvatarFallback className="text-xs">
          {card.assignee.name[0]}
        </AvatarFallback>
      </Avatar>
    )}
  </div>
</div>
```

---

## Loading States

### Skeleton

```tsx
// Card skeleton
<Card>
  <CardContent className="p-4 space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-20 w-full" />
  </CardContent>
</Card>

// Table skeleton
<TableRow>
  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
</TableRow>
```

### Loading Spinner

```tsx
<div className="flex items-center justify-center py-12">
  <Loader2 className="w-8 h-8 animate-spin text-primary" />
</div>
```

---

## Responsividade

### Breakpoints

```css
sm:  640px   /* Mobile landscape */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Extra large */
```

### Padrões

```tsx
// Grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Sidebar colapsável no mobile
<aside className="hidden lg:block w-64">

// Stack vertical no mobile, horizontal no desktop
<div className="flex flex-col md:flex-row gap-4">

// Ocultar texto no mobile
<span className="hidden md:inline">Texto completo</span>
```

---

## Animações (Framer Motion)

```tsx
import { motion, AnimatePresence } from "framer-motion";

// Fade in
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// List stagger
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.1 }}
  >
))}

// Exit animation
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
  )}
</AnimatePresence>
```

---

## Ícones (Lucide)

```tsx
import {
  Home, Settings, Users, LayoutGrid, Plus, Search,
  ChevronDown, ChevronRight, MoreHorizontal, X,
  Check, AlertTriangle, Info, Loader2, Trash2,
  Edit, Eye, Download, Upload, RefreshCw,
  ArrowLeft, ArrowRight, ExternalLink, Copy,
  Calendar, Clock, Mail, Phone, MapPin,
  Trello, GitBranch, Zap, Bot, Shield
} from "lucide-react";

// Tamanhos padrão
<Icon className="w-4 h-4" />  // Small (16px)
<Icon className="w-5 h-5" />  // Default (20px)
<Icon className="w-6 h-6" />  // Medium (24px)
<Icon className="w-8 h-8" />  // Large (32px)
```

---

## Acessibilidade

```tsx
// Labels para inputs
<Label htmlFor="email">Email</Label>
<Input id="email" aria-describedby="email-hint" />
<p id="email-hint" className="text-xs text-muted-foreground">
  Seu email profissional
</p>

// Botões com aria-label
<Button aria-label="Fechar modal" size="icon">
  <X className="w-4 h-4" />
</Button>

// Focus visible
focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2

// Screen reader only
<span className="sr-only">Carregando...</span>
```

---

Este design system garante consistência visual em toda a aplicação. Use os componentes shadcn/ui como base e customize conforme necessário.
