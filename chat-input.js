const Discord = require('discord.js');
const NewClient = require('./NewClient');
const { Worker } = require('worker_threads');
const { execFile } = require('child_process');
const { rm } = require('fs');

const {
  get_user_code,
  get_process_output,
  code_output_embed,
  compile_error_embed,
} = require('./reused-code');

const handlers = {
  /** @param {Discord.ChatInputCommandInteraction} interaction */
  ping: (interaction) => interaction.reply(`\`${interaction.client.ws.ping}ms\``),

  /** @param {Discord.ChatInputCommandInteraction} interaction */
  async javascript(interaction) {
    const [modal_int, code, stdin] = await get_user_code(interaction, 'JavaScript');
    const worker = new Worker(code, { eval: true, stderr: true, stdin: true, stdout: true });
    if(stdin) worker.stdin.end(stdin);
    const embed = code_output_embed(modal_int.user, code, ['js', 'JavaScript'], stdin, await get_process_output(worker));
    modal_int.reply({ embeds: [embed] });
  },

  /** @param {Discord.ChatInputCommandInteraction} interaction */
  async python(interaction) {
    const [modal_int, code, stdin] = await get_user_code(interaction, 'Python');
    const child = execFile('python', ['-c', code]);
    if(stdin) child.stdin.end(stdin);
    const embed = code_output_embed(modal_int.user, code, ['py', 'Python'], stdin, await get_process_output(child));
    modal_int.reply({ embeds: [embed] });
  },

  /** @param {Discord.ChatInputCommandInteraction} interaction */
  async c(interaction) {
    const [modal_int, code, stdin] = await get_user_code(interaction, 'C');

    // gcc will compile the user's code from stdin
    let child = execFile('gcc', ['-x', 'c', '-']);
    child.stdin.end(code);

    let [_, stderr, exit_code] = await get_process_output(child);
    if(stderr.length > 0) {
      const embed = compile_error_embed(modal_int.user, 'C', code, stderr, exit_code);
      modal_int.reply({ embeds: [embed] });
      return;
    }

    child = execFile('./a.out');
    const embed = code_output_embed(modal_int.user, code, ['C', 'C'], stdin, await get_process_output(child));
    rm('./a.out', () => {});

    modal_int.reply({ embeds: [embed] });
  }
}

/**
 * @param {NewClient} client 
 */
module.exports = function(client) {
  for(const k in handlers)
    client.chat_input.on(k, handlers[k]);
}