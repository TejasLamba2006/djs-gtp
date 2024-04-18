import { AttachmentBuilder, EmbedBuilder, type Message, ActionRowBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, type ComponentType, type BaseInteraction } from "discord.js";
import { request, type Dispatcher } from "undici";
const API_URL = "https://api.shadowstudios.eu.org";


interface GameOptions {
    id?: number;
    chances: number;
    pokemonOptions: number;
    embed?: EmbedBuilder;
    time: number;
  }
  

interface Name {
	name: string;
	language: string;
}

interface Variety {
	id: string;
	name: string | null;
	default: boolean;
	display: string | null;
	types: [];
}

interface Chain {
	url: string;
	data: [];
}

interface ApiResponse {
	store: Record<string, unknown>;
	id: number;
	name: string;
	entries: string[];
	names: Name[];
	genus: string;
	varieties: Variety[];
	chain: Chain;
	typesCached: boolean;
	missingno: boolean;
}

export class PokemonGame {
	API_KEY: string;

	constructor(API_KEY: string) {
		this.API_KEY = API_KEY;
	}

	/**
	 * Asynchronously retrieves a specified number of randomly generated Pokemon objects.
	 *
	 * @param {number} number - The number of Pokemon objects to generate.
	 * @return {Promise<ApiResponse[]>} An array of objects containing the id and name of each generated Pokemon.
	 */
	async getRandomPokemon(
		number: number,
	): Promise<ApiResponse[]> {
		const randomIntegers: number[] = createRandomIntegers(number);
		const promises: Promise<ApiResponse>[] =
			randomIntegers.map(
				async (id: number): Promise<ApiResponse> => {
					const data = await this.getPokemonInfo(id);
					return data
				},
			);
		return await Promise.all(promises);
	}


    /**
     * Asynchronously retrieves the information for a specified Pokemon.
     *
     * @param {number} id - The id of the Pokemon.
     * @return {Promise<ApiResponse>} The Pokemon's information.
     */
    async getPokemonInfo(id: number): Promise<ApiResponse> {
        const response: Promise<Dispatcher.ResponseData> = request(
            `${API_URL}/image/pokemoninfo?id=${id}&key=${this.API_KEY}`
        );
        const responseData: Promise<Dispatcher.ResponseData> = checkForErrors(await response);
        const data: Promise<ApiResponse> = responseData.then((res) => res.body?.json()) as Promise<ApiResponse>;
        return data;
    }

    /**
     * Asynchronously retrieves the sprite for a specified Pokemon.
     *
     * @param {number} id - The id of the Pokemon.
     * @param {boolean} show - Whether to show the sprite or a thumbnail.
     * @return {Promise<AttachmentBuilder>} The sprite of the specified Pokemon.
     */
    async getPokemonSprite(
        id: number, 
        show: boolean
    ): Promise<AttachmentBuilder> {
        const url = `${API_URL}/image/pokemonimage?id=${id}&show=${show}&key=${this.API_KEY}`;
        const name = "djs-gtp.png";
        return new AttachmentBuilder(url, { name });
    }

    /**
     * Asynchronously generates a set of buttons for a game.
     *
     * @param {number} pokemonOptions - The number of randomly generated Pokemon objects.
     * @param {ApiResponse} mainPokemon - The main Pokemon object.
     * @return {Promise<ActionRowBuilder<ButtonBuilder>>} A new ActionRowBuilder instance containing the buttons.
     */
    async makeButtons(pokemonOptions: number, mainPokemon: ApiResponse): Promise<ActionRowBuilder<ButtonBuilder>> {
        const allPokemon: ApiResponse[] = await this.getRandomPokemon(pokemonOptions);
        allPokemon.push(mainPokemon);
        for (let i = allPokemon.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPokemon[i], allPokemon[j]] = [allPokemon[j], allPokemon[i]];
        }        
        return new ActionRowBuilder<ButtonBuilder>()
            .setComponents(
                allPokemon.map((pokemon: ApiResponse) => {
                    return new ButtonBuilder()
                        .setCustomId(pokemon.id.toString())
                        .setLabel(pokemon.name)
                        .setStyle(ButtonStyle.Primary);
                })
            )
    }




    async createGame(DiscordInteraction: Message | ChatInputCommandInteraction, options: GameOptions = {
        chances: 1,
        pokemonOptions: 3,
        time: 60000
    }) {
        if(options?.pokemonOptions < 1) throw new Error("pokemonOptions must be greater than 0");
        if(options?.chances < 0) throw new Error("chances must be greater than 0");
        if(options?.pokemonOptions > 4) throw new Error("pokemonOptions must be between 1 and 4");
        if(options?.chances > options?.pokemonOptions-1) throw new Error(`chances must be between 0 and ${options.pokemonOptions-1}`);        
        
        if(DiscordInteraction instanceof ChatInputCommandInteraction) {
            DiscordInteraction.deferReply()
        }
            if(!options.embed || !(options.embed instanceof EmbedBuilder)) {
                options.embed = new EmbedBuilder().setTitle("Pokemon Game").setDescription("Guess the Pokemon");
            }
            const mainPokemon = await this.getPokemonInfo(options.id ?? createRandomIntegers(1)[0])
            options.embed.setImage("attachment://djs-gtp.png")
            const EMBED = [options.embed]
            const questionImage = await this.getPokemonSprite(mainPokemon?.id, false);
            const buttons = await this.makeButtons(options.pokemonOptions, mainPokemon);
            let msg: BaseInteraction | Message;
            if (DiscordInteraction instanceof ChatInputCommandInteraction) {
                msg = await DiscordInteraction.editReply({
                    embeds: EMBED,
                    files: [questionImage],
                    components: [buttons]
                });
            } else {
                msg = await DiscordInteraction.reply({
                    embeds: EMBED,
                    files: [questionImage],
                    components: [buttons]
                });
            }
            const collector = msg.createMessageComponentCollector<ComponentType.Button>({ time: options.time });
            collector.on('collect', async (i) => {
                if(!i.isButton()) return;
                if(i.user.id !== DiscordInteraction?.member?.user?.id) {
                    i.reply({
                        content: "This game is not for you",
                        ephemeral: true
                    })
                    return;
                }
                
                if(i.customId === mainPokemon.id.toString()) {
                    const answerImage = await this.getPokemonSprite(mainPokemon?.id, true);

                    if(DiscordInteraction instanceof ChatInputCommandInteraction) {

                        DiscordInteraction.editReply({
                            embeds: EMBED,
                            files: [answerImage],
                            components: []
                        })
                    } else {
                        msg.edit({
                            embeds: EMBED,
                            files: [answerImage],
                            components: []
                        })
                    }
                }
                if(i.customId !== mainPokemon.id.toString()) {
                    i.reply({
                        content: "Wrong!",
                    })
                    options.chances--;
                    if(options?.chances === 0) {
                        if(DiscordInteraction instanceof ChatInputCommandInteraction) {
                            DiscordInteraction.editReply({
                                content: "Game Ended",
                                components: []
                            })
                        } else {
                            msg.edit({
                                content: "Game Ended",
                                components: []
                            })
                        }
                    }
                }

                
            })
            collector.on('end', async (collected, reason) => {
                if(DiscordInteraction instanceof ChatInputCommandInteraction) {
                    DiscordInteraction.editReply({
                        content: "Game Ended",
                        components: []
                    })
                } else {
                    msg.edit({
                        content: "Game Ended",
                        components: []
                    })
                }
            })

        }

}

/**
 * Generates an array of random integers.
 *
 * @param count The number of random integers to generate.
 * @returns An array of integers, each between 0 (inclusive) and 1025 (exclusive).
 */
function createRandomIntegers(count: number): number[] {
	const randomIntegers: number[] = [];
	for (let i = 0; i < count; i++) {
		const randomInteger: number = Math.floor(Math.random() * 1026);
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
async function checkForErrors(
	response: Dispatcher.ResponseData,
): Promise<Dispatcher.ResponseData> {
	if (response.statusCode !== 200) {
		const data = await response.body
			?.json()
			.then((value) => value as { error: boolean; message?: string });
		throw new Error(`API Error: ${data.message || response.statusCode}`);
	}
	return response;
}

