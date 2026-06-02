---
name: music-learning-domain
description: Core domain knowledge, curriculum, and gamification rules for the Music Learning Platform
when_to_use: "When designing features, writing seed data, creating educational exercises, generating lesson content, or implementing gamification logic related to music theory."
allowed-tools: Read, Write
---

# Music Learning Domain

This skill provides the comprehensive pedagogical methodology, curriculum, exercise formats, and gamification system for the Music Learning Platform. It serves as the single source of truth for agents when generating or evaluating music-related content and rules.

## Methodology: Inverse Learning

The platform flips the traditional music teaching order:
- **Traditional**: Instrument → Exercises → Theory → Understanding
- **Proposed**: Understanding → Applied Theory → Interactive Exercises → Instrument

## Curriculum Journey (8 Modules)

**Module 1 - Notas Musicais**
- Goal: Learn natural notes (Dó, Ré, Mi...) and American notation (C, D, E...).
- Expected Result: Immediate note recognition.

**Module 2 - Ritmo**
- Goal: Temporal perception, pulse, tempo, time signatures, rhythmic figures (Semibreve to Semicolcheia).

**Module 3 - Escalas**
- Goal: Tones, semitones, Major Scale formula (T-T-S-T-T-T-S), relative minor.

**Module 4 - Intervalos**
- Goal: Distances between notes (Unison, Second, Third, Fourth, Fifth, Sixth, Seventh, Octave).

**Module 5 - Acordes**
- Goal: Constructing Major (1-3-5), Minor (1-b3-5), Diminished (1-b3-b5), and Augmented Triads (1-3-#5).

**Module 6 - Campo Harmônico**
- Goal: Chord progressions, degrees (I, ii, iii, IV, V, vi, vii°), harmonic functions (Tonic, Subdominant, Dominant).

**Module 7 - Aplicação Musical**
- Goal: Famous progressions (I - V - vi - IV), harmonic analysis, turning theory into practice.

**Module 8 - Treino Auditivo**
- Goal: Hear before playing (recognize notes, intervals, scales, chords, progressions by ear).

## Content Structure per Module

When generating new lessons, strictly adhere to this sequence:
1. **Conceito**: Theoretical base.
2. **Explicação Visual**: Diagrams or representations.
3. **Exercícios Guiados**: Low-friction practice.
4. **Exercícios Práticos**: Unassisted practice.
5. **Desafio Final**: Capstone challenge.
6. **Avaliação**: Final assessment.

## Exercise Types (Payload Definitions)

Only the following exercise types are permitted:
- `multiple_choice`
- `drag_and_drop`
- `fill_blank`
- `audio_recognition`
- `note_identification`
- `chord_builder`
- `scale_builder`

## Gamification and XP System

When inserting or updating content in the database (`lessons`, `exercises`, `achievements`) or managing user progress, ensure these XP values are respected:
- **Conceito estudado**: +10 XP
- **Exercício correto**: +20 XP
- **Desafio concluído**: +50 XP
- **Avaliação concluída**: +100 XP

**Unlock Criteria for Next Module:**
- 80% correct exercises.
- Challenge completed.
- Assessment completed.

## Agent Guidelines for Database Insertion & Code Logic

- **Code Structure**: When calculating progress or XP locally (Flutter or Node.js), use the base numbers outlined in the Gamification section.
- **Seed Data Generation**: When writing SQL statements to populate the database with courses and lessons, use the Curriculum Journey titles and the exact XP constraints.
- **Contextual Responses**: If a user asks to add an exercise about scales, always suggest `scale_builder` or `audio_recognition` type, as they align with the platform's vision.
