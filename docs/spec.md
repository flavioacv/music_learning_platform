# Plataforma de Aprendizado Musical Interativo

## Visão Geral

### Nome do Projeto

Nome provisório: **Music Learning Platform**

### Objetivo

Criar uma plataforma interativa de aprendizado musical capaz de ensinar os fundamentos da música de forma visual, prática e gamificada, permitindo que uma pessoa sem conhecimento prévio desenvolva compreensão musical antes mesmo de possuir ou tocar um instrumento.

A plataforma não será apenas um curso online.

Ela será um ambiente de aprendizado onde o aluno aprende através de:

* Exercícios interativos
* Desafios práticos
* Simulações visuais
* Gamificação
* Feedback imediato

---

# Problema

O ensino tradicional de música normalmente apresenta algumas dificuldades:

* Excesso de teoria logo no início
* Dependência de possuir um instrumento
* Falta de feedback imediato
* Evolução lenta para iniciantes
* Baixa retenção dos alunos

Muitas pessoas desistem antes de compreender como a música realmente funciona.

---

# Proposta da Metodologia

A metodologia da plataforma inverte a ordem tradicional do ensino musical.

### Método Tradicional

```text
Instrumento
↓
Exercícios
↓
Teoria
↓
Compreensão Musical
```

### Método Proposto

```text
Compreensão Musical
↓
Teoria Aplicada
↓
Exercícios Interativos
↓
Instrumento
```

O objetivo é fazer o aluno compreender a lógica da música antes de desenvolver habilidades motoras específicas de um instrumento.

---

# Objetivo de Aprendizagem

## Primeiros 7 Dias

O aluno deve ser capaz de:

* Identificar notas musicais
* Compreender a relação entre notas
* Entender o conceito de escala
* Entender o conceito de acorde
* Montar acordes básicos em simuladores virtuais
* Executar exercícios simples na plataforma

---

## Primeiros 30 Dias

O aluno deve ser capaz de:

* Identificar notas em qualquer escala maior
* Entender intervalos
* Construir acordes maiores e menores
* Entender progressões harmônicas simples
* Reconhecer padrões musicais básicos

---

## Entre 60 e 90 Dias

O aluno deve estar preparado para iniciar um instrumento real com uma compreensão musical muito superior à de um iniciante tradicional.

Ao chegar nesta fase, o aluno já deverá compreender:

* Escalas
* Intervalos
* Formação de acordes
* Campo harmônico
* Funções harmônicas
* Progressões simples

---

# Público-Alvo

## Iniciantes Absolutos

Pessoas que nunca estudaram música.

## Pessoas que desistiram de aprender

Usuários que tentaram aprender através de métodos tradicionais e abandonaram.

## Músicos autodidatas

Pessoas que tocam por prática mas possuem lacunas teóricas.

---

# MVP (Versão 1)

## Funcionalidades Obrigatórias

### Autenticação

* Cadastro
* Login
* Recuperação de senha
* Logout

### Perfil

* Nome
* Foto
* Nível
* XP
* Progresso geral

### Sistema de Cursos

* Cursos
* Módulos
* Lições
* Exercícios

### Sistema de Progresso

* Lições concluídas
* Percentual concluído
* XP acumulado

### Gamificação

* XP
* Níveis
* Conquistas

---

# Estrutura dos Módulos

## Módulo 1 — O que são Notas Musicais

Objetivos:

* Entender as notas musicais
* Aprender nomenclatura latina
* Aprender nomenclatura americana

Conteúdo:

```text
Dó = C
Ré = D
Mi = E
Fá = F
Sol = G
Lá = A
Si = B
```

---

## Módulo 2 — Acidentes Musicais

Objetivos:

* Sustenidos
* Bemóis

Conteúdo:

```text
#
♭
```

---

## Módulo 3 — Escalas

Objetivos:

* Escala maior
* Formação de escalas

Exercícios:

* Montar escalas
* Completar escalas

---

## Módulo 4 — Intervalos

Objetivos:

* Distâncias entre notas
* Tons
* Semitons

---

## Módulo 5 — Formação de Acordes

Objetivos:

* Tríades
* Acordes maiores
* Acordes menores

---

## Módulo 6 — Campo Harmônico

Objetivos:

* Entender funções harmônicas
* Entender progressões

---

# Exercícios Interativos

## Identificação de Notas

O sistema apresenta uma nota.

O aluno deve identificá-la.

---

## Construção de Escalas

O sistema apresenta uma tonalidade.

O aluno deve construir a escala correta.

---

## Formação de Acordes

O sistema apresenta uma nota raiz.

O aluno deve construir o acorde correspondente.

---

## Reconhecimento Auditivo (Futuro)

O sistema toca:

* Notas
* Intervalos
* Acordes

O aluno identifica a resposta correta.

---

# Gamificação

## XP

O usuário recebe XP por:

* Assistir aulas
* Completar exercícios
* Acertar desafios

---

## Níveis

Exemplo:

```text
Nível 1 - Iniciante
Nível 5 - Aprendiz
Nível 10 - Explorador Musical
Nível 20 - Músico Iniciante
```

---

## Conquistas

Exemplos:

* Primeira Aula
* Primeira Escala
* Primeiro Acorde
* 7 Dias Seguidos
* 30 Dias Seguidos

---

# Arquitetura Técnica

## Frontend

Flutter Web

Motivos:

* Desenvolvimento rápido
* Compartilhamento futuro com Mobile
* Boa experiência interativa

---

## Backend

Node.js + TypeScript

Arquitetura:

```text
Controller
↓
Service
↓
Repository
↓
Database
```

---

## Banco de Dados

PostgreSQL

---

## Cache

Redis (Futuro)

---

## Armazenamento

S3 Compatible Storage

---

## Autenticação

JWT

---

# Modelo de Dados

## User

```typescript
User {
  id: string
  name: string
  email: string
  avatar?: string
  xp: number
  level: number
  createdAt: Date
}
```

---

## Course

```typescript
Course {
  id: string
  title: string
  description: string
  order: number
}
```

---

## Module

```typescript
Module {
  id: string
  courseId: string
  title: string
  order: number
}
```

---

## Lesson

```typescript
Lesson {
  id: string
  moduleId: string
  title: string
  content: string
  xpReward: number
}
```

---

## Exercise

```typescript
Exercise {
  id: string
  lessonId: string
  type: string
  question: string
  answer: string
}
```

---

## UserProgress

```typescript
UserProgress {
  id: string
  userId: string
  lessonId: string
  completed: boolean
  score: number
}
```

---

# Roadmap

## Fase 1

MVP

* Login
* Cursos
* Lições
* Exercícios
* Progresso

---

## Fase 2

Gamificação

* XP
* Níveis
* Conquistas

---

## Fase 3

Ferramentas Musicais

* Teclado Virtual
* Simulador de Escalas
* Simulador de Acordes

---

## Fase 4

Treino Auditivo

* Reconhecimento de notas
* Reconhecimento de acordes
* Reconhecimento de intervalos

---

## Fase 5

Inteligência Artificial

* Correção automática
* Recomendações personalizadas
* Plano de estudos adaptativo

---

# Visão de Longo Prazo

Transformar a plataforma em uma referência para aprendizado musical moderno, permitindo que qualquer pessoa compreenda música de forma intuitiva, visual e prática antes mesmo de escolher um instrumento.
