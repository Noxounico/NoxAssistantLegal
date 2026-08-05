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
    Routes
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

client.once('clientReady', async () => {
    console.log(`🤖 ${client.user.tag} está online e pronto a funcionar com comandos por prefixo (${CONFIG.PREFIXO})!`);

    // CORREÇÃO APLICADA AQUI: Mudado de process.env.TOKEN para process.env.DISCORD_TOKEN
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        console.log('🗑️ Comandos de barra (/) antigos removidos.');
    } catch (error) {
        console.error('Erro ao remover comandos de barra antigos:', error);
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

        return message.channel.send({ embeds: [embedGeral] });
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

// Inicialização da sessão com o token seguro do Railway
client.login(process.env.MTUzMzUyMDAzMjg3MTQ4MTM0NA.GNgK6u.dgbHl2pWnFQOsoRzU2PBALP5P_GVPPY1_q1P30);
