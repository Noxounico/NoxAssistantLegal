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
const LOCK_FILE = path.join(__dirname, 'bot.lock');

function verificarInstanciaUnica() {
    if (fs.existsSync(LOCK_FILE)) {
        const pidAntigo = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
        try {
            process.kill(pidAntigo, 0);
            console.error(`❌ Já existe uma instância deste bot a correr (PID ${pidAntigo}).`);
            process.exit(1);
        } catch (e) {}
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
    CANAL_LOGS_ID: '1532011317882519592', 
    CANAL_RELATORIOS_ID: '1527002525402661046',
    CANAL_LOGS_IDEIAS_ID: '1532811754755850472', 
    CANAL_PAINEL_IDEIAS_ID: '1532811239661764739',
    CANAL_AVISOS_ID: '1527001349710024855',
    CANAL_AGENDA_ID: '1533246749249114312',
    CANAL_VOTACOES_ID: '1527002314513186866',
    CARGO_IDEIAS_ID: '1532811905071321218', 
    PREFIXO: '!',
    
    CARGOS_DISPONIVEIS: [
        { id_menu: 'set_aux', nome: 'Auxiliar', sufixo: 'Aux', tagNick: 'Aux.Cup', emoji: '1520249625276186654', desc: 'Solicitar o set de Auxiliar' },
        { id_menu: 'set_lid', nome: 'Líder', sufixo: 'Lid', tagNick: 'Lid.Cup', emoji: '1520278427645509813', desc: 'Solicitar o set de Líder' },
        { id_menu: 'set_sub', nome: 'Sub-Líder', sufixo: 'Sub', tagNick: 'Sub.Cup', emoji: '1520278431034773565', desc: 'Solicitar o set de Sub-Líder' },
        { id_menu: 'set_gest', nome: 'Gestor', sufixo: 'Gest', tagNick: 'Ges.Cup', emoji: '1520249618380750908', desc: 'Solicitar o set de Gestor' },
        { id_menu: 'set_elite', nome: 'Elite', sufixo: 'Elite', tagNick: 'Cup.e', emoji: '1520249626731614288', desc: 'Solicitar o set de Elite' },
        { id_menu: 'set_membro', nome: 'Membro', sufixo: 'Membro', tagNick: 'Cup', emoji: '1520283853116276836', desc: 'Solicitar o set de Membro' }
    ],

    CATEGORIAS_IDEIAS: [
        { id_menu: 'ideia_evento', nome: 'Ideia de Evento', desc: 'Propor um novo evento para a comunidade' },
        { id_menu: 'ideia_acao', nome: 'Ação Policial / Ilegal', desc: 'Propor uma ação/patrulha específica' },
        { id_menu: 'ideia_melhoria', nome: 'Sugestão de Melhoria', desc: 'Propor melhorias para a organização ou cidade' }
    ],

    CATEGORIAS_AVISOS: [
        { id_menu: 'aviso_geral', nome: 'Aviso Geral', desc: 'Comunicado importante para todos' },
        { id_menu: 'aviso_urgente', nome: 'Aviso Urgente', desc: 'Alerta prioritário para a comunidade' },
        { id_menu: 'aviso_anuncio', nome: 'Anúncio', desc: 'Anúncio oficial para toda a comunidade' }
    ],

    CATEGORIAS_AGENDA: [
        { id_menu: 'agenda_reuniao', nome: 'Reunião Oficial', desc: 'Agendar uma reunião com a equipa/fração' },
        { id_menu: 'agenda_evento', nome: 'Evento Programado', desc: 'Agendar data e hora para evento' }
    ],

    CATEGORIAS_HIERARQUIA: [
        { titulo: 'HIERARQUIA CUPULA', cargos: ['1527000274038947890'], grupo: 'gestao' },
        { titulo: 'ADM', cargos: ['1527000248982175764'], grupo: 'gestao' },
        { titulo: 'AUX', cargos: ['1527000221089796236'], grupo: 'gestao' },
        { titulo: 'LID', cargos: ['1527001475652522267'], grupo: 'gestao' },
        { titulo: 'SUB', cargos: ['1527000194548502632'], grupo: 'gestao' },
        { titulo: 'MEMBRO-E', cargos: ['1527000169537605703'], grupo: 'membros' },
        { titulo: 'MEMBRO', cargos: ['1527000128953516052'], grupo: 'membros' }
    ],

    EMOJIS: {
        sucesso: '<:sucess:1520249613901103135>',
        aviso: '<:192440warningicon:1533451130049265704>',
        info: '<:info:1520249612542279780>',
        cancelar: '<:cancel:1520249621589524571>',
        ticket: '<:ticket:1520278432687325195>',
        auth: '<:272410anonymous:1533449386594664509>',
        hierarquiaEsq: '<:272410anonymous:1533449386594664509>',
        hierarquiaDir: '<:272410anonymous:1533449386594664509>',
        coroa: '👑'
    }
};

const pedidosPendentes = new Set();
const ideiasPendentes = new Set();
const relatoriosPendentes = new Set();
const agendaPendentes = new Set();

const CARGOS_APROVAR_IDEIAS = [
    '1527000274038947890',
    '1527000248982175764',
    '1527000221089796236'
];

function membroPodeAprovarIdeias(member) {
    return member.roles.cache.some(role => CARGOS_APROVAR_IDEIAS.includes(role.id));
}

client.once('clientReady', async () => {
    console.log(`🤖 ${client.user.tag} está online e pronto a funcionar com comandos por prefixo (${CONFIG.PREFIXO})!`);

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || process.env.TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        console.log('🗑️ Comandos de barra (/) antigos removidos.');
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

    message.delete().catch(() => {});

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
                { name: '👤 Geral / Membros', value: '`!comandos` - Mostra esta lista\n`!relatorio` - Abre formulário de relatório\n`!ideias` - Envia o painel de ideias\n`!avisos` - Envia o painel de avisos\n`!agenda` - Envia o painel de agenda\n`!votacoes` - Abre o painel para criar uma votação\n`!hierarquia` - Mostra a hierarquia da organização' },
                { name: '🛡️ Gestão de Cargos & Staff', value: '`!pedirset` - Envia o painel de sets (Admin)\n`!reuniao` - Envia aviso de reunião por DM (Admin)\n`!clear [1-99]` - Limpa mensagens (Moderadores)' }
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

        await message.channel.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de relatório enviado com sucesso!` });
    }

    if (commandName === 'hierarquia') {
        await message.guild.members.fetch().catch(() => {});

        const CANAL_HIERARQUIA_ID = '1531223510305996930';
        const canalHierarquia = message.guild.channels.cache.get(CANAL_HIERARQUIA_ID) || message.channel;

        let conteudo = '';
        const membrosGestao = new Set();
        const membrosMembros = new Set();

        for (const categoria of CONFIG.CATEGORIAS_HIERARQUIA) {
            conteudo += `${CONFIG.EMOJIS.coroa} **${categoria.titulo}**\n`;

            const membrosCategoria = message.guild.members.cache.filter(m =>
                categoria.cargos.some(cargoId => m.roles.cache.has(cargoId))
            );

            if (membrosCategoria.size === 0) {
                conteudo += `...\n`;
            } else {
                membrosCategoria.forEach(membro => {
                    conteudo += `${CONFIG.EMOJIS.hierarquiaEsq} ${membro} ${CONFIG.EMOJIS.hierarquiaDir}\n`;
                    if (categoria.grupo === 'membros') {
                        membrosMembros.add(membro.id);
                    } else {
                        membrosGestao.add(membro.id);
                    }
                });
            }
            conteudo += '\n';
        }

        const totalGestao = membrosGestao.size;
        const totalMembros = membrosMembros.size;
        const totalGeral = totalGestao + totalMembros;

        conteudo += `${CONFIG.EMOJIS.coroa} Gestão.CUP | (${totalGestao})\n`;
        conteudo += `${CONFIG.EMOJIS.coroa} Membros | (${totalMembros})\n`;
        conteudo += `${CONFIG.EMOJIS.coroa} **Total (${totalGeral})**\n`;

        const blocos = conteudo.trim().match(/[\s\S]{1,1900}(\n|$)/g) || [conteudo.trim()];
        for (const bloco of blocos) {
            await canalHierarquia.send({ content: bloco.trim() });
        }
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Hierarquia enviada com sucesso!` });
    }

    if (commandName === 'ideias') {
        const canalAlvo = message.channel;
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
            content: `## <:Ideias:1533453913166975057> Submissão de Ideias e Ações\nTem alguma proposta de evento, patrulha ou melhoria para a cidade?\n\n> Utilize o menu abaixo para escolher o tipo de submissão. A Administração irá analisar e dar feedback direto!\n\n-# As propostas são avaliadas pela equipa responsável.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0x5865F2
        }, [row]);

        await canalAlvo.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de ideias enviado com sucesso!` });
    }

    if (commandName === 'avisos') {
        const canalAlvo = message.channel;
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
        const canalAlvo = message.channel;
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
                .setEmoji(cargo.emoji)
        );
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu_pedir_set')
            .setPlaceholder('Selecione o Set que desejas pedir...')
            .addOptions(optionsMenu);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const payload = v2({
            content: `## ${CONFIG.EMOJIS.auth} Solicitação de Set / Cargos\nSeja bem-vindo(a) ao sistema de solicitação da nossa cidade!\n\n> Utilize o menu abaixo para selecionar o cargo desejado. A nossa equipa de Staff irá analisar o seu pedido o mais rápido possível.\n> \n> Lembre-se de ter os seus requisitos prontos ao abrir o ticket.\n\n-# Ao selecionar, um canal privado será criado para análise da Staff.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0x2F3136
        }, [row]);

        await message.channel.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de sets enviado com sucesso!` });
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

    if (commandName === 'votacoes' || commandName === 'votaçoes') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_abrir_votacao')
                .setLabel('📊 Criar Nova Votação')
                .setStyle(ButtonStyle.Primary)
        );
        const payload = v2({
            content: `## 📊 Votações / Sondagens\nQueres saber a opinião da comunidade sobre alguma coisa?\n\n> Clica no botão abaixo para criares uma votação. Vai ser publicada automaticamente no canal de votações e todos podem reagir com 👍 ou 👎.\n\n-# A votação fica associada ao teu nome de utilizador.`,
            imageUrl: 'https://i.postimg.cc/VNPjBpps/Design-sem-nome-(2).png',
            footer: '-# NoxAssistant 2026 ©',
            accentColor: 0x3498DB
        }, [row]);

        await message.channel.send(payload);
        return responderEApagar({ content: `${CONFIG.EMOJIS.sucesso} Painel de votações enviado com sucesso!` });
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
            const role = interaction.guild.roles.cache.find(r => r.name.endsWith(cargoConfig ? cargoConfig.sufixo : nomeCargo));
            
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
        if (interaction.customId === 'modal_votacao') {
            await interaction.deferReply({ flags: 64 });
            const textoVotacao = interaction.fields.getTextInputValue('input_texto_votacao');
            const canalVotacoes = interaction.guild.channels.cache.get(CONFIG.CANAL_VOTACOES_ID);

            if (!canalVotacoes) {
                return interaction.editReply({ content: `${CONFIG.EMOJIS.cancelar} Canal de votações não configurado.` });
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Votação / Sondagem')
                .setDescription(textoVotacao)
                .setColor(0x3498DB)
                .setFooter({ text: `Votação iniciada por ${interaction.user.tag}` });

            const votacaoMsg = await canalVotacoes.send({ embeds: [embed] });
            await votacaoMsg.react('✅');
            await votacaoMsg.react('❌');

            return interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} Votação enviada com sucesso para ${canalVotacoes}!` });
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
                    { name: '⏰ Data e Hora', value: `\`${dataHora}\``, inline: false },
                    { name: '📝 Detalhes', value: descricao, inline: false }
                )
                .setColor(0x3498DB)
                .setTimestamp()
                .setFooter({ text: `Agendado por ${interaction.user.tag} · NoxAssistant 2026 ©` });

            const rowAgenda = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprovar_agenda_${agendaId}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`negar_agenda_${agendaId}`).setLabel('Negar').setEmoji('❌').setStyle(ButtonStyle.Danger)
            );

            await canalAgenda.send({ embeds: [embedAgenda], components: [rowAgenda] });

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
                content: `## <:3128newsweather:1533484043289624697> Novo Relatório Submetido\n<:7442users:1533483075051458580> **Autor:** ${interaction.user} (\`${interaction.user.id}\`)\n<:197546clock:1533483534797504602> **Data / Hora:** \`${dataAtual}\`\n\n📌 **Título:** **${titulo}**\n\n📝 **Descrição:**\n${descricao}\n\n🔗 **Provas / Anexos:**\n${provas}`,
                imageUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
                thumbnailRight: true,
                footer: '-# Sistema de Relatórios · NoxAssistant 2026 ©',
                accentColor: 0x5865F2
            }, [rowRelatorio]);

            await canalRelatorios.send(payloadRelatorio);
            return interaction.editReply({ content: `${CONFIG.EMOJIS.sucesso} Relatório enviado com sucesso!` });
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
                    .setEmoji('1520249613901103135'),
                new ButtonBuilder()
                    .setCustomId(`rejeitar_ideia_${ideiaId}_${interaction.user.id}`)
                    .setLabel('Rejeitar Ideia')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('1520249615318782022')
            );

            const payloadLog = v2({
                content: `## 💡 Nova Proposta de Ideia / Ação\n**Autor:** ${interaction.user} (\`${interaction.user.id}\`)\n**Categoria:** \`${tipo}\`\n\n📌 **Título:** **${titulo}**\n\n📝 **Detalhes:**\n${descricao}`,
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
                    .setEmoji('1520249613901103135'),
                new ButtonBuilder()
                    .setCustomId(`rejeitar_set_${interaction.user.id}`)
                    .setLabel('Rejeitar')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('1520249615318782022')
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

            const mensagemDM = `${CONFIG.EMOJIS.aviso} **Aviso Geral de Reunião**\n\n👤 **Convocada por:** ${interaction.user}\n⏰ **Horas:** \`${hora}\`\n📝 **Motivo:** ${motivo}\n\nAtentamente,\nEquipa de Administração`;

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

        if (interaction.customId === 'btn_abrir_votacao') {
            const modal = new ModalBuilder()
                .setCustomId('modal_votacao')
                .setTitle('Criar Votação / Sondagem');

            const textoInput = new TextInputBuilder().setCustomId('input_texto_votacao').setLabel('Texto da Votação').setStyle(TextInputStyle.Paragraph).setPlaceholder('Ex: Devemos fazer evento sábado?').setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(textoInput)
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

                const cargoConfig = CONFIG.CARGOS_DISPONIVEIS.find(c => role.name.endsWith(c.sufixo));
                const prefixo = cargoConfig ? cargoConfig.tagNick : 'Cup';

                let novoNick = `${prefixo} 🎭 | ${nomeInGame} ${passaporte}`;
                if (novoNick.length > 32) novoNick = novoNick.substring(0, 32);

                await targetMember.setNickname(novoNick).catch(() => {});
                
                await interaction.deferUpdate();
                const mensagemConfirmacao = await interaction.followUp({ 
                    content: `${CONFIG.EMOJIS.sucesso} O pedido de ${targetMember} foi **aprovado** por ${interaction.user}. Cargo ${role} entregue e alcunha alterada para \`${novoNick}\`!` 
                });

                setTimeout(() => mensagemConfirmacao.delete().catch(() => {}), 3000);

                const embedDM = new EmbedBuilder()
                    .setTitle(`${CONFIG.EMOJIS.sucesso} Solicitação Aprovada!`)
                    .setDescription(`Olá ${targetName}, a tua solicitação para o cargo **${role.name}** foi **aprovada**! Já recebeste o cargo e o teu nome foi atualizado para **${novoNick}**.`)
                    .setColor(0x57F287)
                    .setFooter({ text: 'NoxAssistant 2026 ©' });
                await targetMember.send({ embeds: [embedDM] }).catch(() => {});
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

// Inicialização compatível tanto com process.env.TOKEN como process.env.DISCORD_TOKEN
client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
