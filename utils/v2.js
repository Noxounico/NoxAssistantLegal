"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.v2 = v2;
exports.createV2Message = createV2Message;
exports.v2Ephemeral = v2Ephemeral;
exports.v2Panel = v2Panel;
const discord_js_1 = require("discord.js");

function v2(options, rows = []) {
    return createV2Message(options.content ?? null, rows, options.imageUrl ?? null, options);
}

function createV2Message(content, rows = [], imageUrl = null, options = {}) {
    const { accentColor, thumbnailRight = false, dividerBeforeComponents = true, footer, } = options;
    const container = new discord_js_1.ContainerBuilder();
    if (accentColor !== undefined) {
        container.setAccentColor(accentColor);
    }
    if (imageUrl && !thumbnailRight) {
        // Adiciona um separador invisível antes para evitar o 'full-bleed' (imagem colada nas bordas)
        container.addSeparatorComponents(new discord_js_1.SeparatorBuilder().setSpacing(discord_js_1.SeparatorSpacingSize.Small));
        container.addMediaGalleryComponents(new discord_js_1.MediaGalleryBuilder().addItems(new discord_js_1.MediaGalleryItemBuilder().setURL(imageUrl)));
        container.addSeparatorComponents(new discord_js_1.SeparatorBuilder().setSpacing(discord_js_1.SeparatorSpacingSize.Small).setDivider(true));
    }
    if (content && thumbnailRight && imageUrl) {
        container.addSectionComponents(new discord_js_1.SectionBuilder()
            .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(content))
            .setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL(imageUrl)));
    }
    else if (content) {
        container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(content));
    }
    if (rows.length > 0) {
        if ((content || imageUrl) && dividerBeforeComponents) {
            container.addSeparatorComponents(new discord_js_1.SeparatorBuilder().setSpacing(discord_js_1.SeparatorSpacingSize.Small).setDivider(true));
        }
        for (const row of rows) {
            container.addActionRowComponents(row);
        }
    }
    if (footer) {
        container.addSeparatorComponents(new discord_js_1.SeparatorBuilder().setSpacing(discord_js_1.SeparatorSpacingSize.Small).setDivider(true));
        container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(footer));
    }
    return {
        flags: discord_js_1.MessageFlags.IsComponentsV2,
        components: [container],
    };
}

function v2Ephemeral(options, rows = []) {
    const result = v2(options, rows);
    result.flags |= discord_js_1.MessageFlags.Ephemeral;
    return result;
}

function v2Panel(options, rows = []) {
    const container = new discord_js_1.ContainerBuilder();
    if (options.accentColor !== undefined) {
        container.setAccentColor(options.accentColor);
    }
    if (options.bannerUrl) {
        container.addMediaGalleryComponents(new discord_js_1.MediaGalleryBuilder().addItems(new discord_js_1.MediaGalleryItemBuilder().setURL(options.bannerUrl)));
        container.addSeparatorComponents(new discord_js_1.SeparatorBuilder().setSpacing(discord_js_1.SeparatorSpacingSize.Small).setDivider(true));
    }
    const titleText = `## » ${options.title || 'BOT STONKS'} «`;
    if (options.showBackButton && options.backButtonId) {
        const btn = new discord_js_1.ButtonBuilder()
            .setCustomId(options.backButtonId)
            .setLabel(options.backButtonLabel || '< Voltar')
            .setStyle(discord_js_1.ButtonStyle.Secondary);
        if (options.backButtonEmoji) {
            btn.setEmoji(options.backButtonEmoji);
        }
        container.addSectionComponents(new discord_js_1.SectionBuilder()
            .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(titleText))
            .setButtonAccessory(btn));
    }
    else {
        container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(titleText));
    }
    let mainContent = `-# \`📍 /panel - ${options.path}\``;
    if (options.description) {
        mainContent += `\n> \n> ${options.description}`;
    }
    container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(mainContent));
    if (options.bullets && options.bullets.length > 0) {
        container.addSeparatorComponents(new discord_js_1.SeparatorBuilder().setSpacing(discord_js_1.SeparatorSpacingSize.Small).setDivider(true));
        const bulletsText = options.bullets.join('\\n');
        container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(bulletsText));
    }
    if (rows.length > 0) {
        container.addSeparatorComponents(new discord_js_1.SeparatorBuilder().setSpacing(discord_js_1.SeparatorSpacingSize.Small).setDivider(true));
        for (const row of rows) {
            container.addActionRowComponents(row);
        }
    }
    return {
        flags: discord_js_1.MessageFlags.IsComponentsV2 | discord_js_1.MessageFlags.Ephemeral,
        components: [container],
    };
}
