"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PokemonGame = void 0;
const discord_js_1 = require("discord.js");
const undici_1 = require("undici");
const API_URL = "https://api.shadowstudios.eu.org";
class PokemonGame {
    constructor(API_KEY) {
        this.API_KEY = API_KEY;
    }
    /**
     * Asynchronously retrieves a specified number of randomly generated Pokemon objects.
     *
     * @param {number} number - The number of Pokemon objects to generate.
     * @return {Promise<ApiResponse[]>} An array of objects containing the id and name of each generated Pokemon.
     */
    getRandomPokemon(number) {
        return __awaiter(this, void 0, void 0, function* () {
            const randomIntegers = createRandomIntegers(number);
            const promises = randomIntegers.map((id) => __awaiter(this, void 0, void 0, function* () {
                const data = yield this.getPokemonInfo(id);
                return data;
            }));
            return yield Promise.all(promises);
        });
    }
    /**
     * Asynchronously retrieves the information for a specified Pokemon.
     *
     * @param {number} id - The id of the Pokemon.
     * @return {Promise<ApiResponse>} The Pokemon's information.
     */
    getPokemonInfo(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = (0, undici_1.request)(`${API_URL}/image/pokemoninfo?id=${id}&key=${this.API_KEY}`);
            const responseData = checkForErrors(yield response);
            const data = responseData.then((res) => { var _a; return (_a = res.body) === null || _a === void 0 ? void 0 : _a.json(); });
            return data;
        });
    }
    /**
     * Asynchronously retrieves the sprite for a specified Pokemon.
     *
     * @param {number} id - The id of the Pokemon.
     * @param {boolean} show - Whether to show the sprite or a thumbnail.
     * @return {Promise<AttachmentBuilder>} The sprite of the specified Pokemon.
     */
    getPokemonSprite(id, show) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${API_URL}/image/pokemonimage?id=${id}&show=${show}&key=${this.API_KEY}`;
            const name = "djs-gtp.png";
            return new discord_js_1.AttachmentBuilder(url, { name });
        });
    }
    /**
     * Asynchronously generates a set of buttons for a game.
     *
     * @param {number} pokemonOptions - The number of randomly generated Pokemon objects.
     * @param {ApiResponse} mainPokemon - The main Pokemon object.
     * @return {Promise<ActionRowBuilder<ButtonBuilder>>} A new ActionRowBuilder instance containing the buttons.
     */
    makeButtons(pokemonOptions, mainPokemon) {
        return __awaiter(this, void 0, void 0, function* () {
            const allPokemon = yield this.getRandomPokemon(pokemonOptions);
            allPokemon.push(mainPokemon);
            for (let i = allPokemon.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allPokemon[i], allPokemon[j]] = [allPokemon[j], allPokemon[i]];
            }
            return new discord_js_1.ActionRowBuilder()
                .setComponents(allPokemon.map((pokemon) => {
                return new discord_js_1.ButtonBuilder()
                    .setCustomId(pokemon.id.toString())
                    .setLabel(pokemon.name)
                    .setStyle(discord_js_1.ButtonStyle.Primary);
            }));
        });
    }
    createGame(DiscordInteraction_1) {
        return __awaiter(this, arguments, void 0, function* (DiscordInteraction, options = {
            chances: 1,
            pokemonOptions: 3,
            time: 60000
        }) {
            var _a;
            if ((options === null || options === void 0 ? void 0 : options.pokemonOptions) < 1)
                throw new Error("pokemonOptions must be greater than 0");
            if ((options === null || options === void 0 ? void 0 : options.chances) < 0)
                throw new Error("chances must be greater than 0");
            if ((options === null || options === void 0 ? void 0 : options.pokemonOptions) > 4)
                throw new Error("pokemonOptions must be between 1 and 4");
            if ((options === null || options === void 0 ? void 0 : options.chances) > (options === null || options === void 0 ? void 0 : options.pokemonOptions) - 1)
                throw new Error(`chances must be between 0 and ${options.pokemonOptions - 1}`);
            if (DiscordInteraction instanceof discord_js_1.ChatInputCommandInteraction) {
                DiscordInteraction.deferReply();
            }
            if (!(options.embed instanceof discord_js_1.EmbedBuilder)) {
                options.embed = new discord_js_1.EmbedBuilder().setTitle("Pokemon Game").setDescription("Guess the Pokemon");
            }
            const mainPokemon = yield this.getPokemonInfo((_a = options.id) !== null && _a !== void 0 ? _a : createRandomIntegers(1)[0]);
            options.embed.setImage("attachment://djs-gtp.png");
            const mainImage = yield this.getPokemonSprite(mainPokemon === null || mainPokemon === void 0 ? void 0 : mainPokemon.id, false);
            const buttons = yield this.makeButtons(options.pokemonOptions, mainPokemon);
            let msg;
            if (DiscordInteraction instanceof discord_js_1.ChatInputCommandInteraction) {
                msg = yield DiscordInteraction.editReply({
                    embeds: [options.embed],
                    files: [mainImage],
                    components: [buttons]
                });
            }
            else {
                msg = yield DiscordInteraction.reply({
                    embeds: [options.embed],
                    files: [mainImage],
                    components: [buttons]
                });
            }
            const collector = msg.createMessageComponentCollector({ time: options.time });
            collector.on('collect', (i) => __awaiter(this, void 0, void 0, function* () {
                var _b, _c;
                if (!i.isButton())
                    return;
                if (i.user.id !== ((_c = (_b = DiscordInteraction === null || DiscordInteraction === void 0 ? void 0 : DiscordInteraction.member) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id)) {
                    i.reply({
                        content: "This game is not for you",
                        ephemeral: true
                    });
                    return;
                }
                if (i.customId === mainPokemon.id.toString()) {
                    if (DiscordInteraction instanceof discord_js_1.ChatInputCommandInteraction) {
                        DiscordInteraction.editReply({
                            content: `Correct! The Pokemon is ${mainPokemon.name}`,
                            components: []
                        });
                    }
                    else {
                        msg.edit({
                            content: `Correct! The Pokemon is ${mainPokemon.name}`,
                            components: []
                        });
                    }
                }
                if (i.customId !== mainPokemon.id.toString()) {
                    i.reply({
                        content: "Wrong!",
                    });
                    options.chances--;
                    if ((options === null || options === void 0 ? void 0 : options.chances) === 0) {
                        if (DiscordInteraction instanceof discord_js_1.ChatInputCommandInteraction) {
                            DiscordInteraction.editReply({
                                content: "Game Ended",
                                components: []
                            });
                        }
                        else {
                            msg.edit({
                                content: "Game Ended",
                                components: []
                            });
                        }
                    }
                }
            }));
            collector.on('end', (collected, reason) => __awaiter(this, void 0, void 0, function* () {
                if (DiscordInteraction instanceof discord_js_1.ChatInputCommandInteraction) {
                    DiscordInteraction.editReply({
                        content: "Game Ended",
                        components: []
                    });
                }
                else {
                    msg.edit({
                        content: "Game Ended",
                        components: []
                    });
                }
            }));
        });
    }
}
exports.PokemonGame = PokemonGame;
/**
 * Generates an array of random integers.
 *
 * @param count The number of random integers to generate.
 * @returns An array of integers, each between 0 (inclusive) and 1025 (exclusive).
 */
function createRandomIntegers(count) {
    const randomIntegers = [];
    for (let i = 0; i < count; i++) {
        const randomInteger = Math.floor(Math.random() * 1026);
        randomIntegers.push(randomInteger);
    }
    return randomIntegers;
}
/**
 * Checks the response for errors and throws an error if the response status code is not 200.
 *
 * @param {Dispatcher.ResponseData} response - The response data to check for errors.
 * @throws {Error} Throws an error if the response status code is not 200.
 * @return {Promise<Dispatcher.ResponseData>} The response data if there are no errors.
 */
function checkForErrors(response) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (response.statusCode !== 200) {
            const data = yield ((_a = response.body) === null || _a === void 0 ? void 0 : _a.json().then((value) => value));
            throw new Error(`API Error: ${data.message || response.statusCode}`);
        }
        return response;
    });
}
