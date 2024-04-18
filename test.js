const Discord = require("discord.js")
const {PokemonGame} = require("./dist/index.js")
const client = new Discord.Client({
    intents: [Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.MessageContent],
})

client.once(Discord.Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
const game = new PokemonGame("");
client.on(Discord.Events.MessageCreate, message => {
    if (message.content === "!gtp") {
        console.log("test")
        game.createGame(message)
    }
})
client.login("");