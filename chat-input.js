const { ChatInputCommandInteraction } = require('discord.js');
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
  /** @param {ChatInputCommandInteraction} interaction */
  async javascript(interaction) {
    const [modal_int, code, stdin] = await get_user_code(interaction, 'JavaScript');
    const worker = new Worker(code, { eval: true, stderr: true, stdin: true, stdout: true });
    if(stdin) worker.stdin.end(stdin);
    const embed = code_output_embed(modal_int.user, code, ['js', 'JavaScript'], stdin, await get_process_output(worker));
    modal_int.reply({ embeds: [embed] });
  },

  /** @param {ChatInputCommandInteraction} interaction */
  async python(interaction) {
    const [modal_int, code, stdin, cli_args] = await get_user_code(interaction, 'Python');
    const args = ['-c', code];
    if(cli_args) args.concat(cli_args);
    const child = execFile('python', args);
    if(stdin) child.stdin.end(stdin);
    const embed = code_output_embed(modal_int.user, code, ['py', 'Python'], stdin, await get_process_output(child));
    modal_int.reply({ embeds: [embed] });
  },

  /** @param {ChatInputCommandInteraction} interaction */
  async c(interaction) {
    const { options } = interaction;
    const surround_with_main = options.getInteger('surround_with_main', true);
    const auto_include_headers = options.getBoolean('auto_include_headers', true);

    let [modal_int, code, stdin] = await get_user_code(interaction, 'C');

    if(surround_with_main) {
      const lines = code.split('\n');
      for(let i = 0; i < lines.length; ++i)
        lines[i] = '  '+lines[i];
      lines[lines.length-1].replace('\n', '');
      code = lines.join('\n');
      switch(surround_with_main) {
        case 1: code = `int main() {\n${code}\n}`; break;
        case 2: code = `int main(int argc, char* argv[]) {\n${code}\n}`;
      }
    }

    if(auto_include_headers) {
      code = `#include <stdio.h>\n${code}`;
      if(code.includes('malloc')) code = `#include <stdlib.h>\n`;
    }

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
  },

  /** @param {ChatInputCommandInteraction} interaction */
  async java(interaction) {
    const [modal_int, code, stdin] = await get_user_code(interaction, 'Python');
  },
}

/**
 * @param {NewClient} client 
 */
module.exports = function(client) {
  for(const k in handlers)
    client.chat_input.on(k, handlers[k]);
}