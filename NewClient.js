const { Client, ClientOptions } = require('discord.js');
const EventEmitter = require('events');

/**
 * wrapper class for the discord.js client to make command handling
 * easier to write (for myself)
 */
class NewClient extends Client {
  /** @param {ClientOptions} o */
  constructor(o) {
    super(o);
    this.chat_input = new EventEmitter();
    this.button = new EventEmitter();

    this.on('interactionCreate', (interaction) => {
      if(interaction.isChatInputCommand())
        this.chat_input.emit(interaction.commandName, interaction);
      else if(interaction.isButton())
        this.button.emit(interaction.customId, interaction);
    });
  }
}

module.exports = NewClient;