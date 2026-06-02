# KNOWLEDGE_GRAPH.md

# Grafo de Conhecimento Musical

## Objetivo

Este documento define a relação entre todos os conceitos da plataforma.

Sua função é:

* Determinar pré-requisitos
* Impedir conteúdo fora de ordem
* Permitir geração automática de trilhas de aprendizado
* Permitir desbloqueio inteligente de conteúdo

---

# Visão Geral

```text
Notas Musicais
│
├── Acidentes Musicais
│
├── Ritmo
│
├── Escalas
│   │
│   ├── Tons e Semitons
│   │
│   ├── Escalas Maiores
│   │
│   ├── Escalas Menores
│   │
│   └── Relativos
│
├── Intervalos
│
├── Acordes
│   │
│   ├── Tríades
│   │
│   ├── Maiores
│   │
│   ├── Menores
│   │
│   ├── Diminutos
│   │
│   └── Aumentados
│
├── Campo Harmônico
│   │
│   ├── Graus
│   │
│   ├── Funções Harmônicas
│   │
│   └── Progressões
│
├── Aplicação Musical
│
└── Treino Auditivo
```

---

# NÍVEL 1 — FUNDAMENTOS

## Conceito: Notas Musicais

### Dependências

Nenhuma

### Habilidades Desenvolvidas

* Reconhecer notas naturais
* Reconhecer notação americana
* Reconhecer acidentes musicais

### Desbloqueia

```text
Ritmo
Escalas
```

---

# NÍVEL 2 — RITMO

## Conceito: Ritmo

### Dependências

```text
Notas Musicais
```

### Habilidades Desenvolvidas

* Pulsação
* Tempo
* Compasso
* Divisão rítmica

### Desbloqueia

```text
Aplicação Musical
Treino Auditivo
```

---

# NÍVEL 3 — ESCALAS

## Conceito: Escalas

### Dependências

```text
Notas Musicais
```

### Subconceitos

#### Tons

#### Semitons

#### Escala Maior

#### Escala Menor

#### Relativo Maior

#### Relativo Menor

### Habilidades Desenvolvidas

* Construção de escalas
* Identificação de tonalidades

### Desbloqueia

```text
Intervalos
Acordes
```

---

# NÍVEL 4 — INTERVALOS

## Conceito: Intervalos

### Dependências

```text
Notas Musicais
Escalas
```

### Subconceitos

```text
Segunda
Terça
Quarta
Quinta
Sexta
Sétima
Oitava
```

### Habilidades Desenvolvidas

* Medir distâncias entre notas
* Reconhecer estrutura musical

### Desbloqueia

```text
Acordes
Treino Auditivo
```

---

# NÍVEL 5 — ACORDES

## Conceito: Acordes

### Dependências

```text
Escalas
Intervalos
```

### Subconceitos

#### Tríades

#### Maiores

#### Menores

#### Diminutos

#### Aumentados

### Habilidades Desenvolvidas

* Construir acordes
* Identificar acordes
* Ler cifras

### Desbloqueia

```text
Campo Harmônico
Aplicação Musical
Treino Auditivo
```

---

# NÍVEL 6 — CAMPO HARMÔNICO

## Conceito: Campo Harmônico

### Dependências

```text
Escalas
Intervalos
Acordes
```

### Subconceitos

#### Graus Harmônicos

```text
I
ii
iii
IV
V
vi
vii°
```

#### Funções Harmônicas

```text
Tônica
Subdominante
Dominante
```

#### Progressões

```text
I - IV - V

I - V - vi - IV

ii - V - I
```

### Habilidades Desenvolvidas

* Relacionar acordes
* Criar progressões

### Desbloqueia

```text
Aplicação Musical
Treino Auditivo
```

---

# NÍVEL 7 — APLICAÇÃO MUSICAL

## Conceito: Aplicação Musical

### Dependências

```text
Ritmo
Escalas
Intervalos
Acordes
Campo Harmônico
```

### Habilidades Desenvolvidas

* Analisar músicas
* Identificar tonalidades
* Identificar progressões
* Criar acompanhamentos

### Desbloqueia

```text
Treino Auditivo Avançado
```

---

# NÍVEL 8 — TREINO AUDITIVO

## Conceito: Treino Auditivo

### Dependências

```text
Ritmo
Escalas
Intervalos
Acordes
Campo Harmônico
```

### Etapas

#### Reconhecimento de Notas

#### Reconhecimento de Intervalos

#### Reconhecimento de Escalas

#### Reconhecimento de Acordes

#### Reconhecimento de Progressões

### Habilidades Desenvolvidas

* Identificar sons
* Relacionar teoria e audição
* Desenvolver percepção musical

---

# MATRIZ DE DEPENDÊNCIAS

| Conceito          | Requer                                                   |
| ----------------- | -------------------------------------------------------- |
| Notas Musicais    | Nenhum                                                   |
| Ritmo             | Notas                                                    |
| Escalas           | Notas                                                    |
| Intervalos        | Notas + Escalas                                          |
| Acordes           | Escalas + Intervalos                                     |
| Campo Harmônico   | Escalas + Intervalos + Acordes                           |
| Aplicação Musical | Ritmo + Escalas + Intervalos + Acordes + Campo Harmônico |
| Treino Auditivo   | Ritmo + Escalas + Intervalos + Acordes + Campo Harmônico |

---

# Regra de Geração de Conteúdo

A IA nunca deve:

* Ensinar acordes antes de intervalos
* Ensinar campo harmônico antes de acordes
* Ensinar progressões antes de campo harmônico
* Ensinar improvisação antes de escalas

A IA sempre deve respeitar as dependências definidas neste documento.

---

# Objetivo Final da Jornada

Ao concluir todos os nós deste grafo o aluno deverá ser capaz de:

✓ Ler cifras

✓ Entender escalas

✓ Entender acordes

✓ Entender progressões

✓ Entender músicas simples

✓ Iniciar qualquer instrumento com base musical sólida

✓ Continuar estudos avançados de forma independente
