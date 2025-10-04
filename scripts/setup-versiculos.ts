import { db } from '../server/db';
import { versiculos } from '@shared/schema';

async function setupVersiculos() {
  console.log('📖 Inserindo versículos bíblicos de incentivo...\n');

  const versiculosData = [
    {
      frase: "Sede firmes e constantes, sempre abundantes na obra do Senhor, sabendo que o vosso trabalho não é vão no Senhor.",
      referencia: "1 Coríntios 15:58"
    },
    {
      frase: "Não nos cansemos de fazer o bem, porque a seu tempo colheremos, se não desfalecermos.",
      referencia: "Gálatas 6:9"
    },
    {
      frase: "Tendes necessidade de perseverança, para que, depois de haverdes feito a vontade de Deus, alcanceis a promessa.",
      referencia: "Hebreus 10:36"
    },
    {
      frase: "Feliz o homem que suporta a provação, porque, depois de ser provado, receberá a coroa da vida.",
      referencia: "Tiago 1:12"
    },
    {
      frase: "Alegres na esperança, pacientes na tribulação, perseverantes na oração.",
      referencia: "Romanos 12:12"
    },
    {
      frase: "O Filho do Homem não veio para ser servido, mas para servir e dar a sua vida em resgate por muitos.",
      referencia: "Mateus 20:28"
    },
    {
      frase: "Se eu, o Senhor e Mestre, vos lavei os pés, também vós deveis lavar os pés uns dos outros.",
      referencia: "João 13:14-15"
    },
    {
      frase: "Cada um ponha a serviço dos outros o dom que recebeu, como bons administradores da multiforme graça de Deus.",
      referencia: "1 Pedro 4:10"
    },
    {
      frase: "Tudo o que fizerdes, fazei-o de coração, como para o Senhor e não para os homens.",
      referencia: "Colossenses 3:23-24"
    },
    {
      frase: "Cada um cuide não somente dos seus interesses, mas também dos interesses dos outros. Tende em vós os mesmos sentimentos de Cristo Jesus.",
      referencia: "Filipenses 2:4-5"
    },
    {
      frase: "Sê forte e corajoso; não temas, nem te apavores, porque o Senhor teu Deus está contigo por onde quer que andares.",
      referencia: "Josué 1:9"
    },
    {
      frase: "Não temas, porque eu estou contigo; não te assombres, porque eu sou o teu Deus.",
      referencia: "Isaías 41:10"
    },
    {
      frase: "Deus não nos deu um espírito de covardia, mas de fortaleza, de amor e de moderação.",
      referencia: "2 Timóteo 1:7"
    },
    {
      frase: "O Senhor é minha luz e minha salvação: a quem temerei?",
      referencia: "Salmo 27:1"
    },
    {
      frase: "No mundo tereis aflições, mas tende coragem: eu venci o mundo.",
      referencia: "João 16:33"
    },
    {
      frase: "Fazei isto em memória de mim.",
      referencia: "Lucas 22:19"
    },
    {
      frase: "Eu sou o pão vivo que desceu do céu; quem comer deste pão viverá eternamente.",
      referencia: "João 6:51"
    },
    {
      frase: "Tomai e comei, isto é o meu corpo... bebei dele todos, porque isto é o meu sangue.",
      referencia: "Mateus 26:26-28"
    },
    {
      frase: "Todas as vezes que comerdes deste pão e beberdes deste cálice, anunciais a morte do Senhor até que Ele venha.",
      referencia: "1 Coríntios 11:26"
    },
    {
      frase: "Deus não é injusto para se esquecer da vossa obra e do amor que mostrastes para com o seu nome, servindo e perseverando em servir os santos.",
      referencia: "Hebreus 6:10"
    },
    {
      frase: "Nós amamos porque Ele nos amou primeiro.",
      referencia: "1 João 4:19"
    },
    {
      frase: "Ninguém tem maior amor do que aquele que dá a vida por seus amigos.",
      referencia: "João 15:13"
    },
    {
      frase: "Sede fervorosos de espírito, servindo ao Senhor.",
      referencia: "Romanos 12:11"
    },
    {
      frase: "Não vos esqueçais da prática do bem e da partilha, pois tais sacrifícios agradam a Deus.",
      referencia: "Hebreus 13:16"
    },
    {
      frase: "Todas as vezes que fizestes isso a um destes meus irmãos mais pequeninos, foi a mim que o fizestes.",
      referencia: "Mateus 25:40"
    },
    {
      frase: "Combati o bom combate, terminei a corrida, guardei a fé. Agora me está reservada a coroa da justiça.",
      referencia: "2 Timóteo 4:7-8"
    },
    {
      frase: "Sê fiel até a morte, e eu te darei a coroa da vida.",
      referencia: "Apocalipse 2:10"
    },
    {
      frase: "Os que semeiam entre lágrimas recolherão com alegria.",
      referencia: "Salmo 126:5"
    },
    {
      frase: "Feliz aquele servo que o Senhor, ao chegar, encontrar agindo assim.",
      referencia: "Mateus 24:46"
    },
    {
      frase: "Fiel é aquele que vos chama; Ele também o fará.",
      referencia: "1 Tessalonicenses 5:24"
    }
  ];

  try {
    // Verificar se já existem versículos
    const existing = await db.select().from(versiculos);

    if (existing.length > 0) {
      console.log(`⚠️  Já existem ${existing.length} versículos no banco de dados.`);
      console.log('   Deseja substituir? (Por enquanto, vou pular a inserção)\n');
      process.exit(0);
    }

    // Inserir todos os versículos
    for (const versiculo of versiculosData) {
      await db.insert(versiculos).values({
        frase: versiculo.frase,
        referencia: versiculo.referencia
      });
    }

    console.log(`✅ ${versiculosData.length} versículos inseridos com sucesso!\n`);

    // Mostrar alguns exemplos
    const all = await db.select().from(versiculos);
    console.log('📋 Exemplos de versículos inseridos:\n');
    all.slice(0, 3).forEach((v, idx) => {
      console.log(`${idx + 1}. "${v.frase}"`);
      console.log(`   (${v.referencia})\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inserir versículos:', error);
    process.exit(1);
  }
}

setupVersiculos();
