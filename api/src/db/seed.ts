import { pool } from './pool.js';

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Limpeza do banco...');
    await client.query('TRUNCATE courses, modules, lessons, exercises, achievements CASCADE');

    console.log('Inserindo conquistas base...');
    await client.query(`
      INSERT INTO achievements (id, code, title, description, xp_reward) VALUES 
      (gen_random_uuid(), 'first_lesson', 'Primeiro som', 'Concluiu a primeira licao.', 10),
      (gen_random_uuid(), 'cipher_reader', 'Leitor de cifras', 'Acertou notas em cifra americana.', 20),
      (gen_random_uuid(), 'scale_builder', 'Construtor de escalas', 'Montou a primeira escala maior.', 30)
    `);

    console.log('Inserindo Curso...');
    const courseRes = await client.query(`
      INSERT INTO courses (title, description, sort_order) 
      VALUES ('Fundamentos Musicais', 'Compreensao musical, teoria aplicada e exercicios interativos para iniciantes.', 1)
      RETURNING id
    `);
    const courseId = courseRes.rows[0].id;

    // --- MODULO 1: NOTAS MUSICAIS ---
    console.log('Inserindo Módulo 1...');
    const module1Res = await client.query(`
      INSERT INTO modules (course_id, title, description, sort_order) 
      VALUES ($1, 'Notas Musicais', 'O alfabeto da musica, cifras americanas e acidentes.', 1)
      RETURNING id
    `, [courseId]);
    const module1Id = module1Res.rows[0].id;

    console.log('Inserindo Aulas do Módulo 1...');
    await client.query(`
      INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order) VALUES 
      ($1, 'O que e uma nota musical', 'O inicio de tudo.', 'A musica e construida a partir de notas. Existem 7 notas naturais. Imagine as notas como as cores primarias da musica.', 10, 1),
      ($1, 'As 7 notas naturais', 'Do Re Mi Fa Sol La Si', 'A sequencia padrao que todos conhecem: Do, Re, Mi, Fa, Sol, La, Si.', 10, 2),
      ($1, 'Notacao Americana', 'A linguagem global', 'Na musica internacional, usamos letras. C=Do, D=Re, E=Mi, F=Fa, G=Sol, A=La, B=Si.', 10, 3),
      ($1, 'Sustenidos (#)', 'Aumentando o tom', 'O sustenido (#) aumenta a nota em meio tom. Exemplo: C vira C#.', 10, 4),
      ($1, 'Bemois (b)', 'Abaixando o tom', 'O bemol (b) abaixa a nota em meio tom. Exemplo: D vira Db.', 10, 5),
      ($1, 'Enarmonia', 'Nomes diferentes, mesmo som', 'Notas com nomes diferentes mas que representam o mesmo som, como C# e Db.', 10, 6),
      ($1, 'Localizando notas', 'Encontrando os sons', 'Saber mapear mentalmente e fisicamente as notas antes de tocar.', 10, 7),
      ($1, 'Desafio de notas', 'Teste seus reflexos', 'Reconheca notas aleatorias em menos de 3 segundos.', 50, 8),
      ($1, 'Avaliacao do Modulo 1', 'Teste seu dominio', 'Responda as questoes finais para garantir seus 100 XP e desbloquear o Modulo 2.', 100, 9)
    `, [module1Id]);

    // Exercícios Módulo 1 (associando com a aula 3 que tem sort_order = 3 e aula 4 que tem sort_order = 4)
    const lessonsMod1Res = await client.query(`SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`, [module1Id]);
    const lesson3Id = lessonsMod1Res.rows.find(l => l.sort_order === 3).id;
    const lesson4Id = lessonsMod1Res.rows.find(l => l.sort_order === 4).id;

    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'multiple_choice', 'Qual nota corresponde a letra G?', $2, 20, 1)
    `, [lesson3Id, JSON.stringify({
      options: ['Do', 'Sol', 'La', 'Mi'],
      correctAnswer: 'Sol'
    })]);

    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'fill_blank', 'A nota americana para Do e _____', $2, 20, 2)
    `, [lesson3Id, JSON.stringify({
      sentence: 'A nota americana para Do e _____',
      answer: 'C'
    })]);

    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'multiple_choice', 'Qual e o sustenido de C?', $2, 20, 1)
    `, [lesson4Id, JSON.stringify({
      options: ['C#', 'D#', 'Cb', 'Db'],
      correctAnswer: 'C#'
    })]);

    // --- MODULO 2: RITMO ---
    console.log('Inserindo Módulo 2...');
    const module2Res = await client.query(`
      INSERT INTO modules (course_id, title, description, sort_order) 
      VALUES ($1, 'Ritmo', 'Pulsação, tempo, compasso e divisões rítmicas.', 2)
      RETURNING id
    `, [courseId]);
    const module2Id = module2Res.rows[0].id;

    console.log('Inserindo Aulas do Módulo 2...');
    await client.query(`
      INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order) VALUES 
      ($1, 'O que e ritmo', 'O coracao da musica', 'Ritmo é a organizacao do som no tempo.', 10, 1),
      ($1, 'Pulsacao', 'O batimento constante', 'A pulsação é uma batida regular que se mantém ao longo da música.', 10, 2),
      ($1, 'Tempo e BPM', 'Velocidade', 'BPM significa Batidas Por Minuto e define a velocidade da música.', 10, 3),
      ($1, 'Compasso', 'Agrupando os tempos', 'A organização das pulsações em grupos regulares, como 4/4.', 10, 4),
      ($1, 'Semibreve', '4 tempos', 'A nota de maior duração na notação moderna comum.', 10, 5),
      ($1, 'Minima', '2 tempos', 'Dura metade de uma semibreve.', 10, 6),
      ($1, 'Seminima', '1 tempo', 'Dura metade de uma mínima. A marcação padrão em 4/4.', 10, 7),
      ($1, 'Colcheia', 'Meio tempo', 'Dura metade de uma semínima.', 10, 8),
      ($1, 'Semicolcheia', '1/4 de tempo', 'Dura metade de uma colcheia.', 10, 9),
      ($1, 'Metronomo', 'Seu melhor amigo', 'Uma ferramenta que produz cliques consistentes em um determinado BPM.', 10, 10),
      ($1, 'Exercicios ritmicos', 'Pratica de timing', 'Vamos testar seu timing seguindo o clique.', 50, 11),
      ($1, 'Avaliacao do Modulo 2', 'Teste seu dominio', 'Responda para desbloquear o modulo 3.', 100, 12)
    `, [module2Id]);

    const lessonsMod2Res = await client.query(`SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`, [module2Id]);
    const lesson11Id = lessonsMod2Res.rows.find(l => l.sort_order === 11).id;

    // Exercícios Módulo 2 (Rhythm Tap payload)
    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'rhythm_tap', 'Acompanhe a semínima no BPM 120', $2, 20, 1)
    `, [lesson11Id, JSON.stringify({
      bpm: 120,
      pattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] // Exemplo simplificado
    })]);

    // --- MODULO 3: ESCALAS ---
    console.log('Inserindo Módulo 3...');
    const module3Res = await client.query(`
      INSERT INTO modules (course_id, title, description, sort_order) 
      VALUES ($1, 'Escalas', 'A matemática por trás das melodias e regras T-T-S-T-T-T-S.', 3)
      RETURNING id
    `, [courseId]);
    const module3Id = module3Res.rows[0].id;

    console.log('Inserindo Aulas do Módulo 3...');
    await client.query(`
      INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order) VALUES 
      ($1, 'O que e uma escala', 'A escada musical', 'Uma sequência de notas organizada de forma ascendente ou descendente.', 10, 1),
      ($1, 'Tom e Semitom', 'A regua musical', 'Semitom é a menor distância entre duas notas. Tom é igual a dois semitons.', 10, 2),
      ($1, 'Escala Maior', 'A formula magica', 'Construída pela regra: Tom - Tom - Semitom - Tom - Tom - Tom - Semitom.', 10, 3),
      ($1, 'Escala de C', 'Sem sustenidos', 'C, D, E, F, G, A, B. É a escala natural.', 10, 4),
      ($1, 'Escala de G', 'Um sustenido', 'G, A, B, C, D, E, F#. O Fá precisou do sustenido para manter a fórmula.', 10, 5),
      ($1, 'Escalas Relativas', 'Irmas musicais', 'Escalas que possuem exatamente as mesmas notas, mas começam de pontos diferentes.', 10, 6),
      ($1, 'Construindo Escalas', 'Prática', 'Vamos construir as demais escalas utilizando a regra T-T-S.', 50, 7),
      ($1, 'Avaliacao do Modulo 3', 'Teste seu dominio', 'Teste seus conhecimentos para prosseguir.', 100, 8)
    `, [module3Id]);

    const lessonsMod3Res = await client.query(`SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`, [module3Id]);
    const lessonMod3_7Id = lessonsMod3Res.rows.find(l => l.sort_order === 7).id;

    // Exercícios Módulo 3 (Scale Builder payload)
    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'scale_builder', 'Construa a Escala de Sol Maior', $2, 20, 1)
    `, [lessonMod3_7Id, JSON.stringify({
      rootNote: 'G',
      expectedScale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#']
    })]);

    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'scale_builder', 'Construa a Escala de Re Maior', $2, 20, 2)
    `, [lessonMod3_7Id, JSON.stringify({
      rootNote: 'D',
      expectedScale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']
    })]);

    // --- MODULO 4: INTERVALOS ---
    console.log('Inserindo Módulo 4...');
    const module4Res = await client.query(`
      INSERT INTO modules (course_id, title, description, sort_order) 
      VALUES ($1, 'Intervalos', 'Compreender distâncias musicais.', 4)
      RETURNING id
    `, [courseId]);
    const module4Id = module4Res.rows[0].id;

    await client.query(`
      INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order) VALUES 
      ($1, 'O que é um intervalo', 'A distancia entre notas', 'Conceito de intervalos musicais.', 10, 1),
      ($1, 'Segunda', 'Intervalo de 2a', 'Maior e menor.', 10, 2),
      ($1, 'Terça', 'Intervalo de 3a', 'Maior e menor.', 10, 3),
      ($1, 'Quarta', 'Intervalo de 4a', 'Justa e aumentada.', 10, 4),
      ($1, 'Quinta', 'Intervalo de 5a', 'Justa e diminuta.', 10, 5),
      ($1, 'Sexta', 'Intervalo de 6a', 'Maior e menor.', 10, 6),
      ($1, 'Sétima', 'Intervalo de 7a', 'Maior e menor.', 10, 7),
      ($1, 'Oitava', 'Intervalo de 8a', 'A repetição da nota.', 10, 8),
      ($1, 'Avaliação Final', 'Teste seu dominio', 'Teste seus conhecimentos.', 100, 9)
    `, [module4Id]);

    const lessonsMod4Res = await client.query(`SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`, [module4Id]);
    const lessonMod4_3Id = lessonsMod4Res.rows.find(l => l.sort_order === 3).id;

    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'interval_builder', 'Construa uma terça maior a partir de C', $2, 20, 1)
    `, [lessonMod4_3Id, JSON.stringify({ rootNote: 'C', interval: '3M', answer: 'E' })]);

    // --- MODULO 5: ACORDES ---
    console.log('Inserindo Módulo 5...');
    const module5Res = await client.query(`
      INSERT INTO modules (course_id, title, description, sort_order) 
      VALUES ($1, 'Acordes', 'Construir acordes utilizando intervalos.', 5)
      RETURNING id
    `, [courseId]);
    const module5Id = module5Res.rows[0].id;

    await client.query(`
      INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order) VALUES 
      ($1, 'O que é um acorde', 'Harmonia básica', 'Conjunto de notas tocadas juntas.', 10, 1),
      ($1, 'Tríades', '3 notas', 'Formadas por tônica, terça e quinta.', 10, 2),
      ($1, 'Acordes Maiores', 'Som alegre', 'Tônica, terça maior, quinta justa.', 10, 3),
      ($1, 'Acordes Menores', 'Som triste', 'Tônica, terça menor, quinta justa.', 10, 4),
      ($1, 'Acordes Diminutos', 'Som tenso', 'Tônica, terça menor, quinta diminuta.', 10, 5),
      ($1, 'Acordes Aumentados', 'Som expansivo', 'Tônica, terça maior, quinta aumentada.', 10, 6),
      ($1, 'Construção de Acordes', 'Prática', 'Montando tríades.', 50, 7),
      ($1, 'Avaliação Final', 'Teste seu dominio', 'Teste seus conhecimentos.', 100, 8)
    `, [module5Id]);

    const lessonsMod5Res = await client.query(`SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`, [module5Id]);
    const lessonMod5_7Id = lessonsMod5Res.rows.find(l => l.sort_order === 7).id;

    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'chord_builder', 'Construa um acorde maior de G', $2, 20, 1)
    `, [lessonMod5_7Id, JSON.stringify({ rootNote: 'G', chordType: 'Major', answer: 'G B D' })]);

    // --- MODULO 6: CAMPO HARMÔNICO ---
    console.log('Inserindo Módulo 6...');
    const module6Res = await client.query(`
      INSERT INTO modules (course_id, title, description, sort_order) 
      VALUES ($1, 'Campo Harmônico', 'Entender a relação entre acordes.', 6)
      RETURNING id
    `, [courseId]);
    const module6Id = module6Res.rows[0].id;

    await client.query(`
      INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order) VALUES 
      ($1, 'O que é Campo Harmônico', 'A familia de acordes', 'Acordes gerados a partir de uma escala.', 10, 1),
      ($1, 'Graus Harmônicos', 'Numeração', 'I, ii, iii, IV, V, vi, vii°.', 10, 2),
      ($1, 'Campo Harmônico Maior', 'Regra geral', 'A estrutura fixa dos acordes maiores.', 10, 3),
      ($1, 'Funções Harmônicas', 'Tensão e repouso', 'Tônica, Subdominante e Dominante.', 10, 4),
      ($1, 'Progressões Harmônicas', 'Sequências', 'Como combinar os acordes.', 50, 5),
      ($1, 'Avaliação Final', 'Teste seu dominio', 'Teste seus conhecimentos.', 100, 6)
    `, [module6Id]);

    const lessonsMod6Res = await client.query(`SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`, [module6Id]);
    const lessonMod6_3Id = lessonsMod6Res.rows.find(l => l.sort_order === 3).id;

    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'harmonic_field_builder', 'Monte o campo harmônico de C', $2, 20, 1)
    `, [lessonMod6_3Id, JSON.stringify({ key: 'C', answer: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'] })]);

    // --- MODULO 7: APLICAÇÃO MUSICAL ---
    console.log('Inserindo Módulo 7...');
    const module7Res = await client.query(`
      INSERT INTO modules (course_id, title, description, sort_order) 
      VALUES ($1, 'Aplicação Musical', 'Aplicar teoria em músicas reais.', 7)
      RETURNING id
    `, [courseId]);
    const module7Id = module7Res.rows[0].id;

    await client.query(`
      INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order) VALUES 
      ($1, 'Analisando uma música', 'Visão geral', 'Como desconstruir uma música.', 10, 1),
      ($1, 'Encontrando o Tom', 'Qual a chave?', 'Descobrindo o centro tonal.', 10, 2),
      ($1, 'Identificando Escalas', 'Qual usar?', 'Encontrando a escala correta.', 10, 3),
      ($1, 'Identificando Acordes', 'Harmonia', 'Mapeando os acordes usados.', 10, 4),
      ($1, 'Montando Progressões', 'Prática', 'Criando suas próprias sequências.', 50, 5),
      ($1, 'Criando acompanhamentos', 'Tocando junto', 'Como acompanhar uma melodia.', 50, 6),
      ($1, 'Avaliação Final', 'Teste seu dominio', 'Teste seus conhecimentos.', 100, 7)
    `, [module7Id]);

    // --- MODULO 8: TREINO AUDITIVO ---
    console.log('Inserindo Módulo 8...');
    const module8Res = await client.query(`
      INSERT INTO modules (course_id, title, description, sort_order) 
      VALUES ($1, 'Treino Auditivo', 'Desenvolver percepção musical.', 8)
      RETURNING id
    `, [courseId]);
    const module8Id = module8Res.rows[0].id;

    await client.query(`
      INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order) VALUES 
      ($1, 'Reconhecimento de Notas', 'Ouvido absoluto e relativo', 'Treinando a percepção de notas.', 50, 1),
      ($1, 'Reconhecimento de Intervalos', 'Distâncias', 'Ouvindo intervalos.', 50, 2),
      ($1, 'Reconhecimento de Escalas', 'Cores musicais', 'Maior x Menor.', 50, 3),
      ($1, 'Reconhecimento de Acordes', 'Tríades', 'Ouvindo tríades.', 50, 4),
      ($1, 'Reconhecimento de Progressões', 'Sequências', 'Ouvindo o movimento harmônico.', 50, 5),
      ($1, 'Avaliação Final', 'Teste seu dominio', 'A prova final da jornada.', 100, 6)
    `, [module8Id]);

    const lessonsMod8Res = await client.query(`SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`, [module8Id]);
    const lessonMod8_1Id = lessonsMod8Res.rows.find(l => l.sort_order === 1).id;

    await client.query(`
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, 'audio_recognition', 'Qual nota está tocando?', $2, 20, 1)
    `, [lessonMod8_1Id, JSON.stringify({ audio: 'note_C4.mp3', options: ['C', 'D', 'E', 'F'], correctAnswer: 'C' })]);

    await client.query('COMMIT');
    console.log('Seed completo com sucesso! Todos os 8 Módulos gerados.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro durante o seed:', error);
  } finally {
    client.release();
  }
}

seed().then(() => pool.end());
