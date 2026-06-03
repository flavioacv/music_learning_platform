import type { PoolClient } from 'pg';
import { pool } from './pool.js';
import { hashPassword } from '../shared/security/password.js';

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

const adminUser = {
  name: 'Admin',
  email: 'admin@admin.com',
  password: 'abc123',
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

function distributeCorrectOption(
  payload: Record<string, unknown>,
  sortOrder: number,
): Record<string, unknown> {
  if (!Array.isArray(payload.options) || typeof payload.correctAnswer !== 'string') {
    return payload;
  }

  const options = [...payload.options] as unknown[];
  const correctIndex = options.indexOf(payload.correctAnswer);
  if (correctIndex === -1 || options.length < 2) {
    return payload;
  }

  const targetIndex = (sortOrder - 1) % options.length;
  const [correctOption] = options.splice(correctIndex, 1);
  options.splice(targetIndex, 0, correctOption);

  return {
    ...payload,
    options,
  };
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

async function upsertAdminUser(client: PoolClient) {
  const passwordHash = await hashPassword(adminUser.password);
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [adminUser.email],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    await client.query(
      `
        UPDATE users
        SET name = $1, password_hash = $2, updated_at = now()
        WHERE email = $3
      `,
      [adminUser.name, passwordHash, adminUser.email],
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [adminUser.name, adminUser.email, passwordHash],
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
  const payload = distributeCorrectOption(exercise.payload, sortOrder);
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
      [exercise.type, exercise.prompt, JSON.stringify(payload), existing.rows[0].id],
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `
      INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
      VALUES ($1, $2, $3, $4, 20, $5)
      RETURNING id
    `,
    [lessonId, exercise.type, exercise.prompt, JSON.stringify(payload), sortOrder],
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

    console.log('Atualizando usuario admin...');
    await upsertAdminUser(client);

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
        lessonOrder: 1,
        type: 'multiple_choice',
        prompt: 'Por que nomear uma nota ajuda no estudo?',
        payload: {
          options: ['Porque permite reconhecer e comparar sons', 'Porque aumenta automaticamente o volume', 'Porque substitui o ritmo', 'Porque muda o instrumento tocado'],
          correctAnswer: 'Porque permite reconhecer e comparar sons',
          feedback: 'Quando voce da nome ao som, consegue lembrar, comparar e combinar esse som em escalas, acordes e melodias.',
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
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'Qual trecho mantém a ordem natural das notas?',
        payload: {
          options: ['Fa Sol La', 'Fa Mi Re', 'Sol Fa La', 'La Do Si'],
          correctAnswer: 'Fa Sol La',
          feedback: 'A ordem natural segue Do, Re, Mi, Fa, Sol, La, Si. Por isso Fa, Sol, La aparece em sequencia correta.',
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
        lessonOrder: 4,
        type: 'multiple_choice',
        prompt: 'Se F sobe meio tom, qual nome aparece?',
        payload: {
          options: ['F#', 'E', 'Fb', 'G'],
          correctAnswer: 'F#',
          feedback: 'Sustenido sobe meio tom mantendo a letra da nota. F subindo meio tom vira F#.',
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
      {
        lessonOrder: 9,
        type: 'multiple_choice',
        prompt: 'Qual combinacao revisa corretamente cifra e acidente?',
        payload: {
          options: ['A e La; # sobe meio tom', 'C e Fa; b sobe meio tom', 'G e Mi; # desce meio tom', 'B e Do; b aumenta a nota'],
          correctAnswer: 'A e La; # sobe meio tom',
          feedback: 'A representa La na cifra americana, e o sustenido (#) sobe a nota em meio tom.',
        },
      },
      {
        lessonOrder: 9,
        type: 'fill_blank',
        prompt: 'Na cifra americana, F representa _____.',
        payload: {
          sentence: 'Na cifra americana, F representa _____.',
          answer: 'Fa',
          feedback: 'F representa Fa. Junto com C=Do, D=Re, E=Mi, G=Sol, A=La e B=Si, voce completa o mapa basico.',
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
        lessonOrder: 2,
        type: 'rhythm_tap',
        prompt: 'Sinta a pulsacao com quatro toques constantes',
        payload: {
          bpm: 68,
          pattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
          feedback: 'A pulsacao aparece como uma referencia regular. O objetivo aqui e manter os quatro toques igualmente espacados.',
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
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Quantas minimas completam um compasso 4/4?',
        payload: {
          options: ['Duas', 'Uma', 'Quatro', 'Oito'],
          correctAnswer: 'Duas',
          feedback: 'Cada minima dura dois tempos. Em 4/4, duas minimas somam os quatro tempos do compasso.',
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
        lessonOrder: 10,
        type: 'rhythm_tap',
        prompt: 'Pratique com metronomo lento: toque no 1 e no 4',
        payload: {
          bpm: 60,
          pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
          feedback: 'O metronomo lento expõe qualquer pressa. Conte 1, 2, 3, 4 e toque apenas no 1 e no 4.',
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
      {
        lessonOrder: 12,
        type: 'multiple_choice',
        prompt: 'Qual escolha mostra uma relacao correta entre figura e duracao?',
        payload: {
          options: ['Semibreve dura 4 tempos em 4/4', 'Colcheia dura 4 tempos', 'Minima dura meio tempo', 'Seminima dura 2 compassos'],
          correctAnswer: 'Semibreve dura 4 tempos em 4/4',
          feedback: 'No 4/4, a semibreve ocupa o compasso inteiro: quatro tempos.',
        },
      },
      {
        lessonOrder: 12,
        type: 'rhythm_tap',
        prompt: 'Avaliação rítmica: alterne toque e silêncio',
        payload: {
          bpm: 84,
          pattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
          feedback: 'Este padrao mistura tempo forte, espera e subdivisao. Conte internamente para manter o desenho claro.',
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
        lessonOrder: 3,
        type: 'multiple_choice',
        prompt: 'Na formula maior, onde aparece o primeiro semitom?',
        payload: {
          options: ['Entre o 3 e o 4 grau', 'Entre o 1 e o 2 grau', 'Entre o 5 e o 6 grau', 'Entre todos os graus'],
          correctAnswer: 'Entre o 3 e o 4 grau',
          feedback: 'A formula maior e T-T-S-T-T-T-S. O primeiro S aparece entre o terceiro e o quarto grau.',
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
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Qual pista ajuda a achar a relativa menor?',
        payload: {
          options: ['Olhar o sexto grau da escala maior', 'Contar quatro tempos de ritmo', 'Escolher sempre a nota C', 'Trocar a tônica por sustenido'],
          correctAnswer: 'Olhar o sexto grau da escala maior',
          feedback: 'A relativa menor compartilha as notas da escala maior e começa no sexto grau.',
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
      {
        lessonOrder: 8,
        type: 'scale_builder',
        prompt: 'Avaliação: construa a Escala de F Maior',
        payload: {
          rootNote: 'F',
          expectedScale: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
          feedback: 'F maior usa Bb para preservar a formula maior: F, G, A, Bb, C, D, E.',
        },
      },
      {
        lessonOrder: 8,
        type: 'multiple_choice',
        prompt: 'Qual escala maior usa Bb?',
        payload: {
          options: ['F maior', 'G maior', 'D maior', 'A maior'],
          correctAnswer: 'F maior',
          feedback: 'F maior tem Bb. G, D e A maior usam sustenidos, nao Bb, neste nivel de estudo.',
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
        lessonOrder: 2,
        type: 'interval_builder',
        prompt: 'Construa uma segunda maior a partir de G',
        payload: {
          rootNote: 'G',
          interval: '2M',
          answer: 'A',
          feedback: 'G para A conta duas letras: G(1), A(2).',
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
        lessonOrder: 5,
        type: 'interval_builder',
        prompt: 'Construa uma quinta justa a partir de F',
        payload: {
          rootNote: 'F',
          interval: '5J',
          answer: 'C',
          feedback: 'F para C conta F(1), G(2), A(3), B(4), C(5).',
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
      {
        lessonOrder: 9,
        type: 'multiple_choice',
        prompt: 'Qual relacao entre intervalo e acorde esta correta?',
        payload: {
          options: ['A terça ajuda a definir maior ou menor', 'O BPM define a terça', 'A oitava sempre muda o nome da nota', 'Intervalo elimina a raiz'],
          correctAnswer: 'A terça ajuda a definir maior ou menor',
          feedback: 'A terça e decisiva para a cor do acorde: terça maior tende a soar maior; terça menor tende a soar menor.',
        },
      },
      {
        lessonOrder: 9,
        type: 'interval_builder',
        prompt: 'Avaliação: construa uma terça maior a partir de F',
        payload: {
          rootNote: 'F',
          interval: '3M',
          answer: 'A',
          feedback: 'F para A conta F(1), G(2), A(3). Essa terça maior ajuda a formar F maior.',
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
      {
        title: 'O que é um acorde',
        description: 'Harmonia básica',
        content: lessonContent({
          Objetivo: 'Entender acorde como notas combinadas para criar harmonia.',
          Conceito: 'Acorde e um conjunto de notas tocadas juntas ou percebidas como uma unidade. Ele cria sustentacao para melodias e ajuda a definir o clima da musica.',
          Analogia: 'Se uma nota e uma cor, um acorde e uma mistura de cores que cria uma atmosfera.',
          'Exemplo visual': ['C + E + G = acorde de C maior', 'A + C + E = acorde de A menor', 'Notas juntas criam harmonia.'],
          'Exercicio guiado': 'Leia C, E, G. Essas notas formam uma pilha: raiz, terça e quinta.',
          Desafio: 'Ao ouvir uma musica, tente perceber que ha uma base por baixo da melodia. Essa base costuma ser feita de acordes.',
          Resumo: ['Acordes combinam notas.', 'Eles criam harmonia.', 'A maioria dos acordes iniciais vem de tríades.', 'Tríades usam raiz, terça e quinta.'],
        }),
        xpReward: 10,
        sortOrder: 1,
      },
      {
        title: 'Tríades',
        description: '3 notas',
        content: lessonContent({
          Objetivo: 'Construir a ideia de tríade usando raiz, terça e quinta.',
          Conceito: 'Tríade e um acorde de tres notas. A estrutura basica e raiz, terça e quinta. A raiz da nome ao acorde.',
          Analogia: 'Pense em um sanduiche simples: base, recheio e tampa. A tríade tambem tem tres partes que funcionam juntas.',
          'Exemplo visual': ['C maior: C E G', 'D menor: D F A', 'G maior: G B D'],
          'Exercicio guiado': 'Na escala de C, conte C(1), E(3), G(5). Essas notas formam a tríade de C.',
          Desafio: 'Monte uma tríade pegando a primeira, terceira e quinta notas de uma escala.',
          Resumo: ['Tríade tem tres notas.', 'Raiz da nome ao acorde.', 'Terça define grande parte da cor.', 'Quinta sustenta o acorde.'],
        }),
        xpReward: 10,
        sortOrder: 2,
      },
      {
        title: 'Acordes Maiores',
        description: 'Tônica, terça maior e quinta justa.',
        content: lessonContent({
          Objetivo: 'Construir acordes maiores com 1, 3 e 5.',
          Conceito: 'Acorde maior e formado por raiz, terça maior e quinta justa. Em C maior, as notas sao C, E e G.',
          Analogia: 'Acordes maiores costumam soar claros e estaveis, como abrir uma janela em um dia ensolarado.',
          'Exemplo visual': ['C maior = C E G', 'G maior = G B D', 'F maior = F A C'],
          'Exercicio guiado': 'Para montar G maior, use G como raiz, B como terça maior e D como quinta justa.',
          Desafio: 'Monte C maior sem olhar: C, E, G.',
          Resumo: ['Maior = raiz + terça maior + quinta justa.', 'C maior = C E G.', 'G maior = G B D.', 'A terça maior e a cor principal do acorde maior.'],
        }),
        xpReward: 10,
        sortOrder: 3,
      },
      {
        title: 'Acordes Menores',
        description: 'Tônica, terça menor e quinta justa.',
        content: lessonContent({
          Objetivo: 'Construir acordes menores e comparar com maiores.',
          Conceito: 'Acorde menor usa raiz, terça menor e quinta justa. A diferença principal para o maior esta na terça.',
          Analogia: 'Trocar a terça maior pela terça menor muda a luz do acorde, como mudar uma cena de dia para fim de tarde.',
          'Exemplo visual': ['A menor = A C E', 'D menor = D F A', 'E menor = E G B'],
          'Exercicio guiado': 'Compare C maior: C E G com C menor: C Eb G. So a terça mudou.',
          Desafio: 'Monte A menor: A, C, E.',
          Resumo: ['Menor = raiz + terça menor + quinta justa.', 'A menor = A C E.', 'A terça menor muda a cor emocional.', 'Maiores e menores diferem principalmente pela terça.'],
        }),
        xpReward: 10,
        sortOrder: 4,
      },
      {
        title: 'Acordes Diminutos',
        description: 'Tônica, terça menor e quinta diminuta.',
        content: lessonContent({
          Objetivo: 'Entender o acorde diminuto como tríade de tensão.',
          Conceito: 'Acorde diminuto usa raiz, terça menor e quinta diminuta. Em B diminuto, as notas sao B, D e F.',
          Analogia: 'Ele soa como uma porta entreaberta: cria vontade de resolver em outro acorde.',
          'Exemplo visual': ['B diminuto = B D F', 'C diminuto = C Eb Gb', 'Estrutura: 1 b3 b5'],
          'Exercicio guiado': 'Pegue B, conte a terça menor ate D e a quinta diminuta ate F. Isso forma Bdim.',
          Desafio: 'Qual nota deixa B-D-F com som diminuto? A quinta F.',
          Resumo: ['Diminuto = raiz + terça menor + quinta diminuta.', 'Bdim = B D F.', 'Ele cria tensão.', 'Aparece no sétimo grau do campo harmonico maior.'],
        }),
        xpReward: 10,
        sortOrder: 5,
      },
      {
        title: 'Acordes Aumentados',
        description: 'Tônica, terça maior e quinta aumentada.',
        content: lessonContent({
          Objetivo: 'Conhecer o acorde aumentado como tríade expansiva.',
          Conceito: 'Acorde aumentado usa raiz, terça maior e quinta aumentada. Em C aumentado, as notas sao C, E e G#.',
          Analogia: 'Ele soa como algo suspenso, que ainda nao pousou.',
          'Exemplo visual': ['C aumentado = C E G#', 'G aumentado = G B D#', 'Estrutura: 1 3 #5'],
          'Exercicio guiado': 'Compare C maior: C E G. Para C aumentado, suba a quinta G para G#.',
          Desafio: 'Monte C aumentado: C, E, G#.',
          Resumo: ['Aumentado = raiz + terça maior + quinta aumentada.', 'Caug = C E G#.', 'A quinta aumentada cria instabilidade.', 'E menos comum no inicio, mas importante para reconhecer cores harmonicas.'],
        }),
        xpReward: 10,
        sortOrder: 6,
      },
      {
        title: 'Construção de Acordes',
        description: 'Prática',
        content: lessonContent({
          Objetivo: 'Montar tríades a partir da estrutura correta.',
          Conceito: 'Construir acorde e escolher a raiz e empilhar terça e quinta de acordo com o tipo: maior, menor, diminuto ou aumentado.',
          Analogia: 'E como montar blocos: a base e a raiz, o bloco do meio e a terça, o topo e a quinta.',
          'Exercicio guiado': 'Para D menor: raiz D, terça menor F, quinta justa A. Resultado: D F A.',
          Desafio: 'Monte C maior, A menor, B diminuto e C aumentado.',
          Resumo: ['Identifique a raiz.', 'Escolha a terça certa.', 'Escolha a quinta certa.', 'Confira se o acorde tem exatamente tres notas.'],
        }),
        xpReward: 50,
        sortOrder: 7,
      },
      {
        title: 'Avaliação Final',
        description: 'Teste seu dominio',
        content: lessonContent({
          Objetivo: 'Validar construção de tríades maiores, menores, diminutas e aumentadas.',
          Conceito: 'A avaliacao confirma se voce entende a estrutura dos acordes, nao apenas seus nomes.',
          'Antes de comecar': ['Maior = 1 3 5.', 'Menor = 1 b3 5.', 'Diminuto = 1 b3 b5.', 'Aumentado = 1 3 #5.', 'Acordes nascem de intervalos.'],
          Desafio: 'Monte cada acorde pensando na função de cada nota.',
          Resumo: ['Acordes criam harmonia.', 'Tríades sao a fundacao.', 'A terça muda maior/menor.', 'A quinta muda diminuto/aumentado.'],
        }),
        xpReward: 100,
        sortOrder: 8,
      },
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
        lessonOrder: 1,
        type: 'multiple_choice',
        prompt: 'O que e um acorde?',
        payload: {
          options: ['Um conjunto de notas que cria harmonia', 'Uma batida por minuto', 'Um tipo de escala sem notas', 'Apenas uma nota isolada'],
          correctAnswer: 'Um conjunto de notas que cria harmonia',
          feedback: 'Acorde combina notas para criar harmonia e sustentar melodias.',
        },
      },
      {
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'Quais partes formam uma tríade básica?',
        payload: {
          options: ['Raiz, terça e quinta', 'Raiz, BPM e compasso', 'Segunda, quarta e sétima', 'Som, silêncio e volume'],
          correctAnswer: 'Raiz, terça e quinta',
          feedback: 'Tríades sao formadas por raiz, terça e quinta.',
        },
      },
      {
        lessonOrder: 3,
        type: 'chord_builder',
        prompt: 'Construa um acorde maior de C',
        payload: {
          rootNote: 'C',
          chordType: 'Major',
          answer: 'C E G',
          feedback: 'C maior usa raiz C, terça maior E e quinta justa G.',
        },
      },
      {
        lessonOrder: 3,
        type: 'chord_builder',
        prompt: 'Construa um acorde maior de G',
        payload: {
          rootNote: 'G',
          chordType: 'Major',
          answer: 'G B D',
          feedback: 'G maior usa G, B e D: raiz, terça maior e quinta justa.',
        },
      },
      {
        lessonOrder: 3,
        type: 'chord_builder',
        prompt: 'Construa um acorde maior de F',
        payload: {
          rootNote: 'F',
          chordType: 'Major',
          answer: 'F A C',
          feedback: 'F maior usa F, A e C: raiz, terça maior e quinta justa.',
        },
      },
      {
        lessonOrder: 4,
        type: 'chord_builder',
        prompt: 'Construa um acorde menor de A',
        payload: {
          rootNote: 'A',
          chordType: 'Minor',
          answer: 'A C E',
          feedback: 'A menor usa A, C e E. A terça C da a cor menor.',
        },
      },
      {
        lessonOrder: 4,
        type: 'chord_builder',
        prompt: 'Construa um acorde menor de D',
        payload: {
          rootNote: 'D',
          chordType: 'Minor',
          answer: 'D F A',
          feedback: 'D menor usa D, F e A: raiz, terça menor e quinta justa.',
        },
      },
      {
        lessonOrder: 4,
        type: 'multiple_choice',
        prompt: 'Qual nota dá a cor menor ao acorde A menor?',
        payload: {
          options: ['C', 'E', 'G', 'B'],
          correctAnswer: 'C',
          feedback: 'Em A menor, a nota C e a terça menor. Ela e a principal pista da cor menor.',
        },
      },
      {
        lessonOrder: 5,
        type: 'chord_builder',
        prompt: 'Construa um acorde diminuto de B',
        payload: {
          rootNote: 'B',
          chordType: 'Diminished',
          answer: 'B D F',
          feedback: 'B diminuto usa B, D e F: raiz, terça menor e quinta diminuta.',
        },
      },
      {
        lessonOrder: 6,
        type: 'chord_builder',
        prompt: 'Construa um acorde aumentado de C',
        payload: {
          rootNote: 'C',
          chordType: 'Augmented',
          answer: 'C E G#',
          feedback: 'C aumentado usa C, E e G#. A quinta G# cria a cor aumentada.',
        },
      },
      {
        lessonOrder: 7,
        type: 'multiple_choice',
        prompt: 'Qual estrutura representa um acorde menor?',
        payload: {
          options: ['1 b3 5', '1 3 5', '1 b3 b5', '1 3 #5'],
          correctAnswer: '1 b3 5',
          feedback: 'Acorde menor usa raiz, terça menor e quinta justa: 1 b3 5.',
        },
      },
      {
        lessonOrder: 8,
        type: 'multiple_choice',
        prompt: 'Qual acorde tem as notas C E G?',
        payload: {
          options: ['C maior', 'C menor', 'C diminuto', 'A menor'],
          correctAnswer: 'C maior',
          feedback: 'C, E e G formam C maior: raiz C, terça maior E e quinta justa G.',
        },
      },
      {
        lessonOrder: 8,
        type: 'multiple_choice',
        prompt: 'Qual acorde tem as notas A C E?',
        payload: {
          options: ['A menor', 'A maior', 'C maior', 'E diminuto'],
          correctAnswer: 'A menor',
          feedback: 'A, C e E formam A menor. A nota C e a terça menor em relacao a A.',
        },
      },
      {
        lessonOrder: 8,
        type: 'chord_builder',
        prompt: 'Avaliação: construa um acorde maior de D',
        payload: {
          rootNote: 'D',
          chordType: 'Major',
          answer: 'D F# A',
          feedback: 'D maior usa D, F# e A. O F# e a terça maior do acorde.',
        },
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
      {
        title: 'O que é Campo Harmônico',
        description: 'A familia de acordes',
        content: lessonContent({
          Objetivo: 'Entender campo harmonico como os acordes que nascem de uma escala.',
          Conceito: 'Campo harmonico e o conjunto de acordes criados a partir das notas de uma escala. Em C maior, usamos as notas C, D, E, F, G, A e B para formar sete acordes.',
          Analogia: 'Se a escala e uma familia de notas, o campo harmonico e a familia de acordes que nasce dela.',
          'Exemplo visual': ['C maior: C D E F G A B', 'Campo harmonico: C, Dm, Em, F, G, Am, Bdim', 'Cada acorde ocupa um grau.'],
          'Exercicio guiado': 'Pegue C maior. Monte tríades empilhando 1-3-5 a partir de cada nota da escala.',
          Desafio: 'Memorize a formula de qualidades: maior, menor, menor, maior, maior, menor, diminuto.',
          Resumo: ['Campo harmonico vem da escala.', 'Cada grau gera um acorde.', 'Em escala maior, a qualidade dos graus e fixa.', 'Progressões usam acordes do campo harmonico.'],
        }),
        xpReward: 10,
        sortOrder: 1,
      },
      {
        title: 'Graus Harmônicos',
        description: 'Numeração',
        content: lessonContent({
          Objetivo: 'Usar números romanos para representar os acordes do campo.',
          Conceito: 'Graus harmonicos usam números romanos: I, ii, iii, IV, V, vi e vii°. Maiusculo indica acorde maior; minusculo indica acorde menor; o simbolo ° indica diminuto.',
          Analogia: 'E como chamar os acordes por cargos dentro da familia: primeiro, segundo, terceiro, e assim por diante.',
          'Exemplo visual': ['I = C', 'ii = Dm', 'iii = Em', 'IV = F', 'V = G', 'vi = Am', 'vii° = Bdim'],
          'Exercicio guiado': 'Em C maior, conte C como I, Dm como ii, Em como iii.',
          Desafio: 'Qual grau de C maior e G? Resposta: V.',
          Resumo: ['Graus tornam progressões transportáveis.', 'I, IV e V costumam ser muito importantes.', 'Maiusculo e maior; minusculo e menor.', 'vii° e diminuto.'],
        }),
        xpReward: 10,
        sortOrder: 2,
      },
      {
        title: 'Campo Harmônico Maior',
        description: 'Regra geral',
        content: lessonContent({
          Objetivo: 'Construir o campo harmonico maior pela formula de qualidades.',
          Conceito: 'Todo campo harmonico maior segue a ordem: I maior, ii menor, iii menor, IV maior, V maior, vi menor, vii° diminuto.',
          Analogia: 'A tonalidade muda os nomes, mas os papeis continuam como uma escalação fixa de time.',
          'Exemplo visual': ['C: C Dm Em F G Am Bdim', 'G: G Am Bm C D Em F#dim', 'Formula: M m m M M m dim'],
          'Exercicio guiado': 'Para G maior, escreva as notas G A B C D E F#. Depois aplique M m m M M m dim.',
          Desafio: 'Monte C maior e G maior seguindo a mesma formula.',
          Resumo: ['Campo maior tem qualidade fixa.', 'I, IV e V sao maiores.', 'ii, iii e vi sao menores.', 'vii° e diminuto.'],
        }),
        xpReward: 10,
        sortOrder: 3,
      },
      {
        title: 'Funções Harmônicas',
        description: 'Tensão e repouso',
        content: lessonContent({
          Objetivo: 'Entender tônica, subdominante e dominante como papeis de movimento.',
          Conceito: 'Função harmonica descreve o papel de um acorde. Tônica soa como repouso. Subdominante cria saida. Dominante cria tensão e vontade de voltar.',
          Analogia: 'Pense em casa, passeio e caminho de volta: tônica e casa, subdominante sai de casa, dominante pede retorno.',
          'Exemplo visual': ['Tônica: I, vi, iii', 'Subdominante: IV, ii', 'Dominante: V, vii°', 'Em C: C repousa, F afasta, G pede volta.'],
          'Exercicio guiado': 'Toque mentalmente C -> F -> G -> C. Sinta saida, tensão e retorno.',
          Desafio: 'Qual acorde tem função dominante em C maior? Resposta: G.',
          Resumo: ['Tônica = repouso.', 'Subdominante = afastamento.', 'Dominante = tensão/retorno.', 'Funções ajudam a entender progressões.'],
        }),
        xpReward: 10,
        sortOrder: 4,
      },
      {
        title: 'Progressões Harmônicas',
        description: 'Sequências',
        content: lessonContent({
          Objetivo: 'Ler progressões como sequencias de graus do campo harmonico.',
          Conceito: 'Progressão harmonica e uma sequencia de acordes. Progressões famosas usam graus, como I-V-vi-IV, para funcionar em qualquer tonalidade.',
          Analogia: 'E como uma rota: voce pode fazer o mesmo caminho em cidades diferentes. Os nomes das ruas mudam, mas a ordem dos passos permanece.',
          'Exemplo visual': ['I-IV-V em C = C F G', 'I-V-vi-IV em C = C G Am F', 'ii-V-I em C = Dm G C'],
          'Exercicio guiado': 'Pegue I-V-vi-IV em C maior. Substitua cada grau pelo acorde: C, G, Am, F.',
          Desafio: 'Transforme I-IV-V em G maior: G, C, D.',
          Resumo: ['Progressões sao sequencias de acordes.', 'Graus permitem transpor tonalidades.', 'I-V-vi-IV aparece em muitas musicas.', 'ii-V-I e muito usado em harmonia.'],
        }),
        xpReward: 50,
        sortOrder: 5,
      },
      {
        title: 'Avaliação Final',
        description: 'Teste seu dominio',
        content: lessonContent({
          Objetivo: 'Validar campo maior, graus, funções e progressões simples.',
          Conceito: 'A avaliacao confirma se voce consegue montar campos harmonicos e entender o papel dos acordes.',
          'Antes de comecar': ['Formula: M m m M M m dim.', 'C maior: C Dm Em F G Am Bdim.', 'G maior: G Am Bm C D Em F#dim.', 'Tônica repousa; dominante pede retorno.'],
          Desafio: 'Monte os sete graus com atenção na ordem e na qualidade.',
          Resumo: ['Campo harmonico conecta escalas e acordes.', 'Graus explicam progressões.', 'Funções mostram tensão e repouso.', 'Este modulo prepara aplicação musical.'],
        }),
        xpReward: 100,
        sortOrder: 6,
      },
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
        lessonOrder: 1,
        type: 'multiple_choice',
        prompt: 'O que e campo harmonico?',
        payload: {
          options: ['A familia de acordes criada por uma escala', 'Uma lista de BPMs', 'Uma nota isolada', 'Um tipo de ritmico'],
          correctAnswer: 'A familia de acordes criada por uma escala',
          feedback: 'Campo harmonico e o conjunto de acordes gerados pelas notas de uma escala.',
        },
      },
      {
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'No campo maior, qual grau costuma ser dominante?',
        payload: {
          options: ['V', 'I', 'vi', 'ii'],
          correctAnswer: 'V',
          feedback: 'O V grau tem função dominante e cria vontade de voltar para o I.',
        },
      },
      {
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'No campo maior, qual grau costuma ser tônica?',
        payload: {
          options: ['I', 'V', 'vii', 'iii'],
          correctAnswer: 'I',
          feedback: 'O I grau e a tônica: a sensação de casa e repouso principal do campo.',
        },
      },
      {
        lessonOrder: 3,
        type: 'harmonic_field_builder',
        prompt: 'Monte o campo harmônico de C',
        payload: {
          key: 'C',
          answer: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
          feedback: 'C maior segue M m m M M m dim: C, Dm, Em, F, G, Am, Bdim.',
        },
      },
      {
        lessonOrder: 3,
        type: 'harmonic_field_builder',
        prompt: 'Monte o campo harmônico de G',
        payload: {
          key: 'G',
          answer: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
          feedback: 'G maior segue a mesma formula: G, Am, Bm, C, D, Em, F#dim.',
        },
      },
      {
        lessonOrder: 4,
        type: 'multiple_choice',
        prompt: 'Em C maior, qual acorde tem função dominante principal?',
        payload: {
          options: ['G', 'C', 'Am', 'F'],
          correctAnswer: 'G',
          feedback: 'Em C maior, G e o V grau. Ele cria tensão que costuma resolver em C.',
        },
      },
      {
        lessonOrder: 4,
        type: 'multiple_choice',
        prompt: 'Em G maior, qual acorde tem função subdominante?',
        payload: {
          options: ['C', 'G', 'D', 'Em'],
          correctAnswer: 'C',
          feedback: 'Em G maior, C e o IV grau. O IV costuma ter função subdominante.',
        },
      },
      {
        lessonOrder: 5,
        type: 'multiple_choice',
        prompt: 'Qual progressão corresponde a I-V-vi-IV em C maior?',
        payload: {
          options: ['C G Am F', 'C F G Am', 'Dm G C F', 'G Am F C'],
          correctAnswer: 'C G Am F',
          feedback: 'Em C maior: I=C, V=G, vi=Am, IV=F.',
        },
      },
      {
        lessonOrder: 5,
        type: 'multiple_choice',
        prompt: 'Qual progressão corresponde a I-IV-V em G maior?',
        payload: {
          options: ['G C D', 'C D G', 'G Am Bm', 'D C G'],
          correctAnswer: 'G C D',
          feedback: 'Em G maior: I=G, IV=C, V=D.',
        },
      },
      {
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Qual formula de qualidades do campo maior esta correta?',
        payload: {
          options: ['M m m M M m dim', 'M M M m m dim M', 'm M m M dim M m', 'M m dim m M M m'],
          correctAnswer: 'M m m M M m dim',
          feedback: 'Todo campo harmonico maior segue: maior, menor, menor, maior, maior, menor, diminuto.',
        },
      },
      {
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Qual acorde é o vi grau em C maior?',
        payload: {
          options: ['Am', 'C', 'F', 'G'],
          correctAnswer: 'Am',
          feedback: 'No campo de C maior: C, Dm, Em, F, G, Am, Bdim. O vi grau e Am.',
        },
      },
      {
        lessonOrder: 6,
        type: 'harmonic_field_builder',
        prompt: 'Avaliação: monte o campo harmônico de F',
        payload: {
          key: 'F',
          answer: ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
          feedback: 'F maior segue M m m M M m dim: F, Gm, Am, Bb, C, Dm, Edim.',
        },
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
      {
        title: 'Analisando uma música',
        description: 'Visão geral',
        content: lessonContent({
          Objetivo: 'Aprender a observar uma musica por partes: tom, escala, acordes, ritmo e progressao.',
          Conceito: 'Analisar uma musica e desmontar sua estrutura para entender como ela funciona. Em vez de ouvir tudo como uma massa unica, voce procura padroes.',
          Analogia: 'E como olhar uma receita pronta e descobrir quais ingredientes foram usados.',
          'Exemplo visual': ['Tom: C maior', 'Progressao: C G Am F', 'Ritmo: pulso em 4/4'],
          'Exercicio guiado': 'Pegue a progressao C G Am F. Pergunte: qual acorde parece casa? Qual acorde cria movimento?',
          Desafio: 'Escolha uma musica simples e tente identificar se ela parece estar em maior ou menor.',
          Resumo: ['Analise musical junta todos os módulos anteriores.', 'Tom indica centro.', 'Acordes mostram harmonia.', 'Progressões mostram movimento.'],
        }),
        xpReward: 10,
        sortOrder: 1,
      },
      {
        title: 'Encontrando o Tom',
        description: 'Qual a chave?',
        content: lessonContent({
          Objetivo: 'Entender tom como centro de repouso da musica.',
          Conceito: 'O tom e a nota ou acorde que parece casa. Muitas musicas terminam ou repousam no acorde do tom.',
          Analogia: 'Durante uma viagem, voce pode passar por muitos lugares, mas casa e onde a sensacao resolve.',
          'Exemplo visual': ['Em C maior, C costuma soar como casa.', 'Em G maior, G costuma soar como casa.', 'A progressao C G Am F geralmente aponta para C.'],
          'Exercicio guiado': 'Olhe a progressao C F G C. O acorde C aparece como inicio e retorno; isso sugere tom de C.',
          Desafio: 'Em G C D G, qual acorde parece casa? Resposta: G.',
          Resumo: ['Tom e centro musical.', 'O acorde I costuma soar como repouso.', 'O final da progressao pode dar pistas.', 'Campo harmonico ajuda a confirmar o tom.'],
        }),
        xpReward: 10,
        sortOrder: 2,
      },
      {
        title: 'Identificando Escalas',
        description: 'Qual usar?',
        content: lessonContent({
          Objetivo: 'Relacionar tom e escala provavel.',
          Conceito: 'Se a musica esta em C maior, a escala de C maior costuma ser o primeiro mapa de notas. Se esta em G maior, use G maior como mapa inicial.',
          Analogia: 'A escala e o mapa da cidade; o tom diz qual cidade voce esta visitando.',
          'Exemplo visual': ['Tom C maior -> escala C D E F G A B', 'Tom G maior -> escala G A B C D E F#', 'Tom D maior -> escala D E F# G A B C#'],
          'Exercicio guiado': 'Se os acordes sao C, F, G e Am, todos cabem em C maior.',
          Desafio: 'Qual escala combina com G, C, D e Em? Resposta: G maior.',
          Resumo: ['Tom sugere escala.', 'Acordes do campo confirmam a escala.', 'Escala vira mapa para melodias.', 'Nem toda musica fica presa a uma escala, mas esse e o primeiro passo.'],
        }),
        xpReward: 10,
        sortOrder: 3,
      },
      {
        title: 'Identificando Acordes',
        description: 'Harmonia',
        content: lessonContent({
          Objetivo: 'Mapear acordes e reconhecer seus graus.',
          Conceito: 'Identificar acordes e perguntar qual papel cada um exerce no tom. Em C maior, C e I, F e IV, G e V, Am e vi.',
          Analogia: 'Os acordes sao personagens; os graus dizem o papel de cada personagem na historia.',
          'Exemplo visual': ['C = I', 'G = V', 'Am = vi', 'F = IV'],
          'Exercicio guiado': 'Na progressao C G Am F, substitua nomes por graus: I V vi IV.',
          Desafio: 'Em G D Em C, quais sao os graus em G maior? I V vi IV.',
          Resumo: ['Acordes podem ser lidos por nomes ou graus.', 'Graus facilitam transposicao.', 'Progressões famosas aparecem em muitos tons.', 'Identificar graus revela a estrutura.'],
        }),
        xpReward: 10,
        sortOrder: 4,
      },
      {
        title: 'Montando Progressões',
        description: 'Prática',
        content: lessonContent({
          Objetivo: 'Criar progressões simples usando graus do campo harmonico.',
          Conceito: 'Uma progressão combina acordes em uma ordem. I-IV-V soa direto e classico. I-V-vi-IV soa familiar em muitas musicas populares.',
          Analogia: 'E como montar uma frase com palavras que ja pertencem ao mesmo idioma.',
          'Exemplo visual': ['I-IV-V em C = C F G', 'I-V-vi-IV em C = C G Am F', 'ii-V-I em C = Dm G C'],
          'Exercicio guiado': 'Escolha C maior e monte I-V-vi-IV: C, G, Am, F.',
          Desafio: 'Monte I-IV-V em G maior: G, C, D.',
          Resumo: ['Progressão e sequencia de acordes.', 'Use graus para pensar melhor.', 'I, IV, V e vi sao muito comuns.', 'Progressões criam expectativa e retorno.'],
        }),
        xpReward: 50,
        sortOrder: 5,
      },
      {
        title: 'Criando acompanhamentos',
        description: 'Tocando junto',
        content: lessonContent({
          Objetivo: 'Entender acompanhamento como repetição ritmica de acordes.',
          Conceito: 'Acompanhamento e tocar acordes em um ritmo para sustentar a musica. Mesmo sem instrumento real, voce pode planejar a ordem dos acordes e o pulso.',
          Analogia: 'Se a melodia e a voz principal, o acompanhamento e o corpo que segura a musica de pé.',
          'Exemplo visual': ['C | G | Am | F', 'Um acorde por compasso', 'Pulso: 1 2 3 4'],
          'Exercicio guiado': 'Imagine C por quatro tempos, depois G por quatro, Am por quatro e F por quatro.',
          Desafio: 'Crie uma progressao de quatro acordes usando o campo de C maior.',
          Resumo: ['Acompanhamento junta acordes e ritmo.', 'Um acorde por compasso e um bom começo.', 'Progressões simples ja soam musicais.', 'Controle de pulso evita bagunca.'],
        }),
        xpReward: 50,
        sortOrder: 6,
      },
      {
        title: 'Avaliação Final',
        description: 'Teste seu dominio',
        content: lessonContent({
          Objetivo: 'Validar leitura de tom, escala, graus e progressões simples.',
          Conceito: 'A avaliação confirma se voce consegue transformar teoria em leitura musical pratica.',
          'Antes de comecar': ['C G Am F = I V vi IV em C.', 'G C D = I IV V em G.', 'Tom e o centro de repouso.', 'Escala e o mapa de notas.'],
          Desafio: 'Leia cada progressao como graus, nao apenas como nomes soltos.',
          Resumo: ['Aplicação musical junta tudo.', 'Acordes viram progressões.', 'Progressões indicam movimento.', 'Analise deixa musicas reais menos misteriosas.'],
        }),
        xpReward: 100,
        sortOrder: 7,
      },
    ];

    for (const lesson of module7Lessons) {
      await upsertLesson(client, module7Id, lesson);
    }

    const lessonsMod7Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module7Id],
    );
    const lesson7IdByOrder = new Map(lessonsMod7Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));
    const module7Exercises: SeedExercise[] = [
      {
        lessonOrder: 1,
        type: 'multiple_choice',
        prompt: 'O que significa analisar uma musica?',
        payload: {
          options: ['Entender suas partes e padroes', 'Aumentar o BPM sempre', 'Trocar todas as notas por sustenidos', 'Tocar sem ouvir'],
          correctAnswer: 'Entender suas partes e padroes',
          feedback: 'Analisar e separar tom, acordes, ritmo e progressao para entender como a musica funciona.',
        },
      },
      {
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'Na progressao C F G C, qual acorde parece casa?',
        payload: {
          options: ['C', 'F', 'G', 'Am'],
          correctAnswer: 'C',
          feedback: 'C aparece como partida e retorno, sugerindo tom de C maior.',
        },
      },
      {
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'Na progressão G C D G, qual acorde parece casa?',
        payload: {
          options: ['G', 'C', 'D', 'Em'],
          correctAnswer: 'G',
          feedback: 'G abre e fecha a progressao, criando sensacao de retorno. Isso sugere G como tônica.',
        },
      },
      {
        lessonOrder: 3,
        type: 'multiple_choice',
        prompt: 'Qual escala combina primeiro com os acordes G, C, D e Em?',
        payload: {
          options: ['G maior', 'C# maior', 'F menor', 'B diminuto'],
          correctAnswer: 'G maior',
          feedback: 'G, C, D e Em pertencem ao campo harmonico de G maior.',
        },
      },
      {
        lessonOrder: 4,
        type: 'multiple_choice',
        prompt: 'Em C maior, a progressao C G Am F vira quais graus?',
        payload: {
          options: ['I V vi IV', 'I IV V vi', 'ii V I IV', 'V vi IV I'],
          correctAnswer: 'I V vi IV',
          feedback: 'Em C maior: C=I, G=V, Am=vi e F=IV.',
        },
      },
      {
        lessonOrder: 4,
        type: 'multiple_choice',
        prompt: 'Em G maior, a progressao G D Em C vira quais graus?',
        payload: {
          options: ['I V vi IV', 'I IV V vi', 'V I vi IV', 'vi IV I V'],
          correctAnswer: 'I V vi IV',
          feedback: 'Em G maior: G=I, D=V, Em=vi e C=IV.',
        },
      },
      {
        lessonOrder: 5,
        type: 'multiple_choice',
        prompt: 'Qual progressao e I-IV-V em G maior?',
        payload: {
          options: ['G C D', 'C G D', 'G D Em', 'D G C'],
          correctAnswer: 'G C D',
          feedback: 'Em G maior: I=G, IV=C, V=D.',
        },
      },
      {
        lessonOrder: 6,
        type: 'rhythm_tap',
        prompt: 'Marque um acorde por tempo forte em 4/4',
        payload: {
          bpm: 76,
          pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          feedback: 'Este exercicio simula trocar ou marcar acorde no tempo 1 do compasso.',
        },
      },
      {
        lessonOrder: 7,
        type: 'multiple_choice',
        prompt: 'Qual frase resume melhor aplicação musical?',
        payload: {
          options: ['Usar notas, ritmo, escalas e acordes para entender musicas reais', 'Decorar nomes sem ouvir', 'Ignorar progressões', 'Usar apenas uma nota'],
          correctAnswer: 'Usar notas, ritmo, escalas e acordes para entender musicas reais',
          feedback: 'Aplicação musical junta os fundamentos para ler, criar e acompanhar musicas.',
        },
      },
      {
        lessonOrder: 7,
        type: 'multiple_choice',
        prompt: 'Ao analisar uma música simples, qual caminho e mais musical?',
        payload: {
          options: ['Achar tom, progressão, ritmo e pontos de repouso', 'Decorar apenas a primeira nota', 'Ignorar os acordes e olhar so BPM', 'Trocar todo acorde por C'],
          correctAnswer: 'Achar tom, progressão, ritmo e pontos de repouso',
          feedback: 'Aplicar teoria significa juntar pistas: tom, acordes, ritmo, tensão e repouso.',
        },
      },
      {
        lessonOrder: 7,
        type: 'rhythm_tap',
        prompt: 'Avaliação aplicada: marque trocas em I-V-vi-IV',
        payload: {
          bpm: 72,
          pattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
          feedback: 'Este desenho simula uma troca de acorde por tempo forte. O foco e manter a progressao organizada no pulso.',
        },
      },
    ];

    await syncModuleExercises(client, module7Id, lesson7IdByOrder, module7Exercises);

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
      {
        title: 'Reconhecimento de Notas',
        description: 'Ouvido absoluto e relativo',
        content: lessonContent({
          Objetivo: 'Começar a associar sons a nomes de notas.',
          Conceito: 'Treino auditivo transforma teoria em escuta. No começo, o objetivo nao e ter ouvido perfeito, mas criar referencias.',
          Analogia: 'E como reconhecer vozes de pessoas conhecidas. Com repetição, o ouvido cria memoria.',
          'Exemplo visual': ['Ouvir C', 'Comparar com D', 'Escolher a opcao mais provavel'],
          'Exercicio guiado': 'Toque o audio simulado, escolha uma opcao e leia o feedback.',
          Desafio: 'Nao chute rapido. Ouça, compare e responda.',
          Resumo: ['Ouvido melhora com repetição.', 'Comparar e mais importante que adivinhar.', 'Notas viram referencias internas.'],
        }),
        xpReward: 50,
        sortOrder: 1,
      },
      {
        title: 'Reconhecimento de Intervalos',
        description: 'Distâncias',
        content: lessonContent({
          Objetivo: 'Perceber intervalos como distancias sonoras.',
          Conceito: 'Intervalos nao sao apenas contagem no papel. Eles possuem sensacao auditiva: segunda soa proxima, oitava soa como mesma nota em outra altura.',
          Analogia: 'E como reconhecer o tamanho de um salto sem medir com regua.',
          'Exemplo visual': ['C para D = perto', 'C para G = salto maior', 'C para C = oitava'],
          'Exercicio guiado': 'Ao ouvir duas notas, pergunte se parecem vizinhas ou distantes.',
          Desafio: 'Relacione a teoria de intervalos com a sensacao sonora.',
          Resumo: ['Intervalos tem som proprio.', 'Ouvido relativo compara distancias.', 'Essa habilidade ajuda melodias e acordes.'],
        }),
        xpReward: 50,
        sortOrder: 2,
      },
      {
        title: 'Reconhecimento de Escalas',
        description: 'Cores musicais',
        content: lessonContent({
          Objetivo: 'Diferenciar a sensacao geral de escalas.',
          Conceito: 'Escalas criam cores. A escala maior costuma soar aberta e estavel; a menor costuma soar mais fechada ou introspectiva.',
          Analogia: 'E como perceber se uma imagem esta clara ou sombria antes de identificar cada detalhe.',
          'Exemplo visual': ['Maior: sensacao aberta', 'Menor: sensacao mais fechada', 'Relativas compartilham notas, mas mudam centro.'],
          'Exercicio guiado': 'Ouça e pergunte: essa sequencia parece repousar em um centro maior ou menor?',
          Desafio: 'Compare C maior e A menor lembrando que usam as mesmas notas.',
          Resumo: ['Escalas tem cor.', 'Centro tonal muda a sensacao.', 'Maior/menor e uma primeira classificacao util.'],
        }),
        xpReward: 50,
        sortOrder: 3,
      },
      {
        title: 'Reconhecimento de Acordes',
        description: 'Tríades',
        content: lessonContent({
          Objetivo: 'Reconhecer diferenças de cor entre acordes maiores, menores, diminutos e aumentados.',
          Conceito: 'Acordes possuem identidade auditiva. Maior e menor diferem pela terça; diminuto e aumentado mudam a quinta e criam mais tensão.',
          Analogia: 'E como reconhecer sabores: doce, amargo, acido. Cada acorde tem uma cor.',
          'Exemplo visual': ['Maior: 1 3 5', 'Menor: 1 b3 5', 'Diminuto: 1 b3 b5', 'Aumentado: 1 3 #5'],
          'Exercicio guiado': 'Compare C maior com C menor: a nota do meio muda a sensacao.',
          Desafio: 'Ao ouvir um acorde, pergunte primeiro: parece maior ou menor?',
          Resumo: ['Acordes tem cor auditiva.', 'Terça define maior/menor.', 'Quinta alterada cria tensão.', 'Ouvir acordes ajuda a tirar musicas.'],
        }),
        xpReward: 50,
        sortOrder: 4,
      },
      {
        title: 'Reconhecimento de Progressões',
        description: 'Sequências',
        content: lessonContent({
          Objetivo: 'Ouvir movimento harmonico como saida, tensão e retorno.',
          Conceito: 'Progressões contam uma pequena historia. I soa como casa, IV afasta, V cria retorno, vi muda a cor.',
          Analogia: 'E como uma cena: inicio, conflito e resolução.',
          'Exemplo visual': ['I-IV-V-I = casa, saida, tensão, casa', 'I-V-vi-IV = progressao pop comum', 'ii-V-I = retorno forte'],
          'Exercicio guiado': 'Leia C F G C e imagine repouso, afastamento, tensão e retorno.',
          Desafio: 'Tente reconhecer quando uma progressao parece voltar para casa.',
          Resumo: ['Progressões tem movimento.', 'Funções harmonicas ajudam a ouvir esse movimento.', 'Reconhecer progressões conecta teoria a musicas reais.'],
        }),
        xpReward: 50,
        sortOrder: 5,
      },
      {
        title: 'Avaliação Final',
        description: 'Teste seu dominio',
        content: lessonContent({
          Objetivo: 'Revisar notas, intervalos, escalas, acordes e progressões pelo ouvido.',
          Conceito: 'Treino auditivo fecha a jornada inicial porque transforma conhecimento visual em percepção sonora.',
          'Antes de comecar': ['Ouça antes de responder.', 'Compare opções.', 'Use teoria como pista.', 'Erros mostram o que treinar mais.'],
          Desafio: 'Responda com calma e leia o feedback de cada questao.',
          Resumo: ['Ouvido e treino, nao dom magico.', 'Teoria orienta a escuta.', 'Escuta melhora prática musical real.', 'A jornada agora prepara instrumento com base solida.'],
        }),
        xpReward: 100,
        sortOrder: 6,
      },
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
        payload: {
          audio: 'note_C4.wav',
          options: ['C', 'D', 'E', 'F'],
          correctAnswer: 'C',
          feedback: 'A referencia simulada e C. Use este ponto como casa para comparar outras notas.',
        },
      },
      {
        lessonOrder: 1,
        type: 'audio_recognition',
        prompt: 'Qual nota parece mais alta que C no exemplo simulado?',
        payload: {
          audio: 'note_E4.wav',
          options: ['E', 'C', 'D', 'F'],
          correctAnswer: 'E',
          feedback: 'A referencia simulada e E. Compare com C: E aparece mais acima e ajuda a treinar direcao melodica.',
        },
      },
      {
        lessonOrder: 2,
        type: 'multiple_choice',
        prompt: 'Qual intervalo costuma soar como a mesma nota em outra altura?',
        payload: {
          options: ['Oitava', 'Segunda', 'Terça menor', 'Sétima'],
          correctAnswer: 'Oitava',
          feedback: 'A oitava repete o nome da nota em outra altura, por isso soa muito relacionada.',
        },
      },
      {
        lessonOrder: 2,
        type: 'audio_recognition',
        prompt: 'O intervalo simulado soa como quinta ou segunda?',
        payload: {
          audio: 'interval_C_G.wav',
          options: ['Quinta', 'Segunda', 'Sétima', 'Semitom'],
          correctAnswer: 'Quinta',
          feedback: 'C para G e uma quinta. Ela costuma soar aberta, estavel e muito comum em melodias e acordes.',
        },
      },
      {
        lessonOrder: 3,
        type: 'audio_recognition',
        prompt: 'A escala simulada soa maior ou menor?',
        payload: {
          audio: 'scale_major_C.wav',
          options: ['Maior', 'Menor', 'Diminuta', 'Aumentada'],
          correctAnswer: 'Maior',
          feedback: 'A escala maior costuma soar aberta e estavel.',
        },
      },
      {
        lessonOrder: 4,
        type: 'audio_recognition',
        prompt: 'Qual tipo de acorde está tocando?',
        payload: {
          audio: 'chord_C_major.wav',
          options: ['Maior', 'Menor', 'Diminuto', 'Aumentado'],
          correctAnswer: 'Maior',
          feedback: 'Acorde maior tem raiz, terça maior e quinta justa.',
        },
      },
      {
        lessonOrder: 5,
        type: 'multiple_choice',
        prompt: 'Em uma progressão, qual função cria maior vontade de voltar para casa?',
        payload: {
          options: ['Dominante', 'Tônica', 'Repouso final', 'Semibreve'],
          correctAnswer: 'Dominante',
          feedback: 'Dominante cria tensão e vontade de resolver na tônica.',
        },
      },
      {
        lessonOrder: 5,
        type: 'audio_recognition',
        prompt: 'A progressão simulada parece resolver para casa?',
        payload: {
          audio: 'progression_G_C.wav',
          options: ['Sim, dominante para tônica', 'Nao, BPM para semibreve', 'Sim, sustenido para bemol', 'Nao, escala para pausa'],
          correctAnswer: 'Sim, dominante para tônica',
          feedback: 'Uma ida de dominante para tônica costuma dar sensacao clara de resolucao.',
        },
      },
      {
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Qual atitude melhora mais o treino auditivo?',
        payload: {
          options: ['Comparar sons com calma e repetir', 'Chutar rapidamente', 'Ignorar feedback', 'Estudar apenas leitura visual'],
          correctAnswer: 'Comparar sons com calma e repetir',
          feedback: 'Treino auditivo depende de comparação, repetição e atenção ao feedback.',
        },
      },
      {
        lessonOrder: 6,
        type: 'multiple_choice',
        prompt: 'Depois de errar um reconhecimento auditivo, qual proximo passo ajuda mais?',
        payload: {
          options: ['Ouvir de novo e comparar com a referencia', 'Pular o feedback', 'Aumentar o BPM sem repetir', 'Escolher sempre a primeira opcao'],
          correctAnswer: 'Ouvir de novo e comparar com a referencia',
          feedback: 'O erro vira treino quando voce compara novamente, percebe a diferenca e cria uma referencia mais clara.',
        },
      },
      {
        lessonOrder: 6,
        type: 'audio_recognition',
        prompt: 'Avaliação auditiva: o acorde simulado e maior ou menor?',
        payload: {
          audio: 'chord_A_minor.wav',
          options: ['Menor', 'Maior', 'Aumentado', 'Diminuto'],
          correctAnswer: 'Menor',
          feedback: 'A menor tem terça menor, que tende a soar mais fechada que a terça maior.',
        },
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
