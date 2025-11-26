// ==================== IMPORTS ====================
const { Client: SelfbotClient } = require('discord.js-selfbot-v13');
const { 
  Client: BotClient, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ChannelType
} = require('discord.js');

// ==================== KEEP-ALIVE SERVER (untuk Replit) ====================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bot Status</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
          }
          .container {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 2rem;
            border-radius: 10px;
            backdrop-filter: blur(10px);
          }
          .status { 
            font-size: 3rem; 
            margin-bottom: 1rem;
          }
          h1 { margin: 0; }
          p { opacity: 0.8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status">🤖 ✅</div>
          <h1>Bot is Running!</h1>
          <p>Uptime: ${process.uptime().toFixed(0)}s</p>
          <p>Last ping: ${new Date().toLocaleString('id-ID')}</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server running on port ${PORT}`);
  console.log(`📍 Visit: http://localhost:${PORT}`);
});

// ==================== CONFIGURATION ====================
const CONFIG = {
  // TOKEN DARI ENVIRONMENT VARIABLES (AMAN!)
  LIMVIP_USER_TOKEN: process.env.LIMVIP_USER_TOKEN,
  ATVIP_USER_TOKEN: process.env.ATVIP_USER_TOKEN,
  BOT_TOKEN: process.env.BOT_TOKEN,
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '1438066297274372177',
  
  // QRIS Payment Image
  QRIS_IMAGE_URL: process.env.QRIS_IMAGE_URL || 'https://cdn.discordapp.com/attachments/1440304655585247322/1442885192548352050/IMG_0331.png',
  
  MAINTENANCE: {
    LIMVIP: process.env.LIMVIP_MAINTENANCE === 'true' || false,
    ATVIP: process.env.ATVIP_MAINTENANCE === 'true' || false
  },
  
  LIMVIP: {
    name: 'LIMVIP',
    emoji: '🍋',
    allowedRoleId: process.env.LIMVIP_ROLE_ID || '1438065941240873022',
    price: parseInt(process.env.LIMVIP_PRICE) || 25000,
    sellerServer: {
      channelId: process.env.LIMVIP_CHANNEL_ID || '1422529696641449994',
      messageId: process.env.LIMVIP_MESSAGE_ID || '1431928625959010375',
      buttons: {
        getScript: 'btn_getscript',
        resetHWID: 'btn_resethwid'
      },
      useButtonIndex: false
    },
    yourServer: {
      channelId: process.env.LIMVIP_YOUR_CHANNEL_ID || '1438015124337332264'
    },
    colors: {
      primary: 0x32CD32,
      secondary: 0x7FFF00,
      success: 0x00FF00,
      error: 0xFF4444,
      maintenance: 0xFFA500
    }
  },
  
  ATVIP: {
    name: 'ATVIP',
    emoji: '⚛️',
    allowedRoleId: process.env.ATVIP_ROLE_ID || '1438062437201875000',
    price: parseInt(process.env.ATVIP_PRICE) || 35000,
    sellerServer: {
      channelId: process.env.ATVIP_CHANNEL_ID || '1398305885029273752',
      messageId: process.env.ATVIP_MESSAGE_ID || '1432081759092211912',
      buttons: {
        getScriptIndex: 1,
        resetHWIDIndex: 3
      },
      useButtonIndex: true
    },
    yourServer: {
      channelId: process.env.ATVIP_YOUR_CHANNEL_ID || '1438015058125787297'
    },
    colors: {
      primary: 0xE91E63,
      secondary: 0x9C27B0,
      success: 0x4CAF50,
      error: 0xF44336,
      maintenance: 0xFFA500
    }
  }
};

// Validasi token
if (!CONFIG.LIMVIP_USER_TOKEN || !CONFIG.ATVIP_USER_TOKEN || !CONFIG.BOT_TOKEN) {
  console.error('❌ ERROR: Missing required tokens in environment variables!');
  console.error('Please set: LIMVIP_USER_TOKEN, ATVIP_USER_TOKEN, BOT_TOKEN');
  process.exit(1);
}

// ==================== CLIENTS ====================
const selfbotLIMVIP = new SelfbotClient({ checkUpdate: false });
const selfbotATVIP = new SelfbotClient({ checkUpdate: false });

const bot = new BotClient({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// ==================== STATE ====================
const state = {
  limvip: { 
    waitingForResponse: false, 
    controlPanelMessage: null 
  },
  atvip: { 
    waitingForResponse: false, 
    controlPanelMessage: null 
  }
};

// ==================== LOGGER ====================
const logger = {
  info: (msg) => console.log(`[${new Date().toLocaleString('id-ID')}] ℹ️  ${msg}`),
  success: (msg) => console.log(`[${new Date().toLocaleString('id-ID')}] ✅ ${msg}`),
  error: (msg) => console.log(`[${new Date().toLocaleString('id-ID')}] ❌ ${msg}`),
  warning: (msg) => console.log(`[${new Date().toLocaleString('id-ID')}] ⚠️  ${msg}`),
  debug: (msg) => console.log(`[${new Date().toLocaleString('id-ID')}] 🐛 ${msg}`)
};

// ==================== UTILITY FUNCTIONS ====================
async function hasRequiredRole(interaction, roleId) {
  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const hasRole = member.roles.cache.has(roleId);
    
    if (!hasRole) {
      logger.warning(`Access denied for ${interaction.user.tag} - Missing required role`);
    }
    
    return hasRole;
  } catch (error) {
    logger.error(`Role check error: ${error.message}`);
    return false;
  }
}

async function sendActivityLog(interaction, action, config, success, errorMessage = null) {
  try {
    const logChannel = await bot.channels.fetch(CONFIG.LOG_CHANNEL_ID);
    
    const actionEmoji = {
      'getscript': '📜',
      'resethwid': '⚙️',
      'buy': '🛒'
    };
    
    const actionName = {
      'getscript': 'Get Script',
      'resethwid': 'Reset HWID',
      'buy': 'View Payment Info'
    };
    
    const statusEmoji = success ? '✅' : '❌';
    const statusText = success ? 'Success' : 'Failed';
    const statusColor = success ? config.colors.success : config.colors.error;
    
    const logEmbed = new EmbedBuilder()
      .setTitle(`${statusEmoji} ${config.emoji} ${config.name} - ${actionName[action]}`)
      .setColor(statusColor)
      .addFields(
        {
          name: '👤 User Information',
          value: [
            `**Username:** ${interaction.user.tag}`,
            `**User ID:** ${interaction.user.id}`,
            `**Mention:** <@${interaction.user.id}>`
          ].join('\n'),
          inline: false
        },
        {
          name: '📊 Action Details',
          value: [
            `**Action:** ${actionEmoji[action]} ${actionName[action]}`,
            `**Bot:** ${config.emoji} ${config.name}`,
            `**Status:** ${statusEmoji} ${statusText}`
          ].join('\n'),
          inline: false
        },
        {
          name: '⏰ Timestamp',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: false
        }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ 
        text: `Activity Log • ${config.name}`,
        iconURL: bot.user.displayAvatarURL()
      })
      .setTimestamp();
    
    if (!success && errorMessage) {
      logEmbed.addFields({
        name: '⚠️ Error Details',
        value: `\`\`\`${errorMessage}\`\`\``,
        inline: false
      });
    }
    
    await logChannel.send({ embeds: [logEmbed] });
  } catch (error) {
    logger.error(`Failed to send activity log: ${error.message}`);
  }
}

// ==================== PANEL CREATION ====================
async function createPanel(channel, config) {
  const isLimvip = config.name === 'LIMVIP';
  const isAtvip = config.name === 'ATVIP';
  const isMaintenance = (isLimvip && CONFIG.MAINTENANCE.LIMVIP) || (isAtvip && CONFIG.MAINTENANCE.ATVIP);
  
  if (isMaintenance) {
    return await createMaintenancePanel(channel, config);
  } else {
    return await createNormalPanel(channel, config);
  }
}

async function createMaintenancePanel(channel, config) {
  const embed = new EmbedBuilder()
    .setTitle(`⚠️ ${config.emoji} ${config.name} - Under Maintenance`)
    .setDescription(
      `> **🔧 System Maintenance**\n` +
      `> Service ${config.name} sedang dalam perbaikan\n\n` +
      '> **Status:** Maintenance Mode\n' +
      '> **Estimasi:** Soon™'
    )
    .setColor(config.colors.maintenance)
    .setFooter({ 
      text: `${bot.user.username} • Maintenance Mode`,
      iconURL: bot.user.displayAvatarURL()
    })
    .setTimestamp();
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${config.name.toLowerCase()}_getscript`)
        .setLabel('Get Script')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`${config.name.toLowerCase()}_resethwid`)
        .setLabel('Reset HWID')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`${config.name.toLowerCase()}_buy`)
        .setLabel('Buy Access')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`${config.name.toLowerCase()}_help`)
        .setLabel('Help')
        .setEmoji('❓')
        .setStyle(ButtonStyle.Secondary)
    );
  
  return await channel.send({ embeds: [embed], components: [row] });
}

async function createNormalPanel(channel, config) {
  const embed = new EmbedBuilder()
    .setTitle(`${config.emoji} ${config.name} Control Panel`)
    .setDescription(
      `> **Premium Script Access**\n` +
      `> Kelola script dan HWID Anda\n\n` +
      `**💳 Harga:** Rp ${config.price.toLocaleString('id-ID')}\n` +
      `**📋 Status:** Online & Ready\n` +
      `**🎯 Method:** Scan QRIS → Auto Role → Instant Access`
    )
    .addFields(
      {
        name: '📜 Get Script',
        value: 'Download script terbaru',
        inline: true
      },
      {
        name: '⚙️ Reset HWID',
        value: 'Reset hardware ID',
        inline: true
      },
      {
        name: '🛒 Buy Access',
        value: 'Info pembayaran QRIS',
        inline: true
      }
    )
    .setColor(config.colors.primary)
    .setFooter({ 
      text: `${bot.user.username} • Scan QRIS • Auto Role`,
      iconURL: bot.user.displayAvatarURL()
    })
    .setTimestamp();
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${config.name.toLowerCase()}_getscript`)
        .setLabel('Get Script')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${config.name.toLowerCase()}_resethwid`)
        .setLabel('Reset HWID')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${config.name.toLowerCase()}_buy`)
        .setLabel('Buy Access')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${config.name.toLowerCase()}_help`)
        .setLabel('Help')
        .setEmoji('❓')
        .setStyle(ButtonStyle.Secondary)
    );
  
  return await channel.send({ embeds: [embed], components: [row] });
}

// ==================== BUTTON HANDLERS ====================
async function handleBuyButton(interaction, config) {
  const embed = new EmbedBuilder()
    .setTitle(`${config.emoji} Beli ${config.name} Premium`)
    .setDescription(
      `**💰 Harga:** Rp ${config.price.toLocaleString('id-ID')}\n\n` +
      '**📱 Cara Pembayaran:**\n' +
      '1️⃣ Scan QRIS di bawah ini\n' +
      '2️⃣ Transfer sesuai nominal\n' +
      '3️⃣ Role otomatis masuk\n' +
      '4️⃣ Langsung bisa akses!\n\n' +
      '**⚡ Instant Access - No Manual Verification**'
    )
    .setImage(CONFIG.QRIS_IMAGE_URL)
    .setColor(config.colors.secondary)
    .setFooter({ text: 'QRIS Payment • Auto Role • 24/7 Support' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
  await sendActivityLog(interaction, 'buy', config, true);
}

async function handleHelpButton(interaction, config) {
  const embed = new EmbedBuilder()
    .setTitle(`${config.emoji} ${config.name} - Bantuan`)
    .setDescription('Panduan penggunaan control panel')
    .addFields(
      {
        name: '📜 Get Script',
        value: 'Klik untuk mendapatkan script terbaru. Pastikan Anda memiliki role premium.',
        inline: false
      },
      {
        name: '⚙️ Reset HWID',
        value: 'Gunakan untuk reset hardware ID jika ganti PC atau ada masalah.',
        inline: false
      },
      {
        name: '🛒 Buy Access',
        value: 'Lihat informasi pembayaran via QRIS. Role otomatis setelah transfer.',
        inline: false
      },
      {
        name: '❓ Syarat Akses',
        value: `Harus memiliki role <@&${config.allowedRoleId}>`,
        inline: false
      }
    )
    .setColor(config.colors.primary)
    .setFooter({ text: 'Need more help? Contact admin' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleActionButton(interaction, action, config, stateKey) {
  const isLimvip = config.name === 'LIMVIP';
  const isAtvip = config.name === 'ATVIP';
  const isMaintenance = (isLimvip && CONFIG.MAINTENANCE.LIMVIP) || (isAtvip && CONFIG.MAINTENANCE.ATVIP);
  
  if (isMaintenance) {
    const maintenanceEmbed = new EmbedBuilder()
      .setTitle('⚠️ Service Under Maintenance')
      .setDescription(
        `${config.emoji} **${config.name}** sedang dalam perbaikan.\n\n` +
        'Silakan coba lagi nanti.'
      )
      .setColor(config.colors.maintenance)
      .setTimestamp();
    
    await interaction.reply({ 
      embeds: [maintenanceEmbed], 
      ephemeral: true 
    });
    return;
  }
  
  const hasRole = await hasRequiredRole(interaction, config.allowedRoleId);
  const accessStatus = hasRole ? '✅ **Access**' : '❌ **No Access**';
  
  if (!hasRole) {
    const noAccessEmbed = new EmbedBuilder()
      .setTitle('🔒 Access Denied')
      .setDescription(
        `**Status Akun:** ${accessStatus}\n\n` +
        `Anda tidak memiliki akses premium untuk menggunakan ${config.emoji} **${config.name}**.\n\n` +
        `**Untuk mendapatkan akses:**\n` +
        `Klik button **🛒 Buy Access** di panel untuk scan QRIS dan dapatkan role otomatis!`
      )
      .setColor(config.colors.error)
      .setFooter({ text: 'Scan QRIS • Auto Role • Instant Access' })
      .setTimestamp();
    
    await interaction.reply({ 
      embeds: [noAccessEmbed], 
      ephemeral: true 
    });
    await sendActivityLog(interaction, action, config, false, 'Access Denied - Missing required role');
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  
  try {
    const selfbot = isLimvip ? selfbotLIMVIP : selfbotATVIP;
    
    const channel = await selfbot.channels.fetch(config.sellerServer.channelId);
    const targetMessage = await channel.messages.fetch(config.sellerServer.messageId);
    
    state[stateKey].waitingForResponse = true;
    
    const actionName = action === 'getscript' ? 'Get Script' : 'Reset HWID';
    let result;
    
    if (config.sellerServer.useButtonIndex) {
      const buttonIndex = action === 'getscript' ? 
        config.sellerServer.buttons.getScriptIndex : 
        config.sellerServer.buttons.resetHWIDIndex;
      
      if (targetMessage.components.length > 0 && 
          targetMessage.components[0].components.length > buttonIndex) {
        
        const button = targetMessage.components[0].components[buttonIndex];
        result = await targetMessage.clickButton(button.customId);
      } else {
        throw new Error(`Button index ${buttonIndex} not found`);
      }
      
    } else {
      const buttonId = action === 'getscript' ? 
        config.sellerServer.buttons.getScript : 
        config.sellerServer.buttons.resetHWID;
      
      result = await targetMessage.clickButton(buttonId);
    }
    
    logger.success(`${config.name} ${actionName} clicked by ${interaction.user.tag}`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (result && typeof result === 'object' && (result.embeds || result.content)) {
      const embeds = buildResponseEmbeds(result, config.colors.success, accessStatus);
      await interaction.editReply({ embeds });
      await sendActivityLog(interaction, action, config, true);
    } else {
      await interaction.editReply({ 
        content: `❌ Gagal ${actionName}. Silakan coba lagi.` 
      });
      await sendActivityLog(interaction, action, config, false, 'No response from seller server');
    }
    
    state[stateKey].waitingForResponse = false;
  } catch (error) {
    logger.error(`${config.name} ${action} error: ${error.message}`);
    
    await interaction.editReply({ 
      content: `❌ Terjadi kesalahan: ${error.message}` 
    });
    await sendActivityLog(interaction, action, config, false, error.message);
    
    state[stateKey].waitingForResponse = false;
  }
}

function buildResponseEmbeds(result, color, accessStatus) {
  const embeds = [];
  
  if (result.content) {
    embeds.push(
      new EmbedBuilder()
        .setTitle(`${accessStatus}`)
        .setDescription(result.content)
        .setColor(color)
    );
  }
  
  if (result.embeds && result.embeds.length > 0) {
    result.embeds.forEach(emb => {
      const newEmbed = new EmbedBuilder().setColor(color);
      
      if (emb.title) newEmbed.setTitle(`${accessStatus} • ${emb.title}`);
      if (emb.description) newEmbed.setDescription(emb.description);
      if (emb.fields) {
        emb.fields.forEach(field => {
          newEmbed.addFields({ 
            name: field.name, 
            value: field.value, 
            inline: field.inline || false 
          });
        });
      }
      
      embeds.push(newEmbed);
    });
  }
  
  return embeds;
}

// ==================== EVENT HANDLERS ====================
selfbotLIMVIP.on('ready', async () => {
  logger.success(`🍋 LIMVIP Selfbot ready: ${selfbotLIMVIP.user.tag}`);
  
  try {
    const limvipChannel = await selfbotLIMVIP.channels.fetch(CONFIG.LIMVIP.sellerServer.channelId);
    await limvipChannel.messages.fetch(CONFIG.LIMVIP.sellerServer.messageId);
    logger.success('LIMVIP initialized! 🍋');
  } catch (error) {
    logger.error(`LIMVIP init error: ${error.message}`);
  }
});

selfbotATVIP.on('ready', async () => {
  logger.success(`⚛️ ATVIP Selfbot ready: ${selfbotATVIP.user.tag}`);
  
  try {
    const atvipChannel = await selfbotATVIP.channels.fetch(CONFIG.ATVIP.sellerServer.channelId);
    await atvipChannel.messages.fetch(CONFIG.ATVIP.sellerServer.messageId);
    logger.success('ATVIP initialized! ⚛️');
  } catch (error) {
    logger.error(`ATVIP init error: ${error.message}`);
  }
});

bot.on('ready', async () => {
  logger.success(`Bot ready: ${bot.user.tag}`);
  logger.info(`🍋 LIMVIP: Rp ${CONFIG.LIMVIP.price.toLocaleString('id-ID')} | ${CONFIG.MAINTENANCE.LIMVIP ? 'MAINTENANCE' : 'ONLINE'}`);
  logger.info(`⚛️ ATVIP: Rp ${CONFIG.ATVIP.price.toLocaleString('id-ID')} | ${CONFIG.MAINTENANCE.ATVIP ? 'MAINTENANCE' : 'ONLINE'}`);
  logger.info(`📋 Log: ${CONFIG.LOG_CHANNEL_ID}`);
  logger.info(`💳 QRIS Payment: Auto Role Enabled`);
  
  try {
    const limvipChannel = await bot.channels.fetch(CONFIG.LIMVIP.yourServer.channelId);
    state.limvip.controlPanelMessage = await createPanel(limvipChannel, CONFIG.LIMVIP);
  } catch (error) {
    logger.error(`Failed to create LIMVIP panel: ${error.message}`);
  }
  
  try {
    const atvipChannel = await bot.channels.fetch(CONFIG.ATVIP.yourServer.channelId);
    state.atvip.controlPanelMessage = await createPanel(atvipChannel, CONFIG.ATVIP);
  } catch (error) {
    logger.error(`Failed to create ATVIP panel: ${error.message}`);
  }
});

bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  const customId = interaction.customId;
  
  if (customId === 'limvip_getscript') {
    await handleActionButton(interaction, 'getscript', CONFIG.LIMVIP, 'limvip');
  } 
  else if (customId === 'limvip_resethwid') {
    await handleActionButton(interaction, 'resethwid', CONFIG.LIMVIP, 'limvip');
  }
  else if (customId === 'limvip_buy') {
    await handleBuyButton(interaction, CONFIG.LIMVIP);
  }
  else if (customId === 'limvip_help') {
    await handleHelpButton(interaction, CONFIG.LIMVIP);
  }
  else if (customId === 'atvip_getscript') {
    await handleActionButton(interaction, 'getscript', CONFIG.ATVIP, 'atvip');
  } 
  else if (customId === 'atvip_resethwid') {
    await handleActionButton(interaction, 'resethwid', CONFIG.ATVIP, 'atvip');
  }
  else if (customId === 'atvip_buy') {
    await handleBuyButton(interaction, CONFIG.ATVIP);
  }
  else if (customId === 'atvip_help') {
    await handleHelpButton(interaction, CONFIG.ATVIP);
  }
});

// ==================== ERROR HANDLERS ====================
selfbotLIMVIP.on('error', (error) => logger.error(`🍋 LIMVIP Selfbot error: ${error.message}`));
selfbotATVIP.on('error', (error) => logger.error(`⚛️ ATVIP Selfbot error: ${error.message}`));
bot.on('error', (error) => logger.error(`Bot error: ${error.message}`));
process.on('unhandledRejection', (error) => logger.error(`Unhandled rejection: ${error}`));

// ==================== STARTUP ====================
async function startBot() {
  try {
    logger.info('🚀 Starting Dual Bot System with Separated User Tokens...');
    
    logger.info('🍋 Logging in LIMVIP selfbot...');
    await selfbotLIMVIP.login(CONFIG.LIMVIP_USER_TOKEN);
    
    logger.info('⚛️ Logging in ATVIP selfbot...');
    await selfbotATVIP.login(CONFIG.ATVIP_USER_TOKEN);
    
    logger.info('🤖 Logging in main bot...');
    await bot.login(CONFIG.BOT_TOKEN);
    
    logger.success('All systems ready! 🍋⚛️💳');
  } catch (error) {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

startBot();
