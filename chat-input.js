const Discord = require('discord.js');
const NewClient = require('./NewClient');
const { Worker } = require('worker_threads');
const { execFile } = require('child_process');
const { get_code, get_output, send_embed } = require('./reused-code')

const handlers = {
  /** @param {Discord.ChatInputCommandInteraction} interaction */
  ping: (interaction) => interaction.reply(`\`${interaction.client.ws.ping}ms\``),

  /** @param {Discord.ChatInputCommandInteraction} interaction */
  async javascript(interaction) {
    const [modal_int, code, _stdin] = await get_code(interaction);
    const worker = new Worker(code, { eval: true, stderr: true, stdin: true, stdout: true });
    send_embed(modal_int, code, _stdin, await get_output(worker));
  },

  /** @param {Discord.ChatInputCommandInteraction} interaction */
  async python(interaction) {
    const [modal_int, code, _stdin] = await get_code(interaction);
    const child = execFile('python', ['-c', code]);
    send_embed(modal_int, code, _stdin, await get_output(child));
  }
}

/**
 * @param {NewClient} client 
 */
module.exports = function(client) {
  for(const k in handlers)
    client.chat_input.on(k, handlers[k]);
}