import { pool } from './pool.js';

type SeedLesson = {
  title: string;
  description: string;
  content: string;
  xpReward: number;
  sortOrder: number;
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
      await client.query(
        `
          INSERT INTO lessons (module_id, title, description, content, xp_reward, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [module1Id, lesson.title, lesson.description, lesson.content, lesson.xpReward, lesson.sortOrder],
      );
    }

    const lessonsMod1Res = await client.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM lessons WHERE module_id = $1 ORDER BY sort_order`,
      [module1Id],
    );
    const lessonIdByOrder = new Map(lessonsMod1Res.rows.map((lesson) => [lesson.sort_order, lesson.id]));

    const module1Exercises = [
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

    for (const [index, exercise] of module1Exercises.entries()) {
      const lessonId = lessonIdByOrder.get(exercise.lessonOrder);
      if (!lessonId) throw new Error(`Licao do modulo 1 nao encontrada: ${exercise.lessonOrder}`);

      await client.query(
        `
          INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
          VALUES ($1, $2, $3, $4, 20, $5)
        `,
        [lessonId, exercise.type, exercise.prompt, JSON.stringify(exercise.payload), index + 1],
      );
    }

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
