-- Script para popular conteúdo das lições de formação

-- Primeiro, pegar os IDs das lições existentes
-- Vamos adicionar conteúdo para a primeira lição de cada módulo

-- Lição: "O que é Liturgia?" (liturgy-module-1)
INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Introdução',
'A liturgia é o culto público da Igreja, a celebração do Mistério Pascal de Cristo. É através da liturgia que a Igreja continua a obra salvadora de Jesus Cristo, tornando presente e atuante o mistério da salvação.

A palavra "liturgia" vem do grego "leitourgia", que significa "obra pública" ou "serviço em favor do povo". Na Igreja, a liturgia é a participação no sacerdócio de Cristo, é o exercício do sacerdócio comum dos fiéis.', 1
FROM formation_lessons WHERE title = 'O que é Liturgia?' AND moduleId = 'liturgy-module-1';

INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Elementos Fundamentais',
'Os elementos fundamentais da liturgia são:

1. **A Assembleia**: O povo de Deus reunido
2. **A Palavra**: As Sagradas Escrituras proclamadas
3. **Os Sinais Sacramentais**: Água, pão, vinho, óleo, etc.
4. **As Orações**: Louvor, ação de graças, súplica
5. **Os Gestos Rituais**: Genuflexão, sinal da cruz, imposição das mãos

Todos esses elementos se unem para formar uma única ação litúrgica.', 2
FROM formation_lessons WHERE title = 'O que é Liturgia?' AND moduleId = 'liturgy-module-1';

INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'quiz', 'Teste seus conhecimentos',
'[{"question": "O que significa a palavra liturgia?", "options": ["Cerimônia religiosa", "Obra pública ou serviço em favor do povo", "Oração individual", "Leitura bíblica"], "correctAnswer": 1}]', 3
FROM formation_lessons WHERE title = 'O que é Liturgia?' AND moduleId = 'liturgy-module-1';

-- Lição: "Estrutura da Missa" (liturgy-module-2)
INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'As Partes da Missa',
'A Santa Missa está estruturada em duas grandes partes que formam um único ato de culto:

## Liturgia da Palavra
- Ritos Iniciais
- Leituras Bíblicas
- Homilia
- Profissão de Fé
- Oração Universal

## Liturgia Eucarística
- Preparação das Oferendas
- Oração Eucarística
- Rito da Comunhão
- Ritos Finais

Cada parte tem sua importância e significado próprio, mas juntas formam a celebração completa do Mistério Pascal.', 1
FROM formation_lessons WHERE title = 'Estrutura da Missa' AND moduleId = 'liturgy-module-2';

INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'video', 'Vídeo Explicativo',
'https://www.youtube.com/embed/exemplo-video-missa', 2
FROM formation_lessons WHERE title = 'Estrutura da Missa' AND moduleId = 'liturgy-module-2';

-- Lição: "Vocação do Ministro" (liturgy-module-3)
INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'O Chamado ao Ministério',
'O ministro extraordinário da Sagrada Comunhão é chamado a:

1. **Servir a comunidade**: Levar Cristo Eucarístico aos que não podem participar da assembleia
2. **Testemunhar a fé**: Ser exemplo de vida cristã em sua comunidade
3. **Viver a caridade**: Exercer o ministério com amor e dedicação
4. **Formar-se continuamente**: Aprofundar sempre mais o conhecimento da fé

Este ministério não é um privilégio, mas um serviço. O ministro é servidor, à exemplo de Cristo que veio para servir e não para ser servido.', 1
FROM formation_lessons WHERE title = 'Vocação do Ministro' AND moduleId = 'liturgy-module-3';

INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Qualidades do Ministro',
'O ministro deve cultivar:

- **Vida de oração**: Manter uma relação íntima com Deus
- **Participação ativa na comunidade**: Estar presente e atuante na paróquia
- **Formação contínua**: Buscar sempre aprender mais
- **Disponibilidade**: Estar pronto para servir quando necessário
- **Humildade**: Reconhecer-se como instrumento de Deus
- **Reverência**: Tratar o Santíssimo Sacramento com todo respeito e devoção', 2
FROM formation_lessons WHERE title = 'Vocação do Ministro' AND moduleId = 'liturgy-module-3';

-- Lição: "Preparação Pessoal" (liturgy-module-3)
INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Preparação Espiritual',
'Antes de exercer o ministério, o ministro deve preparar-se espiritualmente:

## Antes da Missa
- Chegar com antecedência (pelo menos 15 minutos antes)
- Fazer uma breve oração pessoal
- Confessar-se regularmente
- Jejuar uma hora antes da comunhão

## Durante a Celebração
- Participar ativamente de toda a Missa
- Manter-se em atitude de oração e recolhimento
- Comungar com devoção e fé

## Após a Missa
- Fazer ação de graças
- Preparar-se mentalmente para a distribuição aos enfermos, se for o caso', 1
FROM formation_lessons WHERE title = 'Preparação Pessoal' AND moduleId = 'liturgy-module-3';

INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Preparação Prática',
'Aspectos práticos importantes:

1. **Vestuário adequado**: Roupa discreta e digna, evitando decotes, roupas curtas ou chamativas
2. **Higiene pessoal**: Mãos limpas, unhas cortadas, hálito fresco
3. **Pontualidade**: Chegar sempre no horário combinado
4. **Material necessário**: Conhecer onde estão as píxides, purificadores, etc.
5. **Conhecimento dos procedimentos**: Saber como proceder em cada situação

Lembre-se: você está representando Cristo e a Igreja!', 2
FROM formation_lessons WHERE title = 'Preparação Pessoal' AND moduleId = 'liturgy-module-3';

-- Lição: "Distribuição da Comunhão" (liturgy-module-3)
INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Procedimento para Distribuição',
'## Como distribuir a Sagrada Comunhão

### Preparação
1. Após o abraço da paz, dirigir-se ao altar
2. Receber a comunhão do sacerdote
3. Receber a píxide ou o cibório das mãos do sacerdote

### Durante a distribuição
1. Mostrar a hóstia ao fiel dizendo: "O Corpo de Cristo"
2. Aguardar a resposta: "Amém"
3. Entregar a hóstia com reverência
4. Se cair uma hóstia, recolhê-la imediatamente

### Após a distribuição
1. Retornar ao altar
2. Devolver o cibório ao sacerdote
3. Purificar os dedos se necessário
4. Retornar ao seu lugar', 1
FROM formation_lessons WHERE title = 'Distribuição da Comunhão' AND moduleId = 'liturgy-module-3';

INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Situações Especiais',
'## Como proceder em situações específicas:

### Comunhão na mão
- Colocar a hóstia na palma da mão do fiel
- Aguardar que comungue antes de seguir

### Comunhão por intinção (quando autorizada)
- Apenas o sacerdote ou diácono pode fazer
- O ministro extraordinário não realiza intinção

### Crianças pequenas
- Se apresentarem as mãos para comungar, perguntar se já fizeram a primeira comunhão
- Se não, fazer uma bênção (sem tocar)

### Pessoas com deficiência
- Adaptar-se à necessidade do fiel
- Ter paciência e delicadeza
- Pedir ajuda se necessário', 2
FROM formation_lessons WHERE title = 'Distribuição da Comunhão' AND moduleId = 'liturgy-module-3';

-- Lição: "Comunhão aos Enfermos" (liturgy-module-3)
INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Preparação para Visita aos Enfermos',
'## Antes da visita

### Material necessário:
- Teca ou píxide pequena
- Corporal pequeno
- Vela (se possível)
- Água benta (opcional)
- Ritual para a Comunhão dos Enfermos

### Preparação pessoal:
- Oração pela pessoa enferma
- Verificar horário adequado para a visita
- Confirmar endereço e situação do enfermo
- Levar a Eucaristia diretamente da Missa para o enfermo', 1
FROM formation_lessons WHERE title = 'Comunhão aos Enfermos' AND moduleId = 'liturgy-module-3';

INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Rito da Comunhão aos Enfermos',
'## Estrutura da celebração:

1. **Saudação inicial**: "A paz esteja nesta casa"
2. **Aspersão com água benta** (opcional)
3. **Ato penitencial** breve
4. **Leitura da Palavra** (um texto breve)
5. **Pai-Nosso**
6. **Apresentação da Eucaristia**: "Eis o Cordeiro de Deus..."
7. **Comunhão**
8. **Oração final**
9. **Bênção**

### Observações importantes:
- Adaptar o rito à condição do enfermo
- Ser breve se a pessoa estiver muito debilitada
- Envolver a família na oração quando possível
- Manter sempre a dignidade e reverência', 2
FROM formation_lessons WHERE title = 'Comunhão aos Enfermos' AND moduleId = 'liturgy-module-3';

INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'Cuidados Especiais',
'## Situações que requerem atenção:

### Pessoa inconsciente
- Não ministrar a comunhão
- Fazer uma oração e dar a bênção
- Orientar a família a chamar o sacerdote

### Dificuldade para engolir
- Partir a hóstia em fragmento menor
- Oferecer água se necessário
- Em caso de impossibilidade, não forçar

### Ambiente hospitalar
- Respeitar as normas do hospital
- Ser discreto
- Higienizar as mãos antes e depois
- Usar máscara se necessário

### Precauções de segurança
- Nunca deixar o Santíssimo sozinho
- Ir direto da igreja para o enfermo
- Retornar imediatamente após a visita
- Não fazer outras atividades durante o trajeto', 3
FROM formation_lessons WHERE title = 'Comunhão aos Enfermos' AND moduleId = 'liturgy-module-3';

-- Adicionar algumas lições para outros módulos também

-- História da Liturgia
INSERT INTO formation_lesson_sections (lessonId, type, title, content, orderIndex)
SELECT id, 'text', 'A Liturgia através dos Séculos',
'## Desenvolvimento histórico da Liturgia

### Período Apostólico (30-100 d.C.)
- Celebração nas casas
- Fração do pão
- Leitura das cartas apostólicas

### Período Patrístico (100-600 d.C.)
- Formação dos ritos litúrgicos
- Construção das primeiras basílicas
- Desenvolvimento do ano litúrgico

### Idade Média (600-1500)
- Liturgia romana se expande
- Desenvolvimento do canto gregoriano
- Multiplicação das devoções

### Período Moderno (1500-1962)
- Concílio de Trento
- Uniformização da liturgia
- Missal de Pio V

### Vaticano II até hoje (1962-)
- Reforma litúrgica
- Participação ativa dos fiéis
- Uso do vernáculo
- Ministérios leigos', 1
FROM formation_lessons WHERE title = 'História da Liturgia' AND moduleId = 'liturgy-module-1';