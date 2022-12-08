const Discord = require('discord.js');
const { String, Boolean } = Discord.ApplicationCommandOptionType;

/** @type {Discord.APIApplicationCommand[]} */
module.exports = [
  { name: 'ping', description: 'check ping' },
  { name: 'javascript', description: 'run javascript code' },
  { name: 'python', description: 'run python code' },
  { name: 'c', description: 'run c code', options: [
    { name: 'auto_include', type: Boolean, description: 'if true, i will detect necessary headers and include them for you', required: true },
    { name: 'surround_with_main', type: Boolean, description: 'if true, your code will be encapsulated into a main function', required: true }
  ] }
];