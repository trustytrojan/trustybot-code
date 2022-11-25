const Discord = require('discord.js');
const { String } = Discord.ApplicationCommandOptionType;

module.exports = {

  /** @type {Discord.APIApplicationCommand[]} */
  get global() {
    return [
      { name: 'ping', description: 'check ping' },
      { name: 'javascript', description: 'run javascript code' },
      { name: 'python', description: 'run python code' }
    ];
  },

};