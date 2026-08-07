require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder, 
    PermissionFlagsBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const { v2 } = require('./utils/v2.js');
const fs = require('fs');
const path = require('path');

// ---- Proteção contra instâncias duplicadas do bot ----
// Evita que o mesmo bot fique "duplicado" no Discord quando corres
// `node index.js` mais do que uma vez (ex: 2 terminais abertos, ou
// esqueceste-te de fechar a janela anterior).
const LOCK_FILE = path.join(__dirname, 'bot.lock');

function verificarInstanciaUnica() {
    if (fs.existsSync(LOCK_FILE)) {
        const pidAntigo = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
        try {
            // process.kill(pid, 0) não mata nada, só testa se o processo existe
            process.kill(pidAntigo, 0);
            console.error(`❌ Já existe uma instância deste bot a correr (PID ${pidAntigo}).`);
            console.error(`   Fecha essa janela/processo antes de abrir uma nova, ou apaga "bot.lock" se tiveres a certeza que não há nenhum a correr.`);
            process.exit(1);
        } catch (e) {
            // O PID guardado já não existe (bot.lock ficou "preso" de uma vez anterior) -> pode continuar
        }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
}

function limparLock() {
    try {
        if (fs.existsSync(LOCK_FILE)) {
            const pidNoLock = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
            if (pidNoLock === process.pid) fs.unlinkSync(LOCK_FILE);
        }
    } catch (e) {}
}

verificarInstanciaUnica();
process.on('exit', limparLock);
process.on('SIGINT', () => { limparLock(); process.exit(); });
process.on('SIGTERM', () => { limparLock(); process.exit(); });
// ---- Fim da proteção ----

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

const CONFIG = {
    CANAL_LOGS_ID: '1534491258456637531', 
    CANAL_RELATORIOS_ID: '1527002525402661046',
    
    CANAL_LOGS_IDEIAS_ID: '1532811754755850472', 
    CANAL_LOGS_SETS_ID: '1534491258456637531',
    CANAL_RECRUTAMENTO_ID: '1534853087272108152',
    CARGO_APROVAR_RECRUTAMENTO_ID: '1534491173492625479',
    CANAL_PAINEL_IDEIAS_ID: '1532811239661764739',
    CANAL_AVISOS_ID: '1527001349710024855',
    CANAL_AGENDA_ID: '1533246749249114312',
    CANAL_ANUNCIOS_ID: '1534491215771340800',

    CARGO_IDEIAS_ID: '1532811905071321218', 
    PREFIXO: '!',
    
    CARGOS_DISPONIVEIS: [
        { id_menu: 'set_coronel', nome: 'Coronel', id: '1534491177720483861', tagNick: 'Cor', desc: 'Solicitar o set de Coronel' },
        { id_menu: 'set_tcoronel', nome: 'Tenente-Coronel', id: '1534491178425254039', tagNick: 'TCel', desc: 'Solicitar o set de Tenente-Coronel' },
        { id_menu: 'set_major', nome: 'Major', id: '1534491180002185317', tagNick: 'Maj', desc: 'Solicitar o set de Major' },
        { id_menu: 'set_capitao', nome: 'Capitão', id: '1534491181050888314', tagNick: 'Cap', desc: 'Solicitar o set de Capitão' },
        { id_menu: 'set_1tenente', nome: '1º Tenente', id: '1534491183865266226', tagNick: '1Ten', desc: 'Solicitar o set de 1º Tenente' },
        { id_menu: 'set_2tenente', nome: '2º Tenente', id: '1534491184557199461', tagNick: '2Ten', desc: 'Solicitar o set de 2º Tenente' },
        { id_menu: 'set_aspirante', nome: 'Aspirante', id: '1534491185396318302', tagNick: 'Asp', desc: 'Solicitar o set de Aspirante' },
        { id_menu: 'set_1sargento', nome: '1º Sargento', id: '1534491187044552826', tagNick: '1Sgt', desc: 'Solicitar o set de 1º Sargento' },
        { id_menu: 'set_2sargento', nome: '2º Sargento', id: '1534491187808043101', tagNick: '2Sgt', desc: 'Solicitar o set de 2º Sargento' },
        { id_menu: 'set_3sargento', nome: '3º Sargento', id: '1534491188487262359', tagNick: '3Sgt', desc: 'Solicitar o set de 3º Sargento' },
        { id_menu: 'set_cabo', nome: 'Cabo', id: '1534491189296894022', tagNick: 'Cb', desc: 'Solicitar o set de Cabo' },
        { id_menu: 'set_soldado', nome: 'Soldado', id: '1534491190483750972', tagNick: 'Sd', desc: 'Solicitar o set de Soldado' },
        { id_menu: 'set_recruta', nome: 'Recruta', id: '1534491191205171381', tagNick: 'Rec', desc: 'Solicitar o set de Recruta' },
        { id_menu: 'set_core', nome: 'C.O.R.E', id: '1534491196783853568', tagNick: 'CORE', desc: 'Solicitar o set de C.O.R.E' }
    ],

    CATEGORIAS_IDEIAS: [
        { id_menu: 'ideia_evento', nome: 'Ideia de Evento', desc: 'Propor um novo evento para a comunidade' },
        { id_menu: 'ideia_acao', nome: 'Ação Policial / Ilegal', desc: 'Propor uma ação/patrulha específica' },
        { id_menu: 'ideia_melhoria', nome: 'Sugestão de Melhoria', desc: 'Propor melhorias para a organização ou cidade' }
    ],

    CATEGORIAS_AVISOS: [
        { id_menu: 'aviso_geral', nome: 'Aviso Geral', desc: 'Comunicado importante para todos' },
        { id_menu: 'aviso_urgente', nome: 'Aviso Urgente', desc: 'Alerta prioritário para a comunidade' }
    ],

    CATEGORIAS_AGENDA: [
        { id_menu: 'agenda_reuniao', nome: 'Reunião Oficial', desc: 'Agendar uma reunião com a equipa/fração' },
        { id_menu: 'agenda_evento', nome: 'Evento Programado', desc: 'Agendar data e hora para evento' }
    ],

    // ---- Configuração do comando !hierarquia ----
    // Para cada categoria, "cargos" é uma lista de IDs de cargo (roles) do Discord.
    // Todos os membros que tiverem QUALQUER um desses cargos aparecem listados nessa secção.
    // ⚠ TENS DE SUBSTITUIR os valores "COLOCA_AQUI_..." pelos IDs reais dos teus cargos!
    // Como obter o ID de um cargo: Definições do Discord > Avançado > ativar "Modo de Programador",
    // depois vai a Definições do Servidor > Cargos, clica com o botão direito no cargo > "Copiar ID do Cargo".
    CATEGORIAS_HIERARQUIA: [
        { titulo: 'CORONEL', cargos: ['1534491177720483861'] },
        { titulo: 'TENENTE-CORONEL', cargos: ['1534491178425254039'] },
        { titulo: 'MAJOR', cargos: ['1534491180002185317'] },
        { titulo: 'CAPITÃO', cargos: ['1534491181050888314'] },
        { titulo: '1º TENENTE', cargos: ['1534491183865266226'] },
        { titulo: '2º TENENTE', cargos: ['1534491184557199461'] },
        { titulo: 'ASPIRANTE', cargos: ['1534491185396318302'] },
        { titulo: 'SUB-TENENTE', cargos: ['1534491186251956275'] },
        { titulo: '1º SARGENTO', cargos: ['1534491187044552826'] },
        { titulo: '2º SARGENTO', cargos: ['1534491187808043101'] },
        { titulo: '3º SARGENTO', cargos: ['1534491188487262359'] },
        { titulo: 'CABO', cargos: ['1534491189296894022'] },
        { titulo: 'SOLDADO', cargos: ['1534491190483750972'] },
        { titulo: 'RECRUTA', cargos: ['1534491191205171381'] }
    ],

    EMOJIS: {
        sucesso: '<:correct:1535003452575322192>',
        aviso: '<:alerta:1535009548878745758>',
        info: '<:info:1520249612542279780>',
        cancelar: '<:errado:1535004198339608677>',
        ticket: '<:ticket:1520278432687325195>',
        // ID de emoji personalizado atualizado (válido, enviado pelo utilizador)
        auth: '<:272410anonymous:1533449386594664509>',
        // Emojis decorativos usados antes e depois de cada nome no !hierarquia.
        hierarquiaEsq: '<:AK47:1534850499948449872>',
        hierarquiaDir: '<:AK47:1534850499948449872>'
    }
};

const pedidosPendentes = new Set();
const ideiasPendentes = new Set();
const relatoriosPendentes = new Set();
const recrutamentosPendentes = new Set();
const agendaPendentes = new Set();

async function responderETemporizar(interactionOrMessage, conteudo, ephemeral = true) {
    if (interactionOrMessage.replied || interactionOrMessage.deferred) {
        const msg = await interactionOrMessage.followUp({ content: conteudo, ephemeral });
        setTimeout(() => msg.delete().catch(() => {}), 3000);
    } else if (interactionOrMessage.isChatInputCommand || interactionOrMessage.isButton || interactionOrMessage.isStringSelectMenu) {
        await interactionOrMessage.reply({ content: conteudo, ephemeral });
        setTimeout(() => interactionOrMessage.deleteReply().catch(() => {}), 3000);
    } else {
        const rep = await interactionOrMessage.channel.send(conteudo);
        setTimeout(() => rep.delete().catch(() => {}), 3000);
    }
}

// Os comandos deixaram de ser de barra (/) — agora são todos por prefixo (!),
// tratados no listener client.on('messageCreate', ...) mais abaixo.
// IDs dos cargos que podem aprovar/rejeitar Ideias / Ações:
const CARGOS_APROVAR_IDEIAS = [
    '1527000274038947890',
    '1527000248982175764',
    '1527000221089796236'
];

function membroPodeAprovarIdeias(member) {
    return member.roles.cache.some(role => CARGOS_APROVAR_IDEIAS.includes(role.id));
}

// Só quem tem o cargo CARGO_APROVAR_RECRUTAMENTO_ID, ou qualquer cargo posicionado
// acima dele na hierarquia de cargos do servidor (alta patente), pode aprovar/negar recrutamentos.
function membroPodeAprovarRecrutamento(member) {
    const cargoBase = member.guild.roles.cache.get(CONFIG.CARGO_APROVAR_RECRUTAMENTO_ID);
    if (!cargoBase) return false;
    return member.roles.cache.some(role => role.position >= cargoBase.position);
}

client.once('clientReady', async () => {
    console.log(`🤖 ${client.user.tag} está online e pronto a funcionar com comandos por prefixo (${CONFIG.PREFIXO})!`);

    // Apaga quaisquer comandos de barra (/) antigos que possam ter ficado registados
    // no Discord de testes anteriores, para não aparecerem duplicados nem confundirem.
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        console.log('🗑 Comandos de barra (/) antigos removidos.');
    } catch (error) {
        console.error('Erro ao remover comandos de barra antigos:', error);
    }

    try {
        const canalIdeias = client.channels.cache.get(CONFIG.CANAL_PAINEL_IDEIAS_ID);
        if (canalIdeias) {
            const options = CONFIG.CATEGORIAS_IDEIAS.map(cat => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(`· ${cat.nome}`)
                    .setDescription(cat.desc)
                    .setValue(cat.nome)
                    .setEmoji('1520278432687325195')
            );
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('menu_ideia_acao')
                .setPlaceholder('Selecione o tipo de Ideia / Ação a submeter...')
                .addOptions(options);
            const row = new ActionRowBuilder().addComponents(selectMenu);

            const payload = v2({
                content: `## <:Ideias:1533453913166975057> Submissão de Ideias e Ações\nTem alguma proposta de evento, patrulha ou melhoria para a cidade?\n\n> Utilize o menu abaixo para escolher o tipo de submissão. A Administração irá analisar e dar feedback direto!\n\n-# As propostas são avaliadas pela equipa responsável.`,
                imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
                footer: '-# NoxAssistant 2026 ©',
                accentColor: 0x5865F2
            }, [row]);
            
            const messages = await canalIdeias.messages.fetch({ limit: 5 }).catch(() => null);
            const hasBotMsg = messages && messages.some(m => m.author.id === client.user.id);
            if (!hasBotMsg) {
                await canalIdeias.send(payload);
            }
        }
    } catch (e) {
        console.error('Erro ao enviar painel automático de ideias:', e);
    }

    try {
        const canalRelatorios = client.channels.cache.get(CONFIG.CANAL_RELATORIOS_ID);
        if (canalRelatorios) {
            const rowRelatorio = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_abrir_relatorio')
                    .setLabel('📄 Abrir Formulário de Relatório')
                    .setStyle(ButtonStyle.Primary)
            );
            const payloadRelatorioPainel = v2({
                content: `## <:3128newsweather:1533484043289624697> Sistema de Relatórios\nPrecisas de reportar alguma situação, ocorrência ou pedido à Administração?\n\n> Clica no botão abaixo para abrires o formulário de relatório e preenche os dados pedidos.\n\n-# O relatório será enviado diretamente para a equipa responsável.`,
                imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
                footer: '-# NoxAssistant 2026 ©',
                accentColor: 0x5865F2
            }, [rowRelatorio]);

            const messagesRelatorios = await canalRelatorios.messages.fetch({ limit: 5 }).catch(() => null);
            const hasBotMsgRelatorios = messagesRelatorios && messagesRelatorios.some(m => m.author.id === client.user.id);
            if (!hasBotMsgRelatorios) {
                await canalRelatorios.send(payloadRelatorioPainel);
            }
        }
    } catch (e) {
        console.error('Erro ao enviar painel automático de relatórios:', e);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(CONFIG.PREFIXO)) return;

    const args = message.content.slice(CONFIG.PREFIXO.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // Apaga a mensagem do comando (ex: "!ideias") do canal, para não ficar lá visível
    message.delete().catch(() => {});

    // Função auxiliar para responder e apagar automaticamente após 5 segundos
    async function responderEApagar(payloadOptions) {
        const rep = await message.channel.send(payloadOptions);
        setTimeout(() => rep.delete().catch(() => {}), 3000);
        return rep;
    }

    if (commandName === 'comandos') {
        const embedGeral = new EmbedBuilder()
            .setTitle('📋 Lista de Comandos Disponíveis')
            .setColor(0x5865F2)
            .setDescription(`Aqui estão todos os comandos (\`${CONFIG.PREFIXO}\`) que podes utilizar:`)
            .addFields(
                { name: '<:people:1535221492520976384> Geral / Membros', value: '`!comandos` - Mostra esta lista\n`!relatorio` - Abre formulário de relatório\n`!sugestoes` - Envia o painel de sugestões\n`!avisos` - Envia o painel de avisos\n`!agenda` - Envia o painel de agenda\n`!hierarquia` - Mostra a hierarquia da organização' },
                { name: '🛡 Gestão de Cargos & Staff', value: '`!pedirset` - Envia o painel de sets (Admin)\n`!recrutamento` - Envia o painel de registo de recrutamento (Admin)\n`!anuncios` - Envia o botão de criar anúncio (Admin)\n`!reuniao` - Envia aviso de reunião por DM (Admin)\n`!clear [1-99]` - Limpa mensagens (Moderadores)' }
            )
            .setFooter({ text: 'NoxAssistant 2026 ©' });

        const embedStaff = new EmbedBuilder()
            .setTitle('👑 COMANDOS STAFF (In-Game)')
            .setColor(0xF1C40F)
            .addFields(
                {
                    name: '👑 ADMIN 1',
                    value: '`/status2` - Ver o status de todos os jogadores na cidade\n`/energetico` - energetico infinito em si mesmo\n`/emote2` - Forçar jogador a usar uma animação\n`/derrubar` - Derrubar jogador\n`/setmochila` - Aumentar mochila de jogador\n`/mochilareset` - Resetar mochila de jogador\n`/limparinv` - Limpar inventário de jogador\n`/carcolor` - Alterar cor do veículo\n`/addnitro` - Adicionar nitro ao veículo\n`/item` - Criar item no inventário\n`/kickall` - Expulsar todos da cidade\n`/tuning` - Tunar veículo automaticamente\n`/gem` - Adicionar gemas\n`/remgem` - Remover gemas\n`/money` - Spawnar dinheiro\n`/rdinheiro` - Remover dinheiro do banco\n`/blindado` - Blindar veículo\n`/copiarroupa` - Copiar roupa de jogador\n`/addfuel` - Adicionar gasolina\n`/resetp` - Resetar aparência do personagem\n`/spawn` - Voltar para o spawn'
                },
                {
                    name: '👑 ADMIN 2',
                    value: '`/mundo` - Alterar sua dimensão\n`/mundo2` - Alterar dimensão de outro jogador\n`/god2` - Dar god em área\n`/good` - Recuperar vida, fome, sede e colete\n`/kick` - Expulsar jogador da cidade\n`/ban` - Banir jogador\n`/unban` - Remover ban\n`/car` - Spawnar veículo'
                },
                {
                    name: '👑 ADMIN 3',
                    value: '`/tpcds` - Teleportar para coordenadas\n`/group` - Adicionar grupo a jogador\n`/ungroup` - Remover grupo de jogador\n`/fix` - Reparar veículo\n`/vergroups` - Ver grupos'
                },
                {
                    name: '👑 ADMIN 4',
                    value: '`/god` - Dar god em si mesmo ou jogador\n`/nc` - Ativar noclip\n`/tptome` - Puxar jogador até você\n`/tpto` - Ir até jogador\n`/tpway` - Teleportar para waypoint\n`/debug2` - Ver hash dos props\n`/limparea` - Limpar objetos e marcas da área\n`/dv` - Deletar veículo'
                }
            )
            .setFooter({ text: 'NoxAssistant 2026 ©' });

        return message.channel.send({ embeds: [embedGeral, embedStaff] });
    }

    if (commandName === 'relatorio') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_abrir_relatorio')
                .setLabel('📄 Abrir Formulário de Relatório')
                .setStyle(ButtonStyle.Primary)
        );
        const payload = v2({
            content: `## 📄 Sistema de Relatórios\nPrecisas de reportar alguma situação, ocorrência ou pedido à Administração?\n\n> Clica no botão abaixo para abrires o formulário de relatório e preenche os dados pedidos.\n\n-# O relatório será enviado diretamente para a equipa responsável.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0x5865F2
        }, [row]);

        const canalLogsAlvo = message.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
        if (!canalLogsAlvo) { return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de logs não está configurado.` }); }
        await canalLogsAlvo.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de relatório enviado com sucesso!` });
    }

    if (commandName === 'hierarquia') {
        await message.guild.members.fetch().catch(() => {}); // garante que a cache de membros está atualizada

        let conteudo = '# HIERARQUIA\n\n';
        for (const categoria of CONFIG.CATEGORIAS_HIERARQUIA) {
            conteudo += `**${categoria.titulo}**\n`;

            const membrosCategoria = message.guild.members.cache.filter(m =>
                categoria.cargos.some(cargoId => m.roles.cache.has(cargoId))
            );

            if (membrosCategoria.size === 0) {
                conteudo += `...\n`;
            } else {
                membrosCategoria.forEach(membro => {
                    conteudo += `${CONFIG.EMOJIS.hierarquiaEsq} ${membro} ${CONFIG.EMOJIS.hierarquiaDir}\n`;
                });
            }
            conteudo += '\n';
        }

        // Discord limita mensagens a 2000 caracteres — se a hierarquia for grande, divide em várias mensagens.
        const blocos = conteudo.trim().match(/[\s\S]{1,1900}(\n|$)/g) || [conteudo.trim()];
        for (const bloco of blocos) {
            await message.channel.send({ content: bloco.trim() });
        }
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Hierarquia enviada com sucesso!` });
    }

    if (commandName === 'sugestoes') {
        const canalAlvo = message.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
        if (!canalAlvo) { return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de logs não está configurado.` }); }
        const optionsMenu = CONFIG.CATEGORIAS_IDEIAS.map(cat =>
            new StringSelectMenuOptionBuilder()
                .setLabel(`· ${cat.nome}`)
                .setDescription(cat.desc)
                .setValue(cat.nome)
                .setEmoji('1520278432687325195')
        );
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu_ideia_acao')
            .setPlaceholder('Selecione o tipo de Ideia / Ação a submeter...')
            .addOptions(optionsMenu);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const payload = v2({
            content: `## 💡・sᴜɢᴇsᴛᴏᴇs\nTem alguma proposta de evento, patrulha ou melhoria para a cidade?\n\n> Utilize o menu abaixo para escolher o tipo de submissão. A Administração irá analisar e dar feedback direto!\n\n-# As propostas são avaliadas pela equipa responsável.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0x5865F2
        }, [row]);

        await canalAlvo.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de sugestões enviado com sucesso!` });
    }

    if (commandName === 'avisos') {
        const canalAlvo = message.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
        if (!canalAlvo) { return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de logs não está configurado.` }); }
        const optionsMenu = CONFIG.CATEGORIAS_AVISOS.map(cat =>
            new StringSelectMenuOptionBuilder()
                .setLabel(`· ${cat.nome}`)
                .setDescription(cat.desc)
                .setValue(cat.nome)
                .setEmoji('1520278432687325195')
        );
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu_aviso_geral')
            .setPlaceholder('Selecione o tipo de Aviso...')
            .addOptions(optionsMenu);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const payload = v2({
            content: `## 📢 Painel de Avisos Oficiais\nFique atento aos comunicados importantes da organização e da cidade!\n\n> Utilize o menu abaixo para emitir ou verificar os avisos da comunidade.\n\n-# Avisos oficiais emitidos pela Administração.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0xF1C40F
        }, [row]);

        await canalAlvo.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de avisos enviado com sucesso!` });
    }

    if (commandName === 'agenda') {
        const canalAlvo = message.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
        if (!canalAlvo) { return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de logs não está configurado.` }); }
        const optionsMenu = CONFIG.CATEGORIAS_AGENDA.map(cat =>
            new StringSelectMenuOptionBuilder()
                .setLabel(`· ${cat.nome}`)
                .setDescription(cat.desc)
                .setValue(cat.nome)
                .setEmoji('1520278432687325195')
        );
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu_agenda_geral')
            .setPlaceholder('Selecione o agendamento...')
            .addOptions(optionsMenu);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const payload = v2({
            content: `## <:36927calendar:1533450467873394789> Painel de Agenda & Eventos\nConsulte ou agende reuniões e eventos oficiais da organização.\n\n> Utilize o menu abaixo para submeter o agendamento pretendido.\n\n-# Gestão de Agenda Oficial.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0x3498DB
        }, [row]);

        await canalAlvo.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de agenda enviado com sucesso!` });
    }

    if (commandName === 'pedirset') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Apenas Administradores podem usar este comando.` });
        }
        const optionsMenu = CONFIG.CARGOS_DISPONIVEIS.map(cargo =>
            new StringSelectMenuOptionBuilder()
                .setLabel(`· ${cargo.nome}`)
                .setDescription(cargo.desc)
                .setValue(cargo.nome)
        );
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu_pedir_set')
            .setPlaceholder('Selecione o Set que desejas pedir...')
            .addOptions(optionsMenu);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const payload = v2({
            content: `## <:AK47:1534850499948449872> Solicitação de Set / Cargos\nSeja bem-vindo(a) ao sistema de solicitação da nossa cidade!\n\n> Utilize o menu abaixo para selecionar o cargo desejado. A nossa equipa de Staff irá analisar o seu pedido o mais rápido possível.\n> \n> Lembre-se de ter os seus requisitos prontos ao abrir o ticket.\n\n-# Ao selecionar, um canal privado será criado para análise da Staff.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0x2F3136
        }, [row]);

        const canalLogsAlvo = message.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
        if (!canalLogsAlvo) { return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de logs não está configurado.` }); }
        await canalLogsAlvo.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de sets enviado com sucesso!` });
    }

    if (commandName === 'anuncios') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Apenas Administradores podem usar este comando.` });
        }
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_abrir_anuncio')
                .setLabel('📢 Criar Novo Anúncio')
                .setStyle(ButtonStyle.Success)
        );
        const payload = v2({
            content: `## 📢 Painel de Anúncios\nPrecisas de comunicar algo importante a toda a comunidade?\n\n> Clica no botão abaixo para abrires o formulário e criares um novo anúncio oficial.\n\n-# O anúncio será publicado automaticamente no canal correspondente.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0xE67E22
        }, [row]);

        const canalLogsAlvo = message.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
        if (!canalLogsAlvo) { return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de logs não está configurado.` }); }
        await canalLogsAlvo.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de anúncios enviado com sucesso!` });
    }

    if (commandName === 'recrutamento') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Apenas Administradores podem usar este comando.` });
        }
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_abrir_recrutamento')
                .setLabel('📋 Registar Recrutamento')
                .setStyle(ButtonStyle.Success)
        );
        const payload = v2({
            content: `## <:cowboy:1534995010003665047> Registo de Recrutamento\nFizeste um recrutamento? Regista aqui para ficar registado no sistema!\n\n> Clica no botão abaixo e preenche os dados do recruta.\n\n-# O registo será enviado para análise da Staff.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0x2F3136
        }, [row]);

        const canalLogsAlvo = message.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
        if (!canalLogsAlvo) { return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de logs não está configurado.` }); }
        await canalLogsAlvo.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de recrutamento enviado com sucesso!` });
    }

    if (commandName === 'reuniao') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Apenas Administradores podem usar este comando.` });
        }
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_abrir_reuniao')
                .setLabel('📅 Agendar Reunião (Abrir Modal)')
                .setStyle(ButtonStyle.Success)
        );
        return responderEApagar({ content: `${CONFIG.EMOJIS.info} Clica no botão abaixo para preencher os dados da reunião:`, components: [row] });
    }

    if (commandName === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return responderEApagar({ content: `${CONFIG.EMOJIS.cancelar} Não tens permissão para limpar mensagens.` });
        }
        const amount = parseInt(args[0], 10);
        if (!amount || amount < 1 || amount > 99) {
            return responderEApagar({ content: `${CONFIG.EMOJIS.aviso} Usa \`!clear <1-99>\`, ex: \`!clear 20\`.` });
        }
        await message.channel.bulkDelete(amount, true);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} **${amount}** mensagens limpas com sucesso!` });
    }

});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isMessageComponent() && !interaction.isModalSubmit()) return;

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'menu_pedir_set') {
            if (pedidosPendentes.has(interaction.user.id)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.aviso} Sua ficha já está em revisão, aguarde uma resposta.`, flags: 64 });
            }

            const nomeCargo = interaction.values[0];
            const cargoConfig = CONFIG.CARGOS_DISPONIVEIS.find(c => c.nome === nomeCargo);
            const role = cargoConfig ? interaction.guild.roles.cache.get(cargoConfig.id) : null;
            
            if (!role) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.aviso} Não consegui encontrar o cargo **${nomeCargo}** no servidor.`, flags: 64 });
            }

            const modal = new ModalBuilder()
                .setCustomId(`modal_set_${role.id}`)
                .setTitle(`Solicitar Set: ${cargoConfig.nome}`);

            const nomeInput = new TextInputBuilder().setCustomId('input_nome').setLabel('Nome in Game').setStyle(TextInputStyle.Short).setRequired(true);
            const idInput = new TextInputBuilder().setCustomId('input_passaporte').setLabel('Passaporte / ID na cidade').setStyle(TextInputStyle.Short).setRequired(true);
            const recrutadorInput = new TextInputBuilder().setCustomId('input_recrutador').setLabel('Quem lhe recrutou?').setStyle(TextInputStyle.Short).setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(idInput),
                new ActionRowBuilder().addComponents(recrutadorInput)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'menu_ideia_acao') {
            const tipoIdeia = interaction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`modal_ideia_${tipoIdeia.replace(/\s+/g, '_')}`)
                .setTitle(`Submeter: ${tipoIdeia}`);

            const tituloIdeia = new TextInputBuilder()
                .setCustomId('input_titulo_ideia')
                .setLabel('Título da Ideia / Ação')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: Mega Evento de Corrida')
                .setRequired(true);

            const descIdeia = new TextInputBuilder()
                .setCustomId('input_desc_ideia')
                .setLabel('Explicação / Detalhes')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explique como funcionará...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(tituloIdeia),
                new ActionRowBuilder().addComponents(descIdeia)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'menu_aviso_geral') {
            const tipoAviso = interaction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`modal_aviso_${tipoAviso.replace(/\s+/g, '_')}`)
                .setTitle(`Emitir: ${tipoAviso}`);

            const tituloAviso = new TextInputBuilder()
                .setCustomId('input_titulo_aviso')
                .setLabel('Título do Aviso')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: Manutenção da Cidade')
                .setRequired(true);

            const descAviso = new TextInputBuilder()
                .setCustomId('input_desc_aviso')
                .setLabel('Mensagem do Aviso')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Insira os detalhes do aviso...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(tituloAviso),
                new ActionRowBuilder().addComponents(descAviso)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'menu_agenda_geral') {
            const tipoAgenda = interaction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`modal_agenda_${tipoAgenda.replace(/\s+/g, '_')}`)
                .setTitle(`Agendar: ${tipoAgenda}`);

            const dataAgenda = new TextInputBuilder()
                .setCustomId('input_data_agenda')
                .setLabel('Data e Hora')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: 05/06 às 21:00')
                .setRequired(true);

            const descAgenda = new TextInputBuilder()
                .setCustomId('input_desc_agenda')
                .setLabel('Descrição / Objetivo')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explique o que vai acontecer...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(dataAgenda),
                new ActionRowBuilder().addComponents(descAgenda)
            );

            await interaction.showModal(modal);
            return;
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_anuncio') {
            await interaction.deferReply({ flags: 64 });
            const tituloAnuncio = interaction.fields.getTextInputValue('input_titulo_anuncio');
            const mensagemAnuncio = interaction.fields.getTextInputValue('input_msg_anuncio');
            const canalAnuncios = interaction.guild.channels.cache.get(CONFIG.CANAL_ANUNCIOS_ID);

            if (!canalAnuncios) {
                return interaction.editReply({ content: `${CONFIG.EMOJIS.cancelar} O canal de anúncios configurado não foi encontrado.` });
            }

            const embedAnuncio = new EmbedBuilder()
                .setTitle(`📢 ${tituloAnuncio}`)
                .setDescription(mensagemAnuncio)
                .setColor(0xF1C40F)
                .setTimestamp()
                .setFooter({ text: `Anúncio publicado por ${interaction.user.tag} · NoxAssistant 2026 ©` });

            await canalAnuncios.send({ 
                content: '@everyone', 
                embeds: [embedAnuncio] 
            });
            
            return await interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} Anúncio enviado com sucesso para ${canalAnuncios}!` });
        }

        if (interaction.customId.startsWith('modal_aviso_')) {
            await interaction.deferReply({ flags: 64 });
            const tipo = interaction.customId.replace('modal_aviso_', '').replace(/_/g, ' ');
            const titulo = interaction.fields.getTextInputValue('input_titulo_aviso');
            const descricao = interaction.fields.getTextInputValue('input_desc_aviso');

            const canalAvisos = interaction.guild.channels.cache.get(CONFIG.CANAL_AVISOS_ID);
            if (!canalAvisos) {
                return interaction.editReply({ content: `${CONFIG.EMOJIS.cancelar} Canal de avisos não configurado.` });
            }

            const embedAviso = new EmbedBuilder()
                .setTitle(`📢 [${tipo.toUpperCase()}] ${titulo}`)
                .setDescription(descricao)
                .setColor(0xF1C40F)
                .setTimestamp()
                .setFooter({ text: `Emitido por ${interaction.user.tag} · NoxAssistant 2026 ©` });

            await canalAvisos.send({ embeds: [embedAviso] });
            return await interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} Aviso enviado com sucesso para ${canalAvisos}!` });
        }

        if (interaction.customId.startsWith('modal_agenda_')) {
            await interaction.deferReply({ flags: 64 });
            const tipo = interaction.customId.replace('modal_agenda_', '').replace(/_/g, ' ');
            const dataHora = interaction.fields.getTextInputValue('input_data_agenda');
            const descricao = interaction.fields.getTextInputValue('input_desc_agenda');

            const canalAgenda = interaction.guild.channels.cache.get(CONFIG.CANAL_AGENDA_ID);
            if (!canalAgenda) {
                return interaction.editReply({ content: `${CONFIG.EMOJIS.cancelar} Canal de agenda não configurado.` });
            }

            const agendaId = `${interaction.user.id}_${Date.now()}`;
            agendaPendentes.add(agendaId);

            const embedAgenda = new EmbedBuilder()
                .setTitle(`📅 [AGENDA] ${tipo}`)
                .addFields(
                    { name: '<:1f557:1535298038225047584> Data e Hora', value: `\`${dataHora}\``, inline: false },
                    { name: '<:New:1535296381000876112> Detalhes', value: descricao, inline: false }
                )
                .setColor(0x3498DB)
                .setTimestamp()
                .setFooter({ text: `Agendado por ${interaction.user.tag} · NoxAssistant 2026 ©` });

            const rowAgenda = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprovar_agenda_${agendaId}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`negar_agenda_${agendaId}`).setLabel('Negar').setEmoji('❌').setStyle(ButtonStyle.Danger)
            );

            const agendaMsg = await canalAgenda.send({ embeds: [embedAgenda], components: [rowAgenda] });

            return await interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} Agendamento publicado com sucesso em ${canalAgenda}!` });
        }

        if (interaction.customId === 'modal_relatorio') {
            await interaction.deferReply({ flags: 64 });
            const titulo = interaction.fields.getTextInputValue('input_titulo');
            const descricao = interaction.fields.getTextInputValue('input_descricao');
            const provas = interaction.fields.getTextInputValue('input_provas') || 'Nenhuma prova anexada.';
            const canalRelatorios = interaction.guild.channels.cache.get(CONFIG.CANAL_RELATORIOS_ID);

            if (!canalRelatorios) {
                return interaction.editReply({ content: `${CONFIG.EMOJIS.cancelar} Canal de relatórios não configurado.` });
            }

            const dataAtual = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const relatorioId = `${interaction.user.id}_${Date.now()}`;
            relatoriosPendentes.add(relatorioId);

            const rowRelatorio = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprovar_relatorio_${relatorioId}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`negar_relatorio_${relatorioId}`).setLabel('Negar').setEmoji('❌').setStyle(ButtonStyle.Danger)
            );

            const payloadRelatorio = v2({
                content: `## <:3128newsweather:1533484043289624697> Novo Relatório Submetido\n<:7442users:1533483075051458580> **Autor:** ${interaction.user} (\`${interaction.user.id}\`)\n<:197546clock:1533483534797504602> **Data / Hora:** \`${dataAtual}\`\n\n📌 **Título:** **${titulo}**\n\n<:New:1535296381000876112> **Descrição:**\n${descricao}\n\n🔗 **Provas / Anexos:**\n${provas}`,
                imageUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
                thumbnailRight: true,
                footer: '-# Sistema de Relatórios · NoxAssistant 2026 ©',
                accentColor: 0x5865F2
            }, [rowRelatorio]);

            await canalRelatorios.send(payloadRelatorio);
            return interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} Relatório enviado com sucesso!` });
        }

        if (interaction.customId === 'modal_recrutamento') {
            await interaction.deferReply({ flags: 64 });
            const nomeRecruta = interaction.fields.getTextInputValue('input_nome_recruta');
            const passaporteRecruta = interaction.fields.getTextInputValue('input_passaporte_recruta');
            const canalRecrutamento = interaction.guild.channels.cache.get(CONFIG.CANAL_RECRUTAMENTO_ID);

            if (!canalRecrutamento) {
                return interaction.editReply({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de recrutamento não está configurado.` });
            }

            const dataAtual = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const recrutamentoId = `${interaction.user.id}_${Date.now()}`;
            recrutamentosPendentes.add(recrutamentoId);

            const rowRecrutamento = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprovar_recrutamento_${recrutamentoId}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`negar_recrutamento_${recrutamentoId}`).setLabel('Negar').setEmoji('❌').setStyle(ButtonStyle.Danger)
            );

            const payloadRecrutamento = v2({
                content: `## 📋 Novo Recrutamento Registado\n**Recrutador:** ${interaction.user} (\`${interaction.user.id}\`)\n**Data / Hora:** \`${dataAtual}\`\n\n📌 **Nome do Recruta:** \`${nomeRecruta}\`\n📌 **Passaporte / ID:** \`${passaporteRecruta}\``,
                imageUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
                thumbnailRight: true,
                footer: '-# Sistema de Recrutamento · NoxAssistant 2026 ©',
                accentColor: 0x2F3136
            }, [rowRecrutamento]);

            await canalRecrutamento.send(payloadRecrutamento);
            return interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} Recrutamento registado com sucesso!` });
        }

        if (interaction.customId.startsWith('modal_ideia_')) {
            await interaction.deferReply({ flags: 64 });
            const tipo = interaction.customId.replace('modal_ideia_', '').replace(/_/g, ' ');
            const titulo = interaction.fields.getTextInputValue('input_titulo_ideia');
            const descricao = interaction.fields.getTextInputValue('input_desc_ideia');

            const canalLogsIdeias = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS_IDEIAS_ID);
            if (!canalLogsIdeias) {
                return interaction.editReply({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de logs de ideias não foi encontrado.` });
            }

            const ideiaId = `${interaction.user.id}_${Date.now()}`;
            ideiasPendentes.add(ideiaId);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprovar_ideia_${ideiaId}_${interaction.user.id}`)
                    .setLabel('Aceitar Ideia')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('1535003452575322192'),
                new ButtonBuilder()
                    .setCustomId(`rejeitar_ideia_${ideiaId}_${interaction.user.id}`)
                    .setLabel('Rejeitar Ideia')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('1535004198339608677')
            );

            const payloadLog = v2({
                content: `## 💡 Nova Proposta de Ideia / Ação\n**Autor:** ${interaction.user} (\`${interaction.user.id}\`)\n**Categoria:** \`${tipo}\`\n\n📌 **Título:** **${titulo}**\n\n<:New:1535296381000876112> **Detalhes:**\n${descricao}`,
                imageUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
                thumbnailRight: true,
                footer: '-# Sistema de Ideias · NoxAssistant 2026 ©',
                accentColor: 0xF1C40F
            }, [row]);

            await canalLogsIdeias.send(payloadLog);
            return interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} A tua proposta foi enviada com sucesso para análise da Administração!` });
        }

        if (interaction.customId.startsWith('modal_set_')) {
            await interaction.deferReply({ flags: 64 });
            const roleId = interaction.customId.replace('modal_set_', '');
            const role = interaction.guild.roles.cache.get(roleId);

            if (!role) {
                return interaction.editReply({ content: `${CONFIG.EMOJIS.aviso} O cargo solicitado já não existe.` });
            }

            const nome = interaction.fields.getTextInputValue('input_nome');
            const passaporte = interaction.fields.getTextInputValue('input_passaporte');
            const recrutador = interaction.fields.getTextInputValue('input_recrutador');

            const logsChannel = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
            if (!logsChannel) {
                return interaction.editReply({ content: `${CONFIG.EMOJIS.cancelar} Erro: O canal de logs não está configurado.` });
            }

            pedidosPendentes.add(interaction.user.id);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprovar_set_${role.id}_${interaction.user.id}_${nome}_${passaporte}`)
                    .setLabel('Aprovar e Dar Cargo')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('1535003452575322192'),
                new ButtonBuilder()
                    .setCustomId(`rejeitar_set_${interaction.user.id}`)
                    .setLabel('Rejeitar')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('1535004198339608677')
            );

            const payloadLog = v2({
                content: `## ${CONFIG.EMOJIS.ticket} Nova Solicitação de Set\n**Membro:** ${interaction.user} (\`${interaction.user.id}\`)\n**Cargo Solicitado:** ${role}\n\n📌 **Informações Enviadas:**\n${CONFIG.EMOJIS.info} **Nome in Game:** \`${nome}\`\n${CONFIG.EMOJIS.info} **Passaporte / ID:** \`${passaporte}\`\n${CONFIG.EMOJIS.info} **Recrutado por:** \`${recrutador}\``,
                imageUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
                thumbnailRight: true,
                footer: '-# NoxAssistant 2026 ©',
                accentColor: 0x2F3136
            }, [row]);

            await logsChannel.send(payloadLog);
            return interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} A tua solicitação para o cargo **${role.name}** foi enviada para análise da Staff!` });
        }

        if (interaction.customId === 'modal_reuniao') {
            await interaction.deferReply({ flags: 64 });
            const hora = interaction.fields.getTextInputValue('input_hora');
            const motivo = interaction.fields.getTextInputValue('input_motivo');

            await interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} A iniciar o envio das mensagens privadas...` });

            const membros = await interaction.guild.members.fetch();
            let enviados = 0;

            const mensagemDM = `${CONFIG.EMOJIS.aviso} **Aviso Geral de Reunião**\n\n<:people:1535221492520976384> **Convocada por:** ${interaction.user}\n<:1f557:1535298038225047584> **Horas:** \`${hora}\`\n<:New:1535296381000876112> **Motivo:** ${motivo}\n\nAtentamente,\nEquipa de Administração`;

            for (const [, member] of membros) {
                if (member.user.bot) continue;
                try {
                    await member.send(mensagemDM);
                    enviados++;
                    await new Promise(res => setTimeout(res, 1000));
                } catch (err) {}
            }

            await interaction.followUp({ content: `${CONFIG.EMOJIS.sucesso} Concluído! Mensagem enviada a **${enviados}** membros.`, flags: 64 });
            return;
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'btn_abrir_relatorio') {
            const modal = new ModalBuilder()
                .setCustomId('modal_relatorio')
                .setTitle('Formulário de Relatório');

            const tituloInput = new TextInputBuilder().setCustomId('input_titulo').setLabel('Título do Relatório').setStyle(TextInputStyle.Short).setRequired(true);
            const descInput = new TextInputBuilder().setCustomId('input_descricao').setLabel('Descrição dos Factos').setStyle(TextInputStyle.Paragraph).setRequired(true);
            const provasInput = new TextInputBuilder().setCustomId('input_provas').setLabel('Provas / Links (opcional)').setStyle(TextInputStyle.Paragraph).setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(tituloInput),
                new ActionRowBuilder().addComponents(descInput),
                new ActionRowBuilder().addComponents(provasInput)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'btn_abrir_recrutamento') {
            const modal = new ModalBuilder()
                .setCustomId('modal_recrutamento')
                .setTitle('Registar Recrutamento');

            const nomeInput = new TextInputBuilder().setCustomId('input_nome_recruta').setLabel('Nome in Game do Recruta').setStyle(TextInputStyle.Short).setRequired(true);
            const passaporteInput = new TextInputBuilder().setCustomId('input_passaporte_recruta').setLabel('Passaporte / ID do Recruta').setStyle(TextInputStyle.Short).setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(passaporteInput)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'btn_abrir_anuncio') {
            const modal = new ModalBuilder()
                .setCustomId('modal_anuncio')
                .setTitle('Criar Anúncio Oficial');

            const tituloInput = new TextInputBuilder().setCustomId('input_titulo_anuncio').setLabel('Título do Anúncio').setStyle(TextInputStyle.Short).setRequired(true);
            const msgInput = new TextInputBuilder().setCustomId('input_msg_anuncio').setLabel('Mensagem do Anúncio').setStyle(TextInputStyle.Paragraph).setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(tituloInput),
                new ActionRowBuilder().addComponents(msgInput)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'btn_abrir_reuniao') {
            const modal = new ModalBuilder()
                .setCustomId('modal_reuniao')
                .setTitle('Agendar Reunião (DM a todos)');

            const horaInput = new TextInputBuilder().setCustomId('input_hora').setLabel('Horas').setStyle(TextInputStyle.Short).setPlaceholder('Ex: 21:00').setRequired(true);
            const motivoInput = new TextInputBuilder().setCustomId('input_motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(horaInput),
                new ActionRowBuilder().addComponents(motivoInput)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId.startsWith('aprovar_agenda_')) {
            if (!membroPodeAprovarIdeias(interaction.member)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem aprovar agendamentos.`, flags: 64 });
            }

            const agendaId = interaction.customId.replace('aprovar_agenda_', '');
            const userId = agendaId.split('_')[0];

            if (!agendaPendentes.has(agendaId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Este agendamento já foi processado!`, flags: 64 });
            }
            agendaPendentes.delete(agendaId);

            await interaction.deferUpdate();
            const rep = await interaction.followUp({ content: `${CONFIG.EMOJIS.sucesso} Agendamento aprovado por ${interaction.user}!` });
            setTimeout(() => rep.delete().catch(() => {}), 3000);

            const autorAgenda = await interaction.guild.members.fetch(userId).catch(() => null);
            if (autorAgenda) {
                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.sucesso} Agendamento Aprovado`)
                    .setDescription(`Olá ${autorAgenda}, o teu agendamento foi **aprovado** pela Administração.`)
                    .setColor(0x57F287)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await autorAgenda.send({ embeds: [embedDM] }).catch(() => {});
            }
        }

        if (interaction.customId.startsWith('negar_agenda_')) {
            if (!membroPodeAprovarIdeias(interaction.member)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem negar agendamentos.`, flags: 64 });
            }

            const agendaId = interaction.customId.replace('negar_agenda_', '');
            const userId = agendaId.split('_')[0];

            if (!agendaPendentes.has(agendaId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Este agendamento já foi processado!`, flags: 64 });
            }
            agendaPendentes.delete(agendaId);

            await interaction.deferUpdate();
            const rep = await interaction.followUp({ content: `${CONFIG.EMOJIS.aviso} Agendamento negado por ${interaction.user}.` });
            setTimeout(() => rep.delete().catch(() => {}), 3000);

            const autorAgenda = await interaction.guild.members.fetch(userId).catch(() => null);
            if (autorAgenda) {
                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.cancelar} Agendamento Negado`)
                    .setDescription(`Olá ${autorAgenda}, o teu agendamento foi **negado** pela Administração desta vez.`)
                    .setColor(0xED4245)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await autorAgenda.send({ embeds: [embedDM] }).catch(() => {});
            }
        }

        if (interaction.customId.startsWith('aprovar_recrutamento_')) {
            if (!membroPodeAprovarRecrutamento(interaction.member)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem aprovar recrutamentos.`, flags: 64 });
            }

            const recrutamentoId = interaction.customId.replace('aprovar_recrutamento_', '');
            const userId = recrutamentoId.split('_')[0];

            if (!recrutamentosPendentes.has(recrutamentoId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Este recrutamento já foi processado!`, flags: 64 });
            }
            recrutamentosPendentes.delete(recrutamentoId);

            await interaction.deferUpdate();
            const repRec = await interaction.followUp({ content: `${CONFIG.EMOJIS.sucesso} Recrutamento aprovado por ${interaction.user}!` });
            setTimeout(() => repRec.delete().catch(() => {}), 3000);

            const autorRecrutamento = await interaction.guild.members.fetch(userId).catch(() => null);
            if (autorRecrutamento) {
                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.sucesso} Recrutamento Aprovado`)
                    .setDescription(`Olá ${autorRecrutamento}, o teu recrutamento foi **aprovado** pela Administração!`)
                    .setColor(0x57F287)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await autorRecrutamento.send({ embeds: [embedDM] }).catch(() => {});
            }
        }

        if (interaction.customId.startsWith('negar_recrutamento_')) {
            if (!membroPodeAprovarRecrutamento(interaction.member)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem negar recrutamentos.`, flags: 64 });
            }

            const recrutamentoId = interaction.customId.replace('negar_recrutamento_', '');
            const userId = recrutamentoId.split('_')[0];

            if (!recrutamentosPendentes.has(recrutamentoId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Este recrutamento já foi processado!`, flags: 64 });
            }
            recrutamentosPendentes.delete(recrutamentoId);

            await interaction.deferUpdate();
            const repRecNeg = await interaction.followUp({ content: `${CONFIG.EMOJIS.aviso} Recrutamento negado por ${interaction.user}.` });
            setTimeout(() => repRecNeg.delete().catch(() => {}), 3000);

            const autorRecrutamento = await interaction.guild.members.fetch(userId).catch(() => null);
            if (autorRecrutamento) {
                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.cancelar} Recrutamento Negado`)
                    .setDescription(`Olá ${autorRecrutamento}, o teu recrutamento foi **negado** pela Administração desta vez.`)
                    .setColor(0xED4245)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await autorRecrutamento.send({ embeds: [embedDM] }).catch(() => {});
            }
        }

        if (interaction.customId.startsWith('aprovar_relatorio_')) {
            if (!membroPodeAprovarIdeias(interaction.member)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem aprovar relatórios.`, flags: 64 });
            }

            const relatorioId = interaction.customId.replace('aprovar_relatorio_', '');
            const userId = relatorioId.split('_')[0];

            if (!relatoriosPendentes.has(relatorioId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Este relatório já foi processado!`, flags: 64 });
            }
            relatoriosPendentes.delete(relatorioId);

            await interaction.deferUpdate();
            const rep = await interaction.followUp({ content: `${CONFIG.EMOJIS.sucesso} Relatório aprovado por ${interaction.user}!` });
            setTimeout(() => rep.delete().catch(() => {}), 3000);

            const autorRelatorio = await interaction.guild.members.fetch(userId).catch(() => null);
            if (autorRelatorio) {
                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.sucesso} Relatório Aprovado`)
                    .setDescription(`Olá ${autorRelatorio}, o teu relatório foi **aprovado** pela Administração. Obrigado pela colaboração!`)
                    .setColor(0x57F287)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await autorRelatorio.send({ embeds: [embedDM] }).catch(() => {});
            }
        }

        if (interaction.customId.startsWith('negar_relatorio_')) {
            if (!membroPodeAprovarIdeias(interaction.member)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem negar relatórios.`, flags: 64 });
            }

            const relatorioId = interaction.customId.replace('negar_relatorio_', '');
            const userId = relatorioId.split('_')[0];

            if (!relatoriosPendentes.has(relatorioId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Este relatório já foi processado!`, flags: 64 });
            }
            relatoriosPendentes.delete(relatorioId);

            await interaction.deferUpdate();
            const rep = await interaction.followUp({ content: `${CONFIG.EMOJIS.aviso} Relatório negado por ${interaction.user}.` });
            setTimeout(() => rep.delete().catch(() => {}), 3000);

            const autorRelatorio = await interaction.guild.members.fetch(userId).catch(() => null);
            if (autorRelatorio) {
                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.cancelar} Relatório Negado`)
                    .setDescription(`Olá ${autorRelatorio}, o teu relatório foi **negado** pela Administração desta vez.`)
                    .setColor(0xED4245)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await autorRelatorio.send({ embeds: [embedDM] }).catch(() => {});
            }
        }

        if (interaction.customId.startsWith('aprovar_ideia_')) {
            if (!membroPodeAprovarIdeias(interaction.member)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem aceitar ideias.`, flags: 64 });
            }

            const parts = interaction.customId.split('_');
            const ideiaId = `${parts[2]}_${parts[3]}`;
            const userId = parts[4];

            const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);

            if (!ideiasPendentes.has(ideiaId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Esta ideia já foi processada!`, flags: 64 });
            }
            ideiasPendentes.delete(ideiaId);

            if (targetMember) {
                try {
                    const cargoIdeia = interaction.guild.roles.cache.get(CONFIG.CARGO_IDEIAS_ID);
                    if (cargoIdeia) {
                        await targetMember.roles.add(cargoIdeia);
                    }
                } catch (err) {}
            }

            await interaction.deferUpdate();
            const rep = await interaction.followUp({ content: `${CONFIG.EMOJIS.sucesso} Proposta aceite por ${interaction.user}! Cargo entregue.` });
            setTimeout(() => rep.delete().catch(() => {}), 3000);

            const canalLogsIdeias = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS_IDEIAS_ID);
            if (canalLogsIdeias) {
                const embedLog = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.sucesso} Ideia Aprovada`)
                    .setDescription(`**Proponente:** ${targetMember ? targetMember : `\`${userId}\``}\n**Aprovado por:** ${interaction.user}`)
                    .setColor(0x57F287)
                    .setTimestamp()
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await canalLogsIdeias.send({ embeds: [embedLog] }).catch(() => {});
            }

            if (targetMember) {
                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.sucesso} Ideia / Ação Aceite!`)
                    .setDescription(`Olá ${targetMember}, a tua proposta enviada ao sistema de ideias foi **aceite** pela Administração e já recebeste o cargo correspondente! Parabéns!`)
                    .setColor(0x57F287)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await targetMember.send({ embeds: [embedDM] }).catch(() => {});
            }
        }

        if (interaction.customId.startsWith('rejeitar_ideia_')) {
            if (!membroPodeAprovarIdeias(interaction.member)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem rejeitar ideias.`, flags: 64 });
            }

            const parts = interaction.customId.split('_');
            const ideiaId = `${parts[2]}_${parts[3]}`;
            const userId = parts[4];

            const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);

            if (!ideiasPendentes.has(ideiaId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Esta ideia já foi processada!`, flags: 64 });
            }
            ideiasPendentes.delete(ideiaId);

            await interaction.deferUpdate();
            const rep = await interaction.followUp({ content: `${CONFIG.EMOJIS.aviso} Proposta rejeitada por ${interaction.user}.` });
            setTimeout(() => rep.delete().catch(() => {}), 3000);

            const canalLogsIdeiasRej = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS_IDEIAS_ID);
            if (canalLogsIdeiasRej) {
                const embedLogRej = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.cancelar} Ideia Rejeitada`)
                    .setDescription(`**Proponente:** ${targetMember ? targetMember : `\`${userId}\``}\n**Rejeitado por:** ${interaction.user}`)
                    .setColor(0xED4245)
                    .setTimestamp()
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await canalLogsIdeiasRej.send({ embeds: [embedLogRej] }).catch(() => {});
            }

            if (targetMember) {
                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.cancelar} Ideia / Ação Rejeitada`)
                    .setDescription(`Olá ${targetMember}, infelizmente a tua proposta enviada ao sistema de ideias foi **rejeitada** pela Administração desta vez.`)
                    .setColor(0xED4245)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await targetMember.send({ embeds: [embedDM] }).catch(() => {});
            }
        }

        if (interaction.customId.startsWith('aprovar_set_')) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem aprovar sets.`, flags: 64 });
            }

            const [, , roleId, userId, nomeInGame, passaporte] = interaction.customId.split('_');
            const role = interaction.guild.roles.cache.get(roleId);
            const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);

            if (!pedidosPendentes.has(userId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Este pedido já foi processado!`, flags: 64 });
            }

            if (!targetMember || !role) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Membro ou cargo não encontrado.`, flags: 64 });
            }

            try {
                await targetMember.roles.add(role);
                pedidosPendentes.delete(userId);

                const cargoConfig = CONFIG.CARGOS_DISPONIVEIS.find(c => c.id === role.id);
                const prefixo = cargoConfig ? cargoConfig.tagNick : role.name;

                let novoNick = `${prefixo} ⚖️| ${nomeInGame} ${passaporte}`;
                if (novoNick.length > 32) novoNick = novoNick.substring(0, 32);

                await targetMember.setNickname(novoNick).catch(() => {});
                
                await interaction.deferUpdate();
                const mensagemConfirmacao = await interaction.followUp({ 
                    content: `${CONFIG.EMOJIS.sucesso} O pedido de ${targetMember} foi **aprovado** por ${interaction.user}. Cargo ${role} entregue e alcunha alterada para \`${novoNick}\`!` 
                });

                setTimeout(() => mensagemConfirmacao.delete().catch(() => {}), 3000);

                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.sucesso} Solicitação Aprovada!`)
                    .setDescription(`Olá ${targetMember}, a tua solicitação para o cargo **${role.name}** foi **aprovada**! Já recebeste o cargo e o teu nome foi atualizado para **${novoNick}**.`)
                    .setColor(0x57F287)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await targetMember.send({ embeds: [embedDM] }).catch(() => {});

                const canalLogsSets = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS_SETS_ID);
                if (canalLogsSets) {
                    const embedLogSet = new EmbedBuilder()
                        .setTitle(`${CONFIG.EMOJIS.sucesso} Set Aprovado`)
                        .setDescription(`**Membro:** ${targetMember}\n**Cargo:** ${role}\n**Nome in Game:** ${nomeInGame}\n**Passaporte:** ${passaporte}\n**Aprovado por:** ${interaction.user}\n**Novo nick:** \`${novoNick}\``)
                        .setColor(0x57F287)
                        .setTimestamp()
                        .setFooter({ text: 'NoxAssistant 2026 ©' });
                    await canalLogsSets.send({ embeds: [embedLogSet] }).catch(() => {});
                }
            } catch (err) {
                await interaction.reply({ content: `${CONFIG.EMOJIS.aviso} Erro ao dar o cargo. Verifique a hierarquia de cargos do bot.`, flags: 64 });
            }
        }

        if (interaction.customId.startsWith('rejeitar_set_')) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Apenas membros autorizados podem rejeitar sets.`, flags: 64 });
            }

            const parts = interaction.customId.split('_');
            const userId = parts[2];
            const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!pedidosPendentes.has(userId)) {
                return interaction.reply({ content: `${CONFIG.EMOJIS.cancelar} Este pedido já foi processado!`, flags: 64 });
            }
            pedidosPendentes.delete(userId);

            await interaction.deferUpdate();
            await interaction.followUp({ content: `${CONFIG.EMOJIS.aviso} O pedido de ${targetMember ? targetMember : 'Membro'} foi **rejeitado** por ${interaction.user}.` });

            if (targetMember) {
                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.cancelar} Solicitação Rejeitada`)
                    .setDescription(`Olá ${targetMember}, a tua solicitação de Set foi **rejeitada** pela Staff.`)
                    .setColor(0xED4245)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await targetMember.send({ embeds: [embedDM] }).catch(() => {});
            }
        }
    }
});

client.login(process.env.TOKEN);
