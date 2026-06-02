# QUESTION_BANK_SPEC.md

# Especificação do Banco de Questões

## Objetivo

Definir todos os tipos de questões que podem ser gerados pela IA.

A IA deve respeitar estas estruturas para garantir consistência.

---

# Difficulty Levels

```yaml
easy:
  description: reconhecimento simples

medium:
  description: aplicação do conceito

hard:
  description: raciocínio musical
```

---

# QUESTION TYPE: MULTIPLE_CHOICE

## Estrutura

```json
{
  "question": "",
  "options": [],
  "correctAnswer": ""
}
```

## Exemplo

Pergunta:

Qual nota corresponde à letra G?

Opções:

* Dó
* Sol
* Lá
* Mi

Resposta:

Sol

---

# QUESTION TYPE: FILL_BLANK

## Estrutura

```json
{
  "sentence": "",
  "answer": ""
}
```

## Exemplo

```text
A nota americana para Dó é _____
```

Resposta:

```text
C
```

---

# QUESTION TYPE: MATCH

## Estrutura

```json
{
  "left": [],
  "right": []
}
```

## Exemplo

```text
Dó → C
Ré → D
Mi → E
```

---

# QUESTION TYPE: SCALE_BUILDER

## Estrutura

```json
{
  "rootNote": "",
  "expectedScale": []
}
```

## Exemplo

```json
{
  "rootNote": "G",
  "expectedScale": ["G","A","B","C","D","E","F#"]
}
```

---

# QUESTION TYPE: INTERVAL_BUILDER

## Estrutura

```json
{
  "rootNote": "",
  "interval": ""
}
```

## Exemplo

```text
Construa uma terça maior a partir de C
```

Resposta:

```text
E
```

---

# QUESTION TYPE: CHORD_BUILDER

## Estrutura

```json
{
  "rootNote": "",
  "chordType": ""
}
```

## Exemplo

```text
Construa um acorde maior de G
```

Resposta:

```text
G B D
```

---

# QUESTION TYPE: HARMONIC_FIELD_BUILDER

## Estrutura

```json
{
  "key": ""
}
```

## Exemplo

```text
Monte o campo harmônico de C
```

Resposta:

```text
C
Dm
Em
F
G
Am
Bdim
```

---

# QUESTION TYPE: AUDIO_RECOGNITION

## Estrutura

```json
{
  "audio": "",
  "options": []
}
```

## Aplicações

* Nota
* Intervalo
* Escala
* Acorde
* Progressão

---

# QUESTION TYPE: RHYTHM_TAP

## Estrutura

```json
{
  "bpm": 120,
  "pattern": []
}
```

## Exemplo

```json
{
  "bpm": 120,
  "pattern": [1,0,1,1,0,1]
}
```

---

# Regras de Geração

A IA deve:

* Variar notas
* Variar tonalidades
* Variar dificuldades
* Evitar repetições
* Gerar respostas únicas

---

# Distribuição Recomendada

## Fácil

* 60%

## Médio

* 30%

## Difícil

* 10%

---

# Regra de Ouro

Toda questão deve ajudar o aluno a tocar melhor.

Se uma questão não possui aplicação prática futura, ela não deve ser gerada.
