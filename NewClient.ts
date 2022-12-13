import { Client, ClientOptions } from 'discord.js';
import { EventEmitter } from 'events';

export default class NewClient extends Client {
  public chat_input: EventEmitter;
  public button: EventEmitter;

  constructor(o: ClientOptions) {
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