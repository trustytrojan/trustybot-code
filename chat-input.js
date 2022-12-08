const Discord = require('discord.js');
const NewClient = require('./NewClient');
const { Worker } = require('worker_threads');
const { execFile } = require('child_process');
const { get_user_code, get_process_output, code_output_embed, compile_error_embed } = require('./reused-code')

const handlers = {
  /** @param {Discord.ChatInputCommandInteraction} interaction */
  ping: (interaction) => interaction.reply(`\`${interaction.client.ws.ping}ms\``),

  /** @param {Discord.ChatInputCommandInteraction} interaction */
  async javascript(interaction) {
    const [modal_int, code, _stdin] = await get_user_code(interaction);
    const worker = new Worker(code, { eval: true, stderr: true, stdin: true, stdout: true });
    if(_stdin) worker.stdin.end(_stdin);
    const output_embed = code_output_embed(code, stdin, await get_process_output(worker));
    modal_int.reply({  })
  },

  /** @param {Discord.ChatInputCommandInteraction} interaction */
  async python(interaction) {
    const [modal_int, code, _stdin] = await get_user_code(interaction);
    const child = execFile('python', ['-c', code]);
    if(_stdin) child.stdin.end(_stdin);
    send_embed(modal_int, code, _stdin, await get_process_output(child, _stdin));
  },

  /** @param {Discord.ChatInputCommandInteraction} interaction */
  async c(interaction) {
    const [modal_int, code, _stdin] = await get_user_code(interaction);
    const child = execFile('gcc', ['-x', 'c', '-']);
    child.stdin.end(code);
    const [_stdout, _stderr, exit_code] = await get_process_output(child);
    if(_stderr.length > 0) {
      const embed = compile_error_embed(modal_int.user, 'C', _stderr, exit_code);
      modal_int.reply({ embeds: [embed] });
    }
  }
}

/**
 * @param {NewClient} client 
 */
module.exports = function(client) {
  for(const k in handlers)
    client.chat_input.on(k, handlers[k]);
}