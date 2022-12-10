const { APIApplicationCommand, ApplicationCommandOptionType } = require('discord.js');
const { Boolean, Integer } = ApplicationCommandOptionType;

/** @type {APIApplicationCommand[]} */
module.exports = [
  { name: 'javascript', description: 'run javascript code' },
  { name: 'python', description: 'run python code' },
  { name: 'c', description: 'run c code', options: [
    { 
      name: 'auto_include_headers',
      type: Boolean,
      description: 'if true, i will detect necessary headers and include them for you',
      required: true
    },
    { 
      name: 'surround_with_main',
      type: Integer,
      description: 'would you like me to put all your code in a main function?',
      required: true,
      choices: [
        { name: 'no', value: 0 },
        { name: 'yes, without argv', value: 1 },
        { name: 'yes, with argv', value: 2 }
      ]
    }
  ] }
];