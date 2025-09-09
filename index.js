import 'dotenv/config';
import axios from 'axios';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

const {
  DISCORD_TOKEN,
  GUILD_ID,
  ERLC_API_KEY,
  ERLC_COMMUNITY_ID
} = process.env;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// --- Roblox API helpers ---
async function getPlayers() {
  const url = `https://api.policeroleplay.community/v1/servers/${ERLC_COMMUNITY_ID}/players`;
  const res = await axios.get(url, {
    headers: { Authorization: ERLC_API_KEY }
  });
  return res.data; // array of players
}

async function getHeadshot(userId) {
  const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
  const res = await axios.get(url);
  return res.data.data[0]?.imageUrl || null;
}

// --- Team change tracking ---
const lastTeams = new Map();

async function checkTeams() {
  const players = await getPlayers();

  for (const p of players) {
    const oldTeam = lastTeams.get(p.username);
    if (oldTeam && oldTeam !== p.team) {
      await handleTeamChange(p);
    }
    lastTeams.set(p.username, p.team);
  }
}

// --- DM logic ---
async function handleTeamChange(player) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const members = await guild.members.fetch();

    // match Discord nickname/display with Roblox username
    const member = members.find(
      m =>
        (m.nickname && m.nickname.toLowerCase() === player.username.toLowerCase()) ||
        m.displayName.toLowerCase() === player.username.toLowerCase()
    );

    if (!member) {
      console.log(`⚠️ No Discord member found for ${player.username}`);
      return;
    }

    const avatar = await getHeadshot(player.userId);

    const embed = new EmbedBuilder()
      .setColor('#2f3136')
      .setTitle(`Welcome to ${player.team}`)
      .setDescription(
        `Hello **${player.username}**,  
you have been assigned to the **${player.team}** in Palm Coast RP.  
Please review the Discord guidelines before starting your role.`
      )
      .setFooter({ text: 'Palm Coast RP • Official' });

    if (avatar) embed.setThumbnail(avatar);

    await member.send({ embeds: [embed] });
    console.log(`📩 DM sent to ${player.username} (${player.team})`);
  } catch (err) {
    console.error('DM error:', err.message);
  }
}

// poll every 15s
setInterval(checkTeams, 15000);

client.login(DISCORD_TOKEN);
