import type { PoolClient } from 'pg';
import { pool } from './pool.js';

type SeedLesson = {
  title: string;
  description: string;
  content: string;
  xpReward: number;
  sortOrder: number;
};

type SeedExercise = {
  lessonOrder: number;
  type: string;
  prompt: string;
  payload: Record<string, unknown>;
};

function lessonContent(sections: Record<string, string | string[]>) {
  return Object.entries(sections)
    .map(([title, value]) => {
      const body = Array.isArray(value)
        ? value.map((item) => `- ${item}`).join('\n')
        : value;

      return `## ${title}\n${body}`;
    })
    .join('\n\n');
}

async function upsertAchievement(
  client: PoolClient,
  code: string,
  title: string,
  description: string,
  xpReward: number,
) {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM achievements WHERE code = $1',
    [code],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    await client.query(
      'UPDATE achievements SET title = $1, description = $2, xp_reward = $3 WHERE code = $4',
      [title, description, xpReward, code],
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `
      INSERT INTO achievements (id, code, title, description, xp_reward)
      VALUES (gen_random_uuid(), $1, $2, $3, $4)
      RETURNING id
    `,
    [code, title, description, xpReward],
  );

  return inserted.rows[0].id;
}

async function upsertCourse(
  client: PoolClient,
  title: string,
  description: string,
  sortOrder: number,
) {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM courses WHERE sort_order = $1 ORDER BY created_at ASC LIMIT 1',
    [sortOrder],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    await client.query(
      'UPDATE courses SET title = $1, description = $2 WHERE id = $3',
      [title, description, existing.rows[0].id],
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `
      INSERT INTO courses (title, description, sort_order)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [title, description, sortOrder],
  );

  return inserted.rows[0].id;
}

async function upsertModule(
  client: PoolClient,
  courseId: string,
  title: string,
  description: string,
  sortOrder: number,
) {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM modules WHERE course_id = $1 AND sort_order = $2 LIMIT 1',
    [courseId, sortOrder],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    await client.query(
      'UPDATE modules SET title = $1, description = $2 WHERE id = $3',
      [title, description, existing.rows[0].id],
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `
      INSERT INTO modules (course_id, title, description, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [courseId, title, description, sortOrder],
  );

  return inserted.rows[0].id;
}

async function upsertLesson(
  client: PoolClient,
  moduleId: string,
  lesson: SeedLesson,
) {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM lessons WHERE module_id = $1 AND sort_order = $2 LIMIT 1',
    [moduleId, lesson.sortOrder],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    await client.query(
      `
        UPDATE lessons
        SET title = $1, description = $2, content = $3, xp_reward = $4
        WHERE id = $5
      `,
      [lesson.title, lesson.description, lesson.content, lesson.xpReward, existing.rows[0].id],
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `
      INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [moduleId, lesson.title, lesson.description, lesson.content, lesson.xpReward, lesson.sortOrder],
  );

  return inserted.rows[0].id;
}

async function upsertExercise(
  client: PoolClient,
  lessonId: string,
  exercise: Omit<SeedExercise, 'lessonOrder'>,
  sortOrder: number,
) {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM exercises WHERE lesson_id = $1 AND sort_order = $2 LIMIT 1',
    [lessonId, sortOrder],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    await client.query(
      `
        UPDATE exercises
        SET type = $1, prompt = $2, payload = $3, xp_reward = 20
        WHERE id = $4
      `,
      [exercise.type, exercise.prompt, JSON.stringify(exercise.payload), existing.rows[0].id],
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, $2, $3, $4, 20, $5)
      RETURNING id
    `,
    [lessonId, exercise.type, exercise.prompt, JSON.stringify(exercise.payload), sortOrder],
  );

  return inserted.rows[0].id;
}

async function syncModuleExercises(
  client: PoolClient,
  moduleId: string,
  lessonIdByOrder: Map<number, string>,
  exercises: SeedExercise[],
) {
  const allowedSortOrdersByLessonId = new Map<string, number[]>();

  for (const [index, exercise] of exercises.entries()) {
    const lessonId = lessonIdByOrder.get(exercise.lessonOrder);
    if (!lessonId) {
      throw new Error(`Licao do modulo nao encontrada: ${exercise.lessonOrder}`);
    }

    const sortOrder = index + 1;
    await upsertExercise(client, lessonId, exercise, sortOrder);
    const allowedSortOrders = allowedSortOrdersByLessonId.get(lessonId) ?? [];
    allowedSortOrders.push(sortOrder);
    allowedSortOrdersByLessonId.set(lessonId, allowedSortOrders);
  }

  for (const lessonId of lessonIdByOrder.values()) {
    const allowedSortOrders = allowedSortOrdersByLessonId.get(lessonId) ?? [];
    await client.query(
      `
        DELETE FROM exercises
        WHERE lesson_id = $1
          AND NOT (sort_order = ANY($2::int[]))
      `,
      [lessonId, allowedSortOrders],
    );
  }

  await client.query(
    `
      DELETE FROM exercises
      WHERE lesson_id IN (SELECT id FROM lessons WHERE module_id = $1)
        AND lesson_id <> ALL($2::uuid[])
    `,
    [moduleId, [...lessonIdByOrder.values()]],
  );
}

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Atualizando conquistas base...');
    await upsertAchievement(client, 'first_lesson', 'Primeiro som', 'Concluiu a primeira licao.', 10);
    await upsertAchievement(client, 'cipher_reader', 'Leitor de cifras', 'Acertou notas em cifra americana.', 20);
    await upsertAchievement(client, 'scale_builder', 'Construtor de escalas', 'Montou a primeira escala maior.', 30);

    console.log('Atualizando Curso...');
    const courseId = await upsertCourse(
      client,
      'Fundamentos Musicais',
      'Compreensao musical, teoria aplicada e exercicios interativos para iniciantes.',
      1,
    );

    // --- MODULO 1: NOTAS MUSICAIS ---
    console.log('Inserindo Módulo 1...');
    const module1Id = await upsertModule(
      client,
      courseId,
      'Notas Musicais',
      'O alfabeto da musica, cifras americanas e acidentes.',
      1,
    );

    console.log('Inserindo Aulas do Módulo 1...');
    const module1Lessons: SeedLesson[] = [
      {
        title: 'O que e uma nota musical',
        description: 'Entenda a menor ideia musical que conseguimos nomear.',
        content: lessonContent({
          Objetivo: 'Ao final desta aula voce deve conseguir explicar, com suas palavras, que uma nota e um som com nome e lugar dentro da musica.',
          Conceito: 'Uma nota musical e como um ponto de referencia sonoro. Quando damos nome a um som, conseguimos lembrar dele, comparar com outros sons e combina-lo para criar melodias, escalas e acordes.',
          Analogia: 'Pense em uma nota como uma cor. Uma cor sozinha ja tem identidade. Quando combinamos varias cores, criamos desenhos. Na musica, combinamos notas para criar frases, climas e movimentos.',
          'Exemplo visual': ['Dó, Ré, Mi, Fá, Sol, Lá e Si sao os nomes naturais mais usados no Brasil.', 'C, D, E, F, G, A e B sao os nomes por letras usados em cifras.', 'A mesma nota pode aparecer em alturas diferentes, como uma voz grave e uma voz aguda cantando Dó.'],
          'Exercicio guiado': 'Leia em voz alta: Dó, Ré, Mi, Fá, Sol, Lá, Si. Agora leia de tras para frente. A ideia nao e decorar perfeitamente ainda, e sim perceber que existe uma ordem.',
          Desafio: 'Escolha uma musica que voce conhece e tente cantar uma unica silaba parada. Esse som parado pode ser pensado como uma nota.',
          Resumo: ['Notas sao nomes para sons musicais.', 'Elas ajudam a organizar o que ouvimos.', 'A plataforma vai usar notas antes de instrumento para construir compreensao.', 'Toda escala e todo acorde nasce de notas.'],
        }),
        xpReward: 10,
        sortOrder: 1,
      },
      {
        title: 'As 7 notas naturais',
        description: 'A sequencia Do Re Mi Fa Sol La Si.',
        content: lessonContent({
          Objetivo: 'Reconhecer a ordem das 7 notas naturais e entender que ela se repete em ciclos.',
          Conceito: 'As notas naturais sao Dó, Ré, Mi, Fá, Sol, Lá e Si. Depois de Si, a sequencia volta para Dó, so que em uma regiao mais aguda.',
          Analogia: 'E parecido com os dias da semana. Depois de domingo, volta segunda. Na musica, depois de Si, volta Dó.',
          'Exemplo visual': ['Dó -> Ré -> Mi -> Fá -> Sol -> Lá -> Si -> Dó', 'Subindo significa caminhar para sons mais agudos.', 'Descendo significa caminhar para sons mais graves.'],
          'Exercicio guiado': 'Complete mentalmente: Dó, Ré, Mi, __. A resposta e Fá. Agora tente: Sol, Lá, __. A resposta e Si.',
          Desafio: 'Fale a sequencia completa sem olhar. Depois fale de tras para frente: Si, Lá, Sol, Fá, Mi, Ré, Dó.',
          Resumo: ['Existem 7 notas naturais.', 'A ordem se repete em ciclos.', 'Saber a ordem ajuda em escalas, intervalos e acordes.', 'Nao pule esta base: ela economiza muito esforco depois.'],
        }),
        xpReward: 10,
        sortOrder: 2,
      },
      {
        title: 'Notacao Americana',
        description: 'A linguagem global das cifras.',
        content: lessonContent({
          Objetivo: 'Converter rapidamente notas brasileiras para letras usadas em cifras.',
          Conceito: 'Em cifras, as notas sao escritas com letras: C=Dó, D=Ré, E=Mi, F=Fá, G=Sol, A=Lá, B=Si.',
          Analogia: 'E como aprender que uma mesma cidade pode ter apelido. Dó e o nome que falamos; C e o nome usado em mapas de cifras, apps e materiais internacionais.',
          'Exemplo visual': ['Dó = C', 'Ré = D', 'Mi = E', 'Fá = F', 'Sol = G', 'Lá = A', 'Si = B'],
          'Exercicio guiado': 'Quando voce vir G em uma cifra, leia Sol. Quando vir A, leia Lá. Quando vir C, leia Dó.',
          Desafio: 'Traduza esta sequencia: C G A F. Resposta esperada: Dó, Sol, Lá, Fá.',
          Resumo: ['Cifra americana usa letras.', 'C nao e a primeira letra musical por acaso: ela representa Dó.', 'Ler letras prepara voce para acordes como C, G, Am e F.', 'Este e um dos conhecimentos mais usados por iniciantes.'],
        }),
        xpReward: 10,
        sortOrder: 3,
      },
      {
        title: 'Sustenidos (#)',
        description: 'Como subir uma nota em meio tom.',
        content: lessonContent({
          Objetivo: 'Entender que o sustenido aproxima uma nota da proxima nota, subindo meio tom.',
          Conceito: 'O simbolo # significa sustenido. Ele aumenta a nota em meio tom. C# e um som um pouco acima de C e antes de D.',
          Analogia: 'Imagine uma escada com degraus pequenos entre algumas notas. O sustenido e dar um pequeno passo para cima.',
          'Exemplo visual': ['C -> C# -> D', 'F -> F# -> G', 'G -> G# -> A'],
          'Exercicio guiado': 'Se C# vem logo depois de C, entao F# vem logo depois de F. O nome da nota continua, mas recebe o #.',
          Desafio: 'Qual e o sustenido de G? Resposta: G#.',
          Resumo: ['# sobe meio tom.', 'C# fica entre C e D.', 'Sustenidos aparecem muito em escalas maiores.', 'Nao confunda subir com tocar mais forte: aqui falamos de altura sonora.'],
        }),
        xpReward: 10,
        sortOrder: 4,
      },
      {
        title: 'Bemois (b)',
        description: 'Como descer uma nota em meio tom.',
        content: lessonContent({
          Objetivo: 'Entender que o bemol abaixa uma nota em meio tom.',
          Conceito: 'O simbolo b significa bemol. Ele diminui a nota em meio tom. Db e um som um pouco abaixo de D e antes de C.',
          Analogia: 'Se sustenido e um pequeno passo para cima, bemol e um pequeno passo para baixo.',
          'Exemplo visual': ['D -> Db -> C', 'G -> Gb -> F', 'A -> Ab -> G'],
          'Exercicio guiado': 'Se Db e D descendo meio tom, entao Eb e E descendo meio tom.',
          Desafio: 'Qual e o bemol de B? Resposta: Bb.',
          Resumo: ['b desce meio tom.', 'Db fica entre C e D.', 'Bemois aparecem em cifras e tonalidades.', 'Sustenido e bemol descrevem direcoes opostas.'],
        }),
        xpReward: 10,
        sortOrder: 5,
      },
      {
        title: 'Enarmonia',
        description: 'Nomes diferentes para o mesmo som.',
        content: lessonContent({
          Objetivo: 'Perceber que algumas notas possuem dois nomes corretos dependendo do contexto.',
          Conceito: 'Enarmonia acontece quando dois nomes apontam para o mesmo som. C# e Db sao o exemplo mais comum: um nome olha a nota subindo, o outro olha descendo.',
          Analogia: 'E como chamar uma pessoa pelo nome ou pelo apelido. O nome muda, mas a pessoa e a mesma.',
          'Exemplo visual': ['C# = Db', 'D# = Eb', 'F# = Gb', 'G# = Ab', 'A# = Bb'],
          'Exercicio guiado': 'Se C# esta entre C e D, Db tambem esta entre C e D. Por isso eles podem representar o mesmo som.',
          Desafio: 'Qual e o outro nome de F#? Resposta: Gb.',
          Resumo: ['Enarmonia e mesmo som com nomes diferentes.', 'O contexto musical decide o melhor nome.', 'Esta ideia evita confusao quando aparecerem escalas com sustenidos ou bemois.', 'No inicio, memorize pares comuns como C#/Db e F#/Gb.'],
        }),
        xpReward: 10,
        sortOrder: 6,
      },
      {
        title: 'Localizando notas',
        description: 'Encontrando os sons antes de tocar.',
        content: lessonContent({
          Objetivo: 'Criar um mapa mental das notas para preparar o uso de instrumentos virtuais e reais.',
          Conceito: 'Localizar notas significa saber onde elas aparecem em uma sequencia musical. Antes de decorar um instrumento, voce aprende a enxergar caminhos entre notas.',
          Analogia: 'Antes de dirigir por uma cidade, ajuda conhecer o mapa. Na musica, as notas sao pontos desse mapa.',
          'Exemplo visual': ['C fica antes de D.', 'E fica antes de F.', 'B volta para C no novo ciclo.'],
          'Exercicio guiado': 'Comece em C e avance: C, D, E, F. Agora comece em G e avance: G, A, B, C.',
          Desafio: 'Sem olhar, diga qual nota vem depois de B. Resposta: C.',
          Resumo: ['Notas se repetem em ciclos.', 'Localizar e mais importante que decorar isoladamente.', 'Esse mapa sera usado em escalas e acordes.', 'O objetivo e velocidade com compreensao.'],
        }),
        xpReward: 10,
        sortOrder: 7,
      },
      {
        title: 'Desafio de notas',
        description: 'Teste seus reflexos musicais.',
        content: lessonContent({
          Objetivo: 'Responder notas naturais, letras e acidentes com menos hesitacao.',
          Conceito: 'A fluencia vem de repeticao curta e variada. Neste desafio, voce alterna entre nomes brasileiros, letras e acidentes.',
          Analogia: 'E como treinar tabuada: primeiro voce entende, depois pratica ate responder sem travar.',
          'Exercicio guiado': 'Leia C e diga Dó. Leia Sol e diga G. Leia C# e pense: C subiu meio tom.',
          Desafio: 'Tente acertar todas as perguntas da pratica sem consultar a tabela.',
          Resumo: ['Rapidez ajuda, mas precisao vem primeiro.', 'Use erros como pistas do que revisar.', 'Notas, letras e acidentes formam a base da leitura musical.'],
        }),
        xpReward: 50,
        sortOrder: 8,
      },
      {
        title: 'Avaliacao do Modulo 1',
        description: 'Mostre que domina o alfabeto musical.',
        content: lessonContent({
          Objetivo: 'Validar se voce consegue reconhecer notas naturais, cifras, sustenidos, bemois e enarmonias.',
          Conceito: 'A avaliacao mistura os conceitos do modulo para confirmar se eles funcionam juntos.',
          'Antes de comecar': ['Revise a ordem: Dó, Ré, Mi, Fá, Sol, Lá, Si.', 'Revise a cifra: C, D, E, F, G, A, B.', 'Lembre: # sobe meio tom e b desce meio tom.'],
          Desafio: 'Passe pela avaliacao com pelo menos 80% de acerto para seguir para ritmo.',
          Resumo: ['Este modulo ensina o alfabeto da musica.', 'Sem notas, escalas e acordes viram decoreba.', 'Com notas claras, o resto da jornada fica mais leve.'],
        }),
        xpReward: 100,
        sortOrder: 9,
      },
    ];

    for (const lesson of module1Lessons) {
      await upsertLesson(client, module1Id, lesson);
    }

    const lessonsMod1Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module1Id],
    );
    const lessonIdByOrder = new Map(lessonsMod1Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));

    const module1Exercises: SeedExercise[] = [
      {
        lessonOrder: 1,
        type: 'multiple_choice',
        prompt: 'O que e uma nota musical?',
        payload: {
          options: ['Um som com nome musical', 'Um tipo de instrumento', 'Uma velocidade de musica', 'Uma batida forte'],
          correctAnswer: 'Um som com nome musical',
          feedback: 'Uma nota e um som que conseguimos nomear e usar como referencia. Instrumentos, batidas e velocidades aparecem depois; a nota e a unidade sonora nomeada.',
        },
      },
      {
        lessonOrder: 1,
        type: 'fill_blank',
        prompt: 'Uma nota ajuda a dar _____ para um som.',
        payload: {
          sentence: 'Uma nota ajuda a dar _____ para um som.',
          answer: 'nome',
          feedback: 'Dar nome ao som permite comparar, lembrar e combinar esse som com outros. Por isso notas sao a base da linguagem musical.',
        },
      },
      {
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'Qual nota vem depois de Mi?',
        payload: {
          options: ['Ré', 'Fá', 'Sol', 'Si'],
          correctAnswer: 'Fá',
          feedback: 'A ordem natural e Do, Re, Mi, Fa, Sol, La, Si. Depois de Mi vem Fa.',
        },
      },
      {
        lessonOrder: 2,
        type: 'fill_blank',
        prompt: 'Depois de Si, a sequencia volta para _____.',
        payload: {
          sentence: 'Depois de Si, a sequencia volta para _____.',
          answer: 'Do',
          feedback: 'As notas funcionam em ciclo. Depois de Si, voltamos para Do em uma regiao mais aguda.',
        },
      },
      {
        lessonOrder: 3,
        type: 'multiple_choice',
        prompt: 'Qual nota corresponde a letra G?',
        payload: {
          options: ['Do', 'Sol', 'La', 'Mi'],
          correctAnswer: 'Sol',
          feedback: 'Na cifra americana, G representa Sol. Esse mapeamento aparece o tempo todo em cifras de musicas.',
        },
      },
      {
        lessonOrder: 3,
        type: 'fill_blank',
        prompt: 'A nota americana para Do e _____.',
        payload: {
          sentence: 'A nota americana para Do e _____.',
          answer: 'C',
          feedback: 'Dó e C sao dois nomes para a mesma nota: um em portugues musical, outro em cifra americana.',
        },
      },
      {
        lessonOrder: 3,
        type: 'multiple_choice',
        prompt: 'Qual letra representa a nota La?',
        payload: {
          options: ['A', 'B', 'F', 'G'],
          correctAnswer: 'A',
          feedback: 'La e A na notacao americana. Guardar A=La ajuda muito quando aparecem acordes como Am e A7.',
        },
      },
      {
        lessonOrder: 4,
        type: 'multiple_choice',
        prompt: 'Qual e o sustenido de C?',
        payload: {
          options: ['C#', 'D#', 'Cb', 'Db'],
          correctAnswer: 'C#',
          feedback: 'O sustenido mantem o nome da nota e adiciona # para indicar meio tom acima. C subindo meio tom vira C#.',
        },
      },
      {
        lessonOrder: 4,
        type: 'fill_blank',
        prompt: 'O simbolo # sobe a nota em meio _____.',
        payload: {
          sentence: 'O simbolo # sobe a nota em meio _____.',
          answer: 'tom',
          feedback: 'O # sobe meio tom. Ele nao significa tocar mais forte; significa mudar a altura da nota.',
        },
      },
      {
        lessonOrder: 5,
        type: 'multiple_choice',
        prompt: 'Qual opcao mostra D descendo meio tom?',
        payload: {
          options: ['D#', 'Db', 'E', 'F'],
          correctAnswer: 'Db',
          feedback: 'Bemol desce meio tom. D descendo meio tom vira Db.',
        },
      },
      {
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Qual par representa enarmonia?',
        payload: {
          options: ['C e D', 'C# e Db', 'E e G', 'A e B'],
          correctAnswer: 'C# e Db',
          feedback: 'C# e Db podem representar o mesmo som: C subindo meio tom ou D descendo meio tom.',
        },
      },
      {
        lessonOrder: 7,
        type: 'multiple_choice',
        prompt: 'Qual nota vem depois de B na notacao americana?',
        payload: {
          options: ['A', 'C', 'D', 'G'],
          correctAnswer: 'C',
          feedback: 'A sequencia americana tambem e circular: A, B, C, D, E, F, G e volta. Depois de B vem C.',
        },
      },
      {
        lessonOrder: 8,
        type: 'multiple_choice',
        prompt: 'Traduza C G A F para nomes brasileiros.',
        payload: {
          options: ['Do Sol La Fa', 'Re Sol Si Fa', 'Do Fa La Mi', 'Mi Sol La Fa'],
          correctAnswer: 'Do Sol La Fa',
          feedback: 'C=Do, G=Sol, A=La e F=Fa. Essa leitura direta prepara voce para cifras reais.',
        },
      },
      {
        lessonOrder: 9,
        type: 'multiple_choice',
        prompt: 'Qual afirmacao esta correta?',
        payload: {
          options: ['# desce meio tom', 'b sobe meio tom', 'C representa Do', 'G representa Mi'],
          correctAnswer: 'C representa Do',
          feedback: 'C representa Do. Lembre tambem: # sobe meio tom e b desce meio tom.',
        },
      },
    ];

    await syncModuleExercises(client, module1Id, lessonIdByOrder, module1Exercises);

    // --- MODULO 2: RITMO ---
    console.log('Inserindo Módulo 2...');
    const module2Id = await upsertModule(
      client,
      courseId,
      'Ritmo',
      'Pulsação, tempo, compasso e divisões rítmicas.',
      2,
    );

    console.log('Inserindo Aulas do Módulo 2...');
    const module2Lessons: SeedLesson[] = [
      {
        title: 'O que e ritmo',
        description: 'Perceba como a musica se organiza no tempo.',
        content: lessonContent({
          Objetivo: 'Entender que ritmo e a organizacao dos sons e silencios dentro do tempo.',
          Conceito: 'Ritmo nao e apenas bater palmas. Ritmo e decidir quando um som acontece, quanto ele dura e onde existe silencio.',
          Analogia: 'Pense em uma frase falada. Se voce muda as pausas e acentos, a frase ganha outro jeito. Na musica, o ritmo faz esse papel.',
          'Exemplo visual': ['TA - pausa - TA - TA', 'Som - silencio - som - som', 'O mesmo conjunto de notas pode soar diferente quando o ritmo muda.'],
          'Exercicio guiado': 'Bata palmas dizendo: TA, pausa, TA, TA. Depois repita mais devagar. Voce manteve o mesmo ritmo em outra velocidade.',
          Desafio: 'Escolha uma musica conhecida e tente bater palmas junto apenas no pulso principal.',
          Resumo: ['Ritmo organiza o som no tempo.', 'Silencio tambem faz parte do ritmo.', 'Ritmo muda a sensacao da musica mesmo com as mesmas notas.', 'Antes de tocar rapido, aprenda a tocar no momento certo.'],
        }),
        xpReward: 10,
        sortOrder: 1,
      },
      {
        title: 'Pulsacao',
        description: 'O batimento constante por baixo da musica.',
        content: lessonContent({
          Objetivo: 'Identificar a batida regular que sustenta uma musica.',
          Conceito: 'Pulsacao e o pulso constante da musica. Mesmo quando a melodia muda, existe uma sensacao de batida regular por baixo.',
          Analogia: 'E como caminhar: seus passos mantem uma base regular enquanto seus bracos e corpo se movimentam de outras formas.',
          'Exemplo visual': ['1 - 2 - 3 - 4', 'clique - clique - clique - clique', 'A pulsacao pode ser lenta, media ou rapida.'],
          'Exercicio guiado': 'Conte 1, 2, 3, 4 em voz alta e bata uma palma em cada numero.',
          Desafio: 'Use qualquer musica e tente contar 1, 2, 3, 4 junto com ela por 30 segundos.',
          Resumo: ['Pulsacao e a base regular.', 'Ela ajuda o aluno a nao se perder.', 'Ritmos podem variar em cima da pulsacao.', 'Ouvir o pulso e uma habilidade essencial.'],
        }),
        xpReward: 10,
        sortOrder: 2,
      },
      {
        title: 'Tempo e BPM',
        description: 'A velocidade da pulsacao.',
        content: lessonContent({
          Objetivo: 'Entender BPM como medida de velocidade musical.',
          Conceito: 'BPM significa batidas por minuto. Um BPM 60 tem 60 batidas em um minuto; BPM 120 tem o dobro de batidas no mesmo tempo.',
          Analogia: 'E como velocidade no transito. A estrada pode ser a mesma, mas dirigir a 60 km/h e diferente de dirigir a 120 km/h.',
          'Exemplo visual': ['60 BPM = uma batida por segundo', '120 BPM = duas batidas por segundo', 'Quanto maior o BPM, mais rapido o pulso.'],
          'Exercicio guiado': 'Conte 1, 2, 3, 4 bem devagar. Agora conte duas vezes mais rapido sem mudar a ordem.',
          Desafio: 'Compare mentalmente uma balada lenta com uma musica de danca. A diferenca principal costuma estar no BPM.',
          Resumo: ['BPM mede velocidade.', 'Mais BPM significa pulso mais rapido.', 'Menos BPM significa pulso mais lento.', 'BPM nao muda as notas, muda a sensacao de movimento.'],
        }),
        xpReward: 10,
        sortOrder: 3,
      },
      {
        title: 'Compasso',
        description: 'Agrupando pulsos para a musica fazer sentido.',
        content: lessonContent({
          Objetivo: 'Entender que compassos agrupam pulsos em ciclos repetidos.',
          Conceito: 'Compasso organiza a pulsacao em grupos. Em 4/4, sentimos grupos de quatro tempos: 1, 2, 3, 4; depois volta para 1.',
          Analogia: 'E como organizar palavras em frases. Sem agrupamento, tudo fica solto. Com compasso, a musica ganha blocos reconheciveis.',
          'Exemplo visual': ['4/4: 1 2 3 4 | 1 2 3 4', '3/4: 1 2 3 | 1 2 3', '2/4: 1 2 | 1 2'],
          'Exercicio guiado': 'Conte 1, 2, 3, 4 e bata mais forte no 1. Isso ajuda a sentir o inicio do compasso.',
          Desafio: 'Tente ouvir uma musica e perceber onde o ciclo volta para o 1.',
          Resumo: ['Compasso agrupa pulsos.', '4/4 e um dos compassos mais comuns.', 'O tempo 1 costuma parecer ponto de chegada.', 'Contar compassos prepara para tocar com outras pessoas.'],
        }),
        xpReward: 10,
        sortOrder: 4,
      },
      {
        title: 'Semibreve',
        description: 'Uma nota longa de quatro tempos.',
        content: lessonContent({
          Objetivo: 'Reconhecer a semibreve como duracao longa em 4/4.',
          Conceito: 'A semibreve ocupa quatro tempos em um compasso 4/4. Ela e sustentada enquanto voce conta 1, 2, 3, 4.',
          Analogia: 'E como segurar uma vogal longa: aaaaa. O som continua enquanto o tempo passa.',
          'Exemplo visual': ['Semibreve: TA---', 'Conta: 1 2 3 4', 'Toque no 1 e sustente ate o fim do 4.'],
          'Exercicio guiado': 'Bata uma palma no 1 e mantenha a mao parada enquanto conta 2, 3, 4.',
          Desafio: 'Imagine uma nota que preenche o compasso inteiro sem repetir.',
          Resumo: ['Semibreve dura quatro tempos em 4/4.', 'Ela e longa e sustentada.', 'Ajuda a sentir espaco dentro do compasso.'],
        }),
        xpReward: 10,
        sortOrder: 5,
      },
      {
        title: 'Minima',
        description: 'Uma nota de dois tempos.',
        content: lessonContent({
          Objetivo: 'Entender a minima como metade da semibreve.',
          Conceito: 'A minima dura dois tempos. Em um compasso 4/4 cabem duas minimas: uma nos tempos 1-2 e outra nos tempos 3-4.',
          Analogia: 'Se a semibreve e uma barra inteira de chocolate, a minima e meia barra.',
          'Exemplo visual': ['Minimas: TA-- TA--', 'Conta: 1 2 | 3 4', 'Toque no 1 e no 3.'],
          'Exercicio guiado': 'Conte 1, 2, 3, 4. Bata palma no 1 e no 3.',
          Desafio: 'Mantenha a contagem regular sem acelerar entre as palmas.',
          Resumo: ['Minima dura dois tempos.', 'Duas minimas preenchem um compasso 4/4.', 'Ela cria movimento mais frequente que a semibreve.'],
        }),
        xpReward: 10,
        sortOrder: 6,
      },
      {
        title: 'Seminima',
        description: 'A batida de um tempo.',
        content: lessonContent({
          Objetivo: 'Reconhecer a seminima como a duracao basica de um tempo.',
          Conceito: 'A seminima dura um tempo. Em 4/4, quatro seminimas preenchem o compasso: uma em cada tempo.',
          Analogia: 'E como caminhar em passos regulares: passo, passo, passo, passo.',
          'Exemplo visual': ['Seminimas: TA TA TA TA', 'Conta: 1 2 3 4', 'Uma palma por numero.'],
          'Exercicio guiado': 'Conte 1, 2, 3, 4 e bata palma em todos os numeros.',
          Desafio: 'Faça isso em BPM lento e depois mais rapido sem perder a regularidade.',
          Resumo: ['Seminima dura um tempo.', 'Quatro seminimas cabem em 4/4.', 'Ela e a base de muitos exercicios de pulso.'],
        }),
        xpReward: 10,
        sortOrder: 7,
      },
      {
        title: 'Colcheia',
        description: 'Dividindo um tempo em duas partes.',
        content: lessonContent({
          Objetivo: 'Entender que colcheias dividem cada tempo em duas partes iguais.',
          Conceito: 'A colcheia dura meio tempo. Para contar, usamos 1 e 2 e 3 e 4 e. Cada numero e cada "e" recebe uma batida menor.',
          Analogia: 'Se a seminima e um passo, a colcheia e dividir esse passo em dois movimentos menores.',
          'Exemplo visual': ['Colcheias: TA ta TA ta TA ta TA ta', 'Conta: 1 e 2 e 3 e 4 e', 'Duas colcheias equivalem a uma seminima.'],
          'Exercicio guiado': 'Conte 1 e 2 e 3 e 4 e batendo palmas em todos os sons.',
          Desafio: 'Alterne: primeiro bata so nos numeros, depois nos numeros e nos "e".',
          Resumo: ['Colcheia dura meio tempo.', 'Duas colcheias formam uma seminima.', 'Ela aumenta a sensacao de movimento.'],
        }),
        xpReward: 10,
        sortOrder: 8,
      },
      {
        title: 'Semicolcheia',
        description: 'Dividindo o tempo em quatro partes.',
        content: lessonContent({
          Objetivo: 'Conhecer a semicolcheia como subdivisao rapida do tempo.',
          Conceito: 'A semicolcheia dura um quarto de tempo. Quatro semicolcheias ocupam o mesmo espaco de uma seminima.',
          Analogia: 'E como trocar um passo por quatro passinhos pequenos dentro do mesmo espaco.',
          'Exemplo visual': ['Semicolcheias: ta-ka-di-mi', 'Quatro partes por tempo', '1 e a e 2 e a e 3 e a e 4 e a e'],
          'Exercicio guiado': 'Diga devagar: ta-ka-di-mi. Depois encaixe esse grupo dentro de cada numero da contagem.',
          Desafio: 'Nao tente velocidade primeiro. Tente divisao igual.',
          Resumo: ['Semicolcheia dura um quarto de tempo.', 'Quatro semicolcheias equivalem a uma seminima.', 'Ela exige controle e regularidade.'],
        }),
        xpReward: 10,
        sortOrder: 9,
      },
      {
        title: 'Metronomo',
        description: 'Treinando com um pulso confiavel.',
        content: lessonContent({
          Objetivo: 'Usar o metronomo como referencia de tempo, nao como inimigo.',
          Conceito: 'Metronomo e uma ferramenta que emite cliques em BPM constante. Ele revela se voce esta acelerando ou atrasando.',
          Analogia: 'E como uma regua para medir desenho. A regua nao desenha por voce, mas mostra se a linha esta reta.',
          'Exemplo visual': ['Clique em 60 BPM: lento e espacoso', 'Clique em 100 BPM: moderado', 'Clique em 140 BPM: rapido'],
          'Exercicio guiado': 'Imagine quatro cliques: 1, 2, 3, 4. Bata palma junto com cada clique.',
          Desafio: 'Tente ficar junto do clique, nao antes e nao depois.',
          Resumo: ['Metronomo mede constancia.', 'Ele ajuda a perceber pressa e atraso.', 'Treinar lento costuma melhorar mais que tentar rapido.'],
        }),
        xpReward: 10,
        sortOrder: 10,
      },
      {
        title: 'Exercicios ritmicos',
        description: 'Pratica de timing com padroes simples.',
        content: lessonContent({
          Objetivo: 'Praticar padroes de ritmo seguindo uma grade visual.',
          Conceito: 'Nos exercicios, cada ponto da grade representa uma subdivisao. Os pontos altos indicam onde voce deve tocar.',
          Analogia: 'E como seguir uma receita: alguns passos pedem acao, outros pedem espera.',
          'Exercicio guiado': 'No padrao de seminima, toque nos tempos 1, 2, 3 e 4. Nos espacos entre eles, apenas espere.',
          Desafio: 'Complete os padroes mantendo a pulsacao constante ate o fim.',
          Resumo: ['Tocar no tempo certo importa mais que tocar muito.', 'Esperar tambem e parte do ritmo.', 'Padroes pequenos criam controle para musicas reais.'],
        }),
        xpReward: 50,
        sortOrder: 11,
      },
      {
        title: 'Avaliacao do Modulo 2',
        description: 'Mostre que consegue sentir e manter o tempo.',
        content: lessonContent({
          Objetivo: 'Validar pulso, BPM, compasso e figuras ritmicas basicas.',
          Conceito: 'A avaliacao mistura reconhecimento teorico e pratica de tap para confirmar se voce entende e executa ritmos simples.',
          'Antes de comecar': ['Pulsacao e a batida regular.', 'BPM mede velocidade.', '4/4 agrupa quatro tempos.', 'Semibreve=4, minima=2, seminima=1, colcheia=1/2.'],
          Desafio: 'Passe pelos exercicios sem perder a contagem interna.',
          Resumo: ['Ritmo e organizacao no tempo.', 'O ouvido precisa sentir pulso antes de tocar frases complexas.', 'Este modulo prepara o aluno para escalas com controle temporal.'],
        }),
        xpReward: 100,
        sortOrder: 12,
      },
    ];

    for (const lesson of module2Lessons) {
      await upsertLesson(client, module2Id, lesson);
    }

    const lessonsMod2Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module2Id],
    );
    const lesson2IdByOrder = new Map(lessonsMod2Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));

    const module2Exercises: SeedExercise[] = [
      {
        lessonOrder: 1,
        type: 'multiple_choice',
        prompt: 'O que o ritmo organiza?',
        payload: {
          options: ['Sons e silencios no tempo', 'Somente notas agudas', 'A cor do instrumento', 'A letra da cifra'],
          correctAnswer: 'Sons e silencios no tempo',
          feedback: 'Ritmo organiza quando sons e silencios acontecem. Ele nao depende de instrumento especifico.',
        },
      },
      {
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'O que e pulsacao?',
        payload: {
          options: ['A batida regular da musica', 'Uma nota com sustenido', 'Uma sequencia de acordes', 'Um tipo de escala'],
          correctAnswer: 'A batida regular da musica',
          feedback: 'Pulsacao e o pulso constante que ajuda voce a se localizar dentro da musica.',
        },
      },
      {
        lessonOrder: 3,
        type: 'fill_blank',
        prompt: 'BPM significa batidas por _____.',
        payload: {
          sentence: 'BPM significa batidas por _____.',
          answer: 'minuto',
          feedback: 'BPM mede quantas batidas cabem em um minuto. Mais BPM significa pulso mais rapido.',
        },
      },
      {
        lessonOrder: 4,
        type: 'multiple_choice',
        prompt: 'Em 4/4, contamos normalmente quantos tempos por compasso?',
        payload: {
          options: ['2', '3', '4', '7'],
          correctAnswer: '4',
          feedback: 'Em 4/4, sentimos grupos de quatro tempos: 1, 2, 3, 4.',
        },
      },
      {
        lessonOrder: 5,
        type: 'multiple_choice',
        prompt: 'Em 4/4, uma semibreve dura quantos tempos?',
        payload: {
          options: ['1', '2', '3', '4'],
          correctAnswer: '4',
          feedback: 'A semibreve preenche os quatro tempos de um compasso 4/4.',
        },
      },
      {
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Uma minima dura quantos tempos?',
        payload: {
          options: ['1/2 tempo', '1 tempo', '2 tempos', '4 tempos'],
          correctAnswer: '2 tempos',
          feedback: 'A minima dura dois tempos. Duas minimas completam um compasso 4/4.',
        },
      },
      {
        lessonOrder: 7,
        type: 'rhythm_tap',
        prompt: 'Toque uma seminima em cada tempo',
        payload: {
          bpm: 90,
          pattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
          feedback: 'Este padrao toca nos tempos 1, 2, 3 e 4. Os espacos entre eles sao espera.',
        },
      },
      {
        lessonOrder: 8,
        type: 'multiple_choice',
        prompt: 'Duas colcheias equivalem a qual figura?',
        payload: {
          options: ['Uma seminima', 'Uma semibreve', 'Uma pausa de quatro tempos', 'Um compasso inteiro'],
          correctAnswer: 'Uma seminima',
          feedback: 'Cada colcheia dura meio tempo. Duas colcheias somam um tempo, ou seja, uma seminima.',
        },
      },
      {
        lessonOrder: 9,
        type: 'multiple_choice',
        prompt: 'Quatro semicolcheias ocupam o mesmo espaco de qual figura?',
        payload: {
          options: ['Uma seminima', 'Uma semibreve', 'Duas minimas', 'Um compasso 3/4 inteiro'],
          correctAnswer: 'Uma seminima',
          feedback: 'A semicolcheia divide o tempo em quatro partes. Quatro delas completam uma seminima.',
        },
      },
      {
        lessonOrder: 10,
        type: 'multiple_choice',
        prompt: 'Para que serve o metronomo?',
        payload: {
          options: ['Manter um clique constante', 'Escolher acordes automaticamente', 'Afinar letras de cifra', 'Trocar notas por bemois'],
          correctAnswer: 'Manter um clique constante',
          feedback: 'O metronomo cria uma referencia constante para voce perceber se esta adiantando ou atrasando.',
        },
      },
      {
        lessonOrder: 11,
        type: 'rhythm_tap',
        prompt: 'Toque nos tempos 1 e 3',
        payload: {
          bpm: 80,
          pattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
          feedback: 'Este padrao trabalha minimas: toque no 1, espere o 2, toque no 3 e espere o 4.',
        },
      },
      {
        lessonOrder: 11,
        type: 'rhythm_tap',
        prompt: 'Toque um padrao curto de colcheias',
        payload: {
          bpm: 72,
          pattern: [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
          feedback: 'Este padrao mistura toque e espera. Conte subdivisoes iguais para nao correr.',
        },
      },
      {
        lessonOrder: 12,
        type: 'multiple_choice',
        prompt: 'Qual resumo esta correto?',
        payload: {
          options: ['Ritmo e som no tempo; BPM mede velocidade', 'BPM e nome de nota', 'Compasso elimina a pulsacao', 'Colcheia dura quatro tempos'],
          correctAnswer: 'Ritmo e som no tempo; BPM mede velocidade',
          feedback: 'Ritmo organiza sons e silencios no tempo; BPM define a velocidade da pulsacao.',
        },
      },
    ];

    await syncModuleExercises(client, module2Id, lesson2IdByOrder, module2Exercises);

    // --- MODULO 3: ESCALAS ---
    console.log('Inserindo Módulo 3...');
    const module3Id = await upsertModule(
      client,
      courseId,
      'Escalas',
      'A matemática por trás das melodias e regras T-T-S-T-T-T-S.',
      3,
    );

    console.log('Inserindo Aulas do Módulo 3...');
    const module3Lessons: SeedLesson[] = [
      {
        title: 'O que e uma escala',
        description: 'Entenda a escada de notas que cria tonalidade.',
        content: lessonContent({
          Objetivo: 'Entender escala como uma selecao organizada de notas que cria um centro musical.',
          Conceito: 'Escala e uma sequencia de notas escolhidas por uma regra. Ela funciona como o conjunto de sons que uma musica usa para criar melodia, clima e direcao.',
          Analogia: 'Pense em uma paleta de cores. Se voce escolhe certas cores antes de pintar, o desenho ganha uma identidade. Na musica, a escala e essa paleta.',
          'Exemplo visual': ['C D E F G A B', 'Essa sequencia e a escala maior de C.', 'Quando uma musica esta em C maior, essas notas tendem a soar naturais juntas.'],
          'Exercicio guiado': 'Leia C D E F G A B em voz alta. Agora perceba que nao escolhemos notas aleatorias: seguimos uma ordem.',
          Desafio: 'Tente imaginar uma melodia simples usando apenas essas sete letras.',
          Resumo: ['Escala e uma sequencia organizada de notas.', 'Ela cria uma sensacao de tonalidade.', 'Escalas ajudam a construir melodias e acordes.', 'O segredo e entender a regra, nao decorar listas infinitas.'],
        }),
        xpReward: 10,
        sortOrder: 1,
      },
      {
        title: 'Tom e Semitom',
        description: 'A regua musical para medir distancia.',
        content: lessonContent({
          Objetivo: 'Usar tom e semitom como medidas basicas entre notas.',
          Conceito: 'Semitom e a menor distancia comum entre duas notas vizinhas. Tom equivale a dois semitons.',
          Analogia: 'Imagine uma regua com marcas pequenas. Um semitom e um passo pequeno; um tom e dois passos pequenos.',
          'Exemplo visual': ['C -> C# = 1 semitom', 'C -> D = 1 tom', 'E -> F = 1 semitom natural'],
          'Exercicio guiado': 'Saia de C. Um semitom acima e C#. Dois semitons acima chegam em D.',
          Desafio: 'Qual distancia e maior: C para C# ou C para D? Resposta: C para D.',
          Resumo: ['Semitom e o menor passo comum.', 'Tom = dois semitons.', 'Escalas sao construidas combinando tons e semitons.', 'Esta medida prepara intervalos e acordes.'],
        }),
        xpReward: 10,
        sortOrder: 2,
      },
      {
        title: 'Escala Maior',
        description: 'A formula T-T-S-T-T-T-S.',
        content: lessonContent({
          Objetivo: 'Memorizar e aplicar a formula da escala maior.',
          Conceito: 'A escala maior nasce da formula: Tom, Tom, Semitom, Tom, Tom, Tom, Semitom. Essa regra funciona a partir de qualquer nota inicial.',
          Analogia: 'E como uma receita. Se voce segue as mesmas medidas com ingredientes diferentes, cria o mesmo tipo de resultado em outra tonalidade.',
          'Exemplo visual': ['T - T - S - T - T - T - S', 'C para D = T', 'D para E = T', 'E para F = S'],
          'Exercicio guiado': 'Comece em C e aplique: T leva a D, T leva a E, S leva a F. Continue ate completar sete notas.',
          Desafio: 'Fale a formula sem olhar: T, T, S, T, T, T, S.',
          Resumo: ['Escala maior tem formula fixa.', 'A formula evita decoreba.', 'O ponto inicial muda a tonalidade.', 'A sonoridade maior costuma parecer aberta e estavel.'],
        }),
        xpReward: 10,
        sortOrder: 3,
      },
      {
        title: 'Escala de C',
        description: 'A escala maior sem acidentes.',
        content: lessonContent({
          Objetivo: 'Construir C maior e entender por que ela nao usa sustenidos nem bemois.',
          Conceito: 'A escala de C maior usa C, D, E, F, G, A e B. Ela encaixa naturalmente na formula T-T-S-T-T-T-S.',
          Analogia: 'E o caminho mais limpo para enxergar a regra, como aprender um mapa sem ruas bloqueadas.',
          'Exemplo visual': ['C D E F G A B', 'Entre E e F existe semitom.', 'Entre B e C existe semitom.'],
          'Exercicio guiado': 'Confira a formula: C-D=T, D-E=T, E-F=S, F-G=T, G-A=T, A-B=T, B-C=S.',
          Desafio: 'Monte C maior sem usar # ou b.',
          Resumo: ['C maior usa apenas notas naturais.', 'Ela e excelente para aprender a formula.', 'Os semitons naturais ficam entre E-F e B-C.', 'Depois de C, a mesma regra serve para outras raizes.'],
        }),
        xpReward: 10,
        sortOrder: 4,
      },
      {
        title: 'Escala de G',
        description: 'A primeira escala com sustenido.',
        content: lessonContent({
          Objetivo: 'Entender por que G maior precisa de F#.',
          Conceito: 'G maior segue a mesma formula da escala maior. Para manter o ultimo trecho como T-S, a nota F precisa virar F#.',
          Analogia: 'A receita continua a mesma, mas um ingrediente precisa de ajuste para a medida final fechar.',
          'Exemplo visual': ['G A B C D E F#', 'E para F# = T', 'F# para G = S'],
          'Exercicio guiado': 'Monte a partir de G: G, A, B, C, D, E. Para voltar a G com a formula certa, use F#.',
          Desafio: 'Qual acidente aparece em G maior? Resposta: F#.',
          Resumo: ['G maior tem um sustenido.', 'O sustenido e F#.', 'Ele existe para preservar a formula maior.', 'Nao e escolha aleatoria: e consequencia da regra.'],
        }),
        xpReward: 10,
        sortOrder: 5,
      },
      {
        title: 'Escalas Relativas',
        description: 'Mesmas notas, centros diferentes.',
        content: lessonContent({
          Objetivo: 'Entender que escalas relativas compartilham notas, mas nao o mesmo centro.',
          Conceito: 'Escalas relativas usam o mesmo conjunto de notas. C maior e A menor usam as notas naturais, mas C e A funcionam como centros diferentes.',
          Analogia: 'E como contar a mesma historia pelo ponto de vista de outro personagem. Os elementos sao os mesmos, mas a sensacao muda.',
          'Exemplo visual': ['C maior: C D E F G A B', 'A menor: A B C D E F G', 'Mesmas notas, inicio diferente.'],
          'Exercicio guiado': 'Leia C D E F G A B. Agora comece da sexta nota: A B C D E F G.',
          Desafio: 'Qual relativa menor de C maior? Resposta: A menor.',
          Resumo: ['Relativas compartilham notas.', 'O centro muda a sensacao musical.', 'Toda maior tem uma relativa menor.', 'A relativa menor fica no sexto grau da maior.'],
        }),
        xpReward: 10,
        sortOrder: 6,
      },
      {
        title: 'Construindo Escalas',
        description: 'Pratica com a formula maior.',
        content: lessonContent({
          Objetivo: 'Construir escalas maiores usando a formula em vez de decorar.',
          Conceito: 'Para construir uma escala maior, escolha uma nota inicial e aplique T-T-S-T-T-T-S ate completar o ciclo.',
          Analogia: 'E como usar uma sequencia de passos de danca. Voce pode comecar em lugares diferentes, mas o desenho dos passos continua igual.',
          'Exercicio guiado': 'Para D maior: D -> E (T), E -> F# (T), F# -> G (S), G -> A (T), A -> B (T), B -> C# (T), C# -> D (S).',
          Desafio: 'Monte G maior e D maior sem consultar a resposta antes.',
          Resumo: ['Escolha a raiz.', 'Aplique T-T-S-T-T-T-S.', 'Use sustenidos ou bemois quando a formula exigir.', 'Confira se a escala termina voltando para a raiz.'],
        }),
        xpReward: 50,
        sortOrder: 7,
      },
      {
        title: 'Avaliacao do Modulo 3',
        description: 'Mostre que entende a logica das escalas.',
        content: lessonContent({
          Objetivo: 'Validar formula da escala maior, tons, semitons e construcao em C, G e D.',
          Conceito: 'A avaliacao testa se voce consegue usar a regra em contextos diferentes, nao apenas repetir uma lista decorada.',
          'Antes de comecar': ['Formula maior: T-T-S-T-T-T-S.', 'C maior nao tem acidentes.', 'G maior tem F#.', 'D maior tem F# e C#.', 'Tom = dois semitons.'],
          Desafio: 'Monte as escalas com calma, conferindo cada passo.',
          Resumo: ['Escalas conectam notas a tonalidades.', 'A formula maior e uma ferramenta central.', 'Com escalas claras, intervalos e acordes ficam muito mais faceis.'],
        }),
        xpReward: 100,
        sortOrder: 8,
      },
    ];

    for (const lesson of module3Lessons) {
      await upsertLesson(client, module3Id, lesson);
    }

    const lessonsMod3Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module3Id],
    );
    const lesson3IdByOrder = new Map(lessonsMod3Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));

    const module3Exercises: SeedExercise[] = [
      {
        lessonOrder: 1,
        type: 'multiple_choice',
        prompt: 'O que e uma escala?',
        payload: {
          options: ['Uma sequencia organizada de notas', 'Um tipo de metronomo', 'Uma cifra menor', 'Uma batida por minuto'],
          correctAnswer: 'Uma sequencia organizada de notas',
          feedback: 'Escala e uma sequencia organizada por uma regra. Ela cria um conjunto de notas que funcionam bem juntas.',
        },
      },
      {
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'Quanto vale um tom?',
        payload: {
          options: ['Dois semitons', 'Meio semitom', 'Quatro compassos', 'Sete notas'],
          correctAnswer: 'Dois semitons',
          feedback: 'Um tom equivale a dois semitons. Essa medida e a base para construir escalas.',
        },
      },
      {
        lessonOrder: 3,
        type: 'fill_blank',
        prompt: 'A formula da escala maior e T-T-S-T-T-T-_____.',
        payload: {
          sentence: 'A formula da escala maior e T-T-S-T-T-T-_____.',
          answer: 'S',
          feedback: 'A formula completa e T-T-S-T-T-T-S. O ultimo semitom fecha o ciclo de volta para a raiz.',
        },
      },
      {
        lessonOrder: 4,
        type: 'scale_builder',
        prompt: 'Construa a Escala de C Maior',
        payload: {
          rootNote: 'C',
          expectedScale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          feedback: 'C maior usa apenas notas naturais: C, D, E, F, G, A, B.',
        },
      },
      {
        lessonOrder: 5,
        type: 'multiple_choice',
        prompt: 'Qual sustenido aparece na escala de G maior?',
        payload: {
          options: ['C#', 'F#', 'G#', 'D#'],
          correctAnswer: 'F#',
          feedback: 'G maior precisa de F# para manter a formula T-T-S-T-T-T-S.',
        },
      },
      {
        lessonOrder: 5,
        type: 'scale_builder',
        prompt: 'Construa a Escala de G Maior',
        payload: {
          rootNote: 'G',
          expectedScale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
          feedback: 'G maior e G, A, B, C, D, E, F#. O F# fecha a formula corretamente.',
        },
      },
      {
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Qual e a relativa menor de C maior?',
        payload: {
          options: ['A menor', 'D menor', 'G menor', 'F menor'],
          correctAnswer: 'A menor',
          feedback: 'A relativa menor fica no sexto grau da escala maior. Em C maior, o sexto grau e A.',
        },
      },
      {
        lessonOrder: 7,
        type: 'scale_builder',
        prompt: 'Construa a Escala de D Maior',
        payload: {
          rootNote: 'D',
          expectedScale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
          feedback: 'D maior tem F# e C#. Esses acidentes mantem a formula maior correta.',
        },
      },
      {
        lessonOrder: 7,
        type: 'scale_builder',
        prompt: 'Construa a Escala de A Maior',
        payload: {
          rootNote: 'A',
          expectedScale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
          feedback: 'A maior tem C#, F# e G#. Use a formula para conferir cada passo.',
        },
      },
      {
        lessonOrder: 8,
        type: 'multiple_choice',
        prompt: 'Qual afirmacao esta correta sobre escalas maiores?',
        payload: {
          options: ['A formula maior e T-T-S-T-T-T-S', 'Toda escala maior usa apenas notas naturais', 'G maior nao tem sustenido', 'Tom e igual a um quarto de tempo'],
          correctAnswer: 'A formula maior e T-T-S-T-T-T-S',
          feedback: 'A formula maior e T-T-S-T-T-T-S. Algumas escalas precisam de acidentes para manter essa formula.',
        },
      },
    ];

    await syncModuleExercises(client, module3Id, lesson3IdByOrder, module3Exercises);

    // --- MODULO 4: INTERVALOS ---
    console.log('Inserindo Módulo 4...');
    const module4Id = await upsertModule(
      client,
      courseId,
      'Intervalos',
      'Compreender distâncias musicais.',
      4,
    );

    const module4Lessons: SeedLesson[] = [
      {
        title: 'O que é um intervalo',
        description: 'A distancia entre notas',
        content: lessonContent({
          Objetivo: 'Entender intervalo como a distancia musical entre duas notas.',
          Conceito: 'Intervalo e a medida entre uma nota e outra. Quando voce compara C com E, por exemplo, esta observando a distancia entre esses dois sons.',
          Analogia: 'Pense em pontos no mapa. C e um ponto, E e outro. O intervalo e o caminho entre eles.',
          'Exemplo visual': ['C para D = segunda', 'C para E = terça', 'C para G = quinta'],
          'Exercicio guiado': 'Comece em C e conte letras: C(1), D(2), E(3). Por isso C ate E e uma terça.',
          Desafio: 'Escolha duas notas naturais e conte quantas letras existem da primeira ate a segunda, incluindo as duas.',
          Resumo: ['Intervalo mede distancia.', 'Contamos a nota de partida como 1.', 'Intervalos ajudam a construir escalas, acordes e melodias.', 'Acordes nascem de intervalos empilhados.'],
        }),
        xpReward: 10,
        sortOrder: 1,
      },
      {
        title: 'Segunda',
        description: 'Intervalo de 2a',
        content: lessonContent({
          Objetivo: 'Reconhecer a segunda como movimento para a nota vizinha.',
          Conceito: 'Segunda e o intervalo entre uma nota e a proxima letra musical. C para D e uma segunda; E para F tambem.',
          Analogia: 'E como dar um passo para a casa ao lado.',
          'Exemplo visual': ['C -> D', 'D -> E', 'E -> F'],
          'Exercicio guiado': 'Conte C como 1 e D como 2. Isso forma uma segunda.',
          Desafio: 'Qual e a segunda acima de G? Resposta: A.',
          Resumo: ['Segunda e uma nota vizinha.', 'Pode ser maior ou menor dependendo dos semitons.', 'No comeco, foque em contar letras corretamente.'],
        }),
        xpReward: 10,
        sortOrder: 2,
      },
      {
        title: 'Terça',
        description: 'Intervalo de 3a',
        content: lessonContent({
          Objetivo: 'Entender a terça como intervalo que define muito da cor dos acordes.',
          Conceito: 'Terça e a distancia de tres letras musicais. C para E e uma terça. C para Eb tambem e terça, mas menor.',
          Analogia: 'Se a segunda e a casa ao lado, a terça pula uma casa e chega na seguinte.',
          'Exemplo visual': ['C -> D -> E', 'G -> A -> B', 'A -> B -> C'],
          'Exercicio guiado': 'Conte G(1), A(2), B(3). A terça acima de G e B.',
          Desafio: 'Qual e a terça maior acima de C? Resposta: E.',
          Resumo: ['Terça conta tres letras.', 'Terça maior e terça menor mudam a sensacao do acorde.', 'Acordes maiores e menores dependem da terça.'],
        }),
        xpReward: 10,
        sortOrder: 3,
      },
      {
        title: 'Quarta',
        description: 'Intervalo de 4a',
        content: lessonContent({
          Objetivo: 'Reconhecer a quarta como distancia estavel e muito usada em melodias.',
          Conceito: 'Quarta e a distancia de quatro letras musicais. C para F e uma quarta.',
          Analogia: 'E um salto maior que a terça, mas ainda facil de cantar em muitas melodias.',
          'Exemplo visual': ['C -> D -> E -> F', 'D -> E -> F -> G', 'G -> A -> B -> C'],
          'Exercicio guiado': 'Conte C(1), D(2), E(3), F(4). A quarta acima de C e F.',
          Desafio: 'Qual e a quarta acima de G? Resposta: C.',
          Resumo: ['Quarta conta quatro letras.', 'C para F e quarta.', 'G para C tambem e quarta.', 'Ela prepara o entendimento de campo harmonico.'],
        }),
        xpReward: 10,
        sortOrder: 4,
      },
      {
        title: 'Quinta',
        description: 'Intervalo de 5a',
        content: lessonContent({
          Objetivo: 'Entender a quinta como base forte para acordes.',
          Conceito: 'Quinta e a distancia de cinco letras. C para G e uma quinta. A quinta justa aparece em acordes maiores e menores.',
          Analogia: 'A quinta funciona como uma coluna de sustentacao: ela da firmeza para o acorde.',
          'Exemplo visual': ['C -> D -> E -> F -> G', 'D -> E -> F -> G -> A', 'G -> A -> B -> C -> D'],
          'Exercicio guiado': 'Conte C(1), D(2), E(3), F(4), G(5). A quinta acima de C e G.',
          Desafio: 'Qual e a quinta acima de D? Resposta: A.',
          Resumo: ['Quinta conta cinco letras.', 'C para G e quinta justa.', 'Tríades usam tonica, terça e quinta.', 'Ela e essencial para acordes.'],
        }),
        xpReward: 10,
        sortOrder: 5,
      },
      {
        title: 'Sexta',
        description: 'Intervalo de 6a',
        content: lessonContent({
          Objetivo: 'Reconhecer a sexta e sua relacao com escalas relativas.',
          Conceito: 'Sexta e a distancia de seis letras. Em uma escala maior, o sexto grau aponta para a relativa menor.',
          Analogia: 'A sexta parece longe da raiz, mas ainda pertence ao mesmo mapa da escala.',
          'Exemplo visual': ['C -> D -> E -> F -> G -> A', 'A e o sexto grau de C maior', 'C maior tem A menor como relativa.'],
          'Exercicio guiado': 'Conte C(1), D(2), E(3), F(4), G(5), A(6).',
          Desafio: 'Qual e a sexta acima de C? Resposta: A.',
          Resumo: ['Sexta conta seis letras.', 'Ela ajuda a encontrar relativas menores.', 'C para A e sexta.'],
        }),
        xpReward: 10,
        sortOrder: 6,
      },
      {
        title: 'Sétima',
        description: 'Intervalo de 7a',
        content: lessonContent({
          Objetivo: 'Conhecer a sétima como intervalo de tensao antes da oitava.',
          Conceito: 'Sétima e a distancia de sete letras. Ela fica muito perto de voltar para a nota inicial em uma nova oitava.',
          Analogia: 'E como estar no penultimo degrau antes de chegar ao topo.',
          'Exemplo visual': ['C -> D -> E -> F -> G -> A -> B', 'B quer resolver em C', 'Sétimas aparecem em acordes como G7.'],
          'Exercicio guiado': 'Conte C ate B incluindo C como 1. B sera o 7.',
          Desafio: 'Qual e a sétima acima de C? Resposta: B.',
          Resumo: ['Sétima conta sete letras.', 'Ela cria tensao musical.', 'Acordes com sétima aparecem muito em progressões.'],
        }),
        xpReward: 10,
        sortOrder: 7,
      },
      {
        title: 'Oitava',
        description: 'Intervalo de 8a',
        content: lessonContent({
          Objetivo: 'Entender oitava como a mesma nota em uma altura diferente.',
          Conceito: 'Oitava e quando voltamos ao mesmo nome de nota depois de completar o ciclo. C ate o proximo C e uma oitava.',
          Analogia: 'E como duas pessoas cantando a mesma nota, uma grave e outra aguda.',
          'Exemplo visual': ['C D E F G A B C', 'Primeiro C = grave', 'Segundo C = mais agudo'],
          'Exercicio guiado': 'Conte C(1), D(2), E(3), F(4), G(5), A(6), B(7), C(8).',
          Desafio: 'Qual nota forma oitava acima de G? Resposta: G.',
          Resumo: ['Oitava repete o nome da nota.', 'A altura muda, mas a identidade permanece.', 'Escalas fecham quando chegam na oitava.'],
        }),
        xpReward: 10,
        sortOrder: 8,
      },
      {
        title: 'Avaliação Final',
        description: 'Teste seu dominio',
        content: lessonContent({
          Objetivo: 'Validar se voce consegue contar e construir intervalos simples.',
          Conceito: 'A avaliacao mistura contagem por letras e escolha da nota final.',
          'Antes de comecar': ['Conte a nota inicial como 1.', 'C-E e terça.', 'C-F e quarta.', 'C-G e quinta.', 'C-C em novo ciclo e oitava.'],
          Desafio: 'Responda sem pular a contagem das letras.',
          Resumo: ['Intervalos medem distancias.', 'Eles conectam escalas a acordes.', 'Dominar intervalos deixa acordes muito mais claros.'],
        }),
        xpReward: 100,
        sortOrder: 9,
      },
    ];

    for (const lesson of module4Lessons) {
      await upsertLesson(client, module4Id, lesson);
    }

    const lessonsMod4Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module4Id],
    );
    const lesson4IdByOrder = new Map(lessonsMod4Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));
    const module4Exercises: SeedExercise[] = [
      {
        lessonOrder: 1,
        type: 'multiple_choice',
        prompt: 'O que um intervalo mede?',
        payload: {
          options: ['A distancia entre duas notas', 'A velocidade da musica', 'A quantidade de compassos', 'O volume de um instrumento'],
          correctAnswer: 'A distancia entre duas notas',
          feedback: 'Intervalo e a distancia musical entre duas notas.',
        },
      },
      {
        lessonOrder: 2,
        type: 'interval_builder',
        prompt: 'Construa uma segunda maior a partir de C',
        payload: {
          rootNote: 'C',
          interval: '2M',
          answer: 'D',
          feedback: 'C para D conta duas letras: C(1), D(2).',
        },
      },
      {
        lessonOrder: 3,
        type: 'interval_builder',
        prompt: 'Construa uma terça maior a partir de C',
        payload: {
          rootNote: 'C',
          interval: '3M',
          answer: 'E',
          feedback: 'C para E conta tres letras: C(1), D(2), E(3).',
        },
      },
      {
        lessonOrder: 3,
        type: 'interval_builder',
        prompt: 'Construa uma terça maior a partir de G',
        payload: {
          rootNote: 'G',
          interval: '3M',
          answer: 'B',
          feedback: 'G para B conta G(1), A(2), B(3).',
        },
      },
      {
        lessonOrder: 4,
        type: 'interval_builder',
        prompt: 'Construa uma quarta justa a partir de C',
        payload: {
          rootNote: 'C',
          interval: '4J',
          answer: 'F',
          feedback: 'C para F conta quatro letras: C, D, E, F.',
        },
      },
      {
        lessonOrder: 5,
        type: 'interval_builder',
        prompt: 'Construa uma quinta justa a partir de D',
        payload: {
          rootNote: 'D',
          interval: '5J',
          answer: 'A',
          feedback: 'D para A conta D(1), E(2), F(3), G(4), A(5).',
        },
      },
      {
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Qual nota e a sexta acima de C?',
        payload: {
          options: ['A', 'E', 'G', 'B'],
          correctAnswer: 'A',
          feedback: 'C(1), D(2), E(3), F(4), G(5), A(6).',
        },
      },
      {
        lessonOrder: 7,
        type: 'multiple_choice',
        prompt: 'Qual nota e a sétima acima de C?',
        payload: {
          options: ['B', 'A', 'G', 'F'],
          correctAnswer: 'B',
          feedback: 'C ate B conta sete letras. Essa sétima cria tensao antes de resolver em C.',
        },
      },
      {
        lessonOrder: 8,
        type: 'interval_builder',
        prompt: 'Construa uma oitava a partir de G',
        payload: {
          rootNote: 'G',
          interval: '8J',
          answer: 'G',
          feedback: 'Na oitava, o nome da nota se repete em outra altura.',
        },
      },
      {
        lessonOrder: 9,
        type: 'multiple_choice',
        prompt: 'Qual afirmacao esta correta?',
        payload: {
          options: ['C para G e uma quinta', 'C para E e uma segunda', 'Oitava troca o nome da nota', 'Intervalo mede BPM'],
          correctAnswer: 'C para G e uma quinta',
          feedback: 'C para G conta C(1), D(2), E(3), F(4), G(5): quinta.',
        },
      },
    ];

    await syncModuleExercises(client, module4Id, lesson4IdByOrder, module4Exercises);

    // --- MODULO 5: ACORDES ---
    console.log('Inserindo Módulo 5...');
    const module5Id = await upsertModule(
      client,
      courseId,
      'Acordes',
      'Construir acordes utilizando intervalos.',
      5,
    );

    const module5Lessons: SeedLesson[] = [
      { title: 'O que é um acorde', description: 'Harmonia básica', content: 'Conjunto de notas tocadas juntas.', xpReward: 10, sortOrder: 1 },
      { title: 'Tríades', description: '3 notas', content: 'Formadas por tônica, terça e quinta.', xpReward: 10, sortOrder: 2 },
      { title: 'Acordes Maiores', description: 'Som alegre', content: 'Tônica, terça maior, quinta justa.', xpReward: 10, sortOrder: 3 },
      { title: 'Acordes Menores', description: 'Som triste', content: 'Tônica, terça menor, quinta justa.', xpReward: 10, sortOrder: 4 },
      { title: 'Acordes Diminutos', description: 'Som tenso', content: 'Tônica, terça menor, quinta diminuta.', xpReward: 10, sortOrder: 5 },
      { title: 'Acordes Aumentados', description: 'Som expansivo', content: 'Tônica, terça maior, quinta aumentada.', xpReward: 10, sortOrder: 6 },
      { title: 'Construção de Acordes', description: 'Prática', content: 'Montando tríades.', xpReward: 50, sortOrder: 7 },
      { title: 'Avaliação Final', description: 'Teste seu dominio', content: 'Teste seus conhecimentos.', xpReward: 100, sortOrder: 8 },
    ];

    for (const lesson of module5Lessons) {
      await upsertLesson(client, module5Id, lesson);
    }

    const lessonsMod5Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module5Id],
    );
    const lesson5IdByOrder = new Map(lessonsMod5Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));

    const module5Exercises: SeedExercise[] = [
      {
        lessonOrder: 7,
        type: 'chord_builder',
        prompt: 'Construa um acorde maior de G',
        payload: { rootNote: 'G', chordType: 'Major', answer: 'G B D' },
      },
    ];

    await syncModuleExercises(client, module5Id, lesson5IdByOrder, module5Exercises);

    // --- MODULO 6: CAMPO HARMÔNICO ---
    console.log('Inserindo Módulo 6...');
    const module6Id = await upsertModule(
      client,
      courseId,
      'Campo Harmônico',
      'Entender a relação entre acordes.',
      6,
    );

    const module6Lessons: SeedLesson[] = [
      { title: 'O que é Campo Harmônico', description: 'A familia de acordes', content: 'Acordes gerados a partir de uma escala.', xpReward: 10, sortOrder: 1 },
      { title: 'Graus Harmônicos', description: 'Numeração', content: 'I, ii, iii, IV, V, vi, vii°.', xpReward: 10, sortOrder: 2 },
      { title: 'Campo Harmônico Maior', description: 'Regra geral', content: 'A estrutura fixa dos acordes maiores.', xpReward: 10, sortOrder: 3 },
      { title: 'Funções Harmônicas', description: 'Tensão e repouso', content: 'Tônica, Subdominante e Dominante.', xpReward: 10, sortOrder: 4 },
      { title: 'Progressões Harmônicas', description: 'Sequências', content: 'Como combinar os acordes.', xpReward: 50, sortOrder: 5 },
      { title: 'Avaliação Final', description: 'Teste seu dominio', content: 'Teste seus conhecimentos.', xpReward: 100, sortOrder: 6 },
    ];

    for (const lesson of module6Lessons) {
      await upsertLesson(client, module6Id, lesson);
    }

    const lessonsMod6Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module6Id],
    );
    const lesson6IdByOrder = new Map(lessonsMod6Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));

    const module6Exercises: SeedExercise[] = [
      {
        lessonOrder: 3,
        type: 'harmonic_field_builder',
        prompt: 'Monte o campo harmônico de C',
        payload: { key: 'C', answer: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'] },
      },
    ];

    await syncModuleExercises(client, module6Id, lesson6IdByOrder, module6Exercises);

    // --- MODULO 7: APLICAÇÃO MUSICAL ---
    console.log('Inserindo Módulo 7...');
    const module7Id = await upsertModule(
      client,
      courseId,
      'Aplicação Musical',
      'Aplicar teoria em músicas reais.',
      7,
    );

    const module7Lessons: SeedLesson[] = [
      { title: 'Analisando uma música', description: 'Visão geral', content: 'Como desconstruir uma música.', xpReward: 10, sortOrder: 1 },
      { title: 'Encontrando o Tom', description: 'Qual a chave?', content: 'Descobrindo o centro tonal.', xpReward: 10, sortOrder: 2 },
      { title: 'Identificando Escalas', description: 'Qual usar?', content: 'Encontrando a escala correta.', xpReward: 10, sortOrder: 3 },
      { title: 'Identificando Acordes', description: 'Harmonia', content: 'Mapeando os acordes usados.', xpReward: 10, sortOrder: 4 },
      { title: 'Montando Progressões', description: 'Prática', content: 'Criando suas próprias sequências.', xpReward: 50, sortOrder: 5 },
      { title: 'Criando acompanhamentos', description: 'Tocando junto', content: 'Como acompanhar uma melodia.', xpReward: 50, sortOrder: 6 },
      { title: 'Avaliação Final', description: 'Teste seu dominio', content: 'Teste seus conhecimentos.', xpReward: 100, sortOrder: 7 },
    ];

    for (const lesson of module7Lessons) {
      await upsertLesson(client, module7Id, lesson);
    }

    const lessonsMod7Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module7Id],
    );
    const lesson7IdByOrder = new Map(lessonsMod7Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));
    await syncModuleExercises(client, module7Id, lesson7IdByOrder, []);

    // --- MODULO 8: TREINO AUDITIVO ---
    console.log('Inserindo Módulo 8...');
    const module8Id = await upsertModule(
      client,
      courseId,
      'Treino Auditivo',
      'Desenvolver percepção musical.',
      8,
    );

    const module8Lessons: SeedLesson[] = [
      { title: 'Reconhecimento de Notas', description: 'Ouvido absoluto e relativo', content: 'Treinando a percepção de notas.', xpReward: 50, sortOrder: 1 },
      { title: 'Reconhecimento de Intervalos', description: 'Distâncias', content: 'Ouvindo intervalos.', xpReward: 50, sortOrder: 2 },
      { title: 'Reconhecimento de Escalas', description: 'Cores musicais', content: 'Maior x Menor.', xpReward: 50, sortOrder: 3 },
      { title: 'Reconhecimento de Acordes', description: 'Tríades', content: 'Ouvindo tríades.', xpReward: 50, sortOrder: 4 },
      { title: 'Reconhecimento de Progressões', description: 'Sequências', content: 'Ouvindo o movimento harmônico.', xpReward: 50, sortOrder: 5 },
      { title: 'Avaliação Final', description: 'Teste seu dominio', content: 'A prova final da jornada.', xpReward: 100, sortOrder: 6 },
    ];

    for (const lesson of module8Lessons) {
      await upsertLesson(client, module8Id, lesson);
    }

    const lessonsMod8Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module8Id],
    );
    const lesson8IdByOrder = new Map(lessonsMod8Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));

    const module8Exercises: SeedExercise[] = [
      {
        lessonOrder: 1,
        type: 'audio_recognition',
        prompt: 'Qual nota está tocando?',
        payload: { audio: 'note_C4.mp3', options: ['C', 'D', 'E', 'F'], correctAnswer: 'C' },
      },
    ];

    await syncModuleExercises(client, module8Id, lesson8IdByOrder, module8Exercises);

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
