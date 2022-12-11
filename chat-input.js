const { ChatInputCommandInteraction } = require('discord.js');
const NewClient = require('./NewClient');
const { Worker } = require('worker_threads');
const { execFile } = require('child_process');
const { writeFile } = require('fs');

/**
 * @param {string} path 
 * @param {string} data 
 */
const writeFileAsync = (path, data) => new Promise((resolve) => writeFile(path, data, resolve));

const {
  get_user_code,
  get_process_output,
  code_output_embed,
  compile_error_embed,
  indent_all_lines,
} = require('./reused-code');

const handlers = {
  /** @param {ChatInputCommandInteraction} interaction */
  async javascript(interaction) {
    const [modal_int, code, stdin] = await get_user_code(interaction, 'JavaScript');
    await modal_int.deferReply();
    const worker = new Worker(code, { eval: true, stderr: true, stdin: true, stdout: true });
    if(stdin) worker.stdin.end(stdin);
    const embed = code_output_embed(modal_int.user, code, ['js', 'JavaScript'], stdin, await get_process_output(worker));
    modal_int.followUp({ embeds: [embed] });
  },

  /** @param {ChatInputCommandInteraction} interaction */
  async python(interaction) {
    const [modal_int, code, stdin, cli_args] = await get_user_code(interaction, 'Python');
    await modal_int.deferReply();
    const args = ['-c', code];
    if(cli_args) args.concat(cli_args);
    const child = execFile('python', args);
    if(stdin) child.stdin.end(stdin);
    const embed = code_output_embed(modal_int.user, code, ['py', 'Python'], stdin, await get_process_output(child));
    modal_int.followUp({ embeds: [embed] });
  },

  /** @param {ChatInputCommandInteraction} interaction */
  async c(interaction) {
    const { options } = interaction;
    const surround_with_main = options.getInteger('surround_with_main', true);
    const auto_include_headers = options.getBoolean('auto_include_headers', true);

    let [modal_int, code, stdin] = await get_user_code(interaction, 'C');
    await modal_int.deferReply();

    if(surround_with_main) {
      code = indent_all_lines(code, 2);
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

    const [_, stderr, exit_code] = await get_process_output(child);
    if(stderr.length > 0) {
      const embed = compile_error_embed(modal_int.user, ['c', 'C'], code, stderr, exit_code);
      modal_int.followUp({ embeds: [embed] });
      return;
    }

    child = execFile('./a.out');
    const embed = code_output_embed(modal_int.user, code, ['c', 'C'], stdin, await get_process_output(child));

    modal_int.followUp({ embeds: [embed] });
  },

  /** @param {ChatInputCommandInteraction} interaction */
  async java(interaction) {
    const { options } = interaction;

    // below commented code is for checking versions of compilers and runtimes
    
    // switch(options.getSubcommand()) {
    //   case 'version': {
    //     const embed = new EmbedBuilder({
    //       title: 'Checking Java versions'
    //     });
    //     let child = execFile('java', ['-version']);
    //     embed.addFields({ name: '`java -version`', value: (await get_process_output(child))[1] });
    //     child = execFile('javac', ['-version']);
    //     embed.addFields({ name: '`javac -version`', value: (await get_process_output(child))[0] });
    //     modal_int.reply({ embeds: [embed] });
    //     return;
    //   }
    // }

    const surround_with_main = options.getBoolean('surround_with_main', true);
    const println_shorthand = options.getBoolean('println_shorthand', true);

    let [modal_int, code, stdin] = await get_user_code(interaction, 'Java');
    await modal_int.deferReply();

    if(surround_with_main) {
      code = indent_all_lines(code, 4);
      code = `class __ {\n  public static void main(String[] args) {\n${code}\n  }\n}`
    }

    if(println_shorthand)
      code = code.replaceAll('println', 'System.out.println');
    
    await writeFileAsync('./__.java', code);

    let child = execFile('javac', ['__.java']);
    
    const [_, stderr, exit_code] = await get_process_output(child);
    if(stderr.length > 0) {
      const embed = compile_error_embed(modal_int.user, ['java', 'Java'], code, stderr, exit_code);
      modal_int.followUp({ embeds: [embed] });
      return;
    }

    child = execFile('java', ['__']);
    const embed = code_output_embed(modal_int.user, code, ['java', 'Java'], stdin, await get_process_output(child));

    modal_int.followUp({ embeds: [embed] });
  },
}

/**
 * @param {NewClient} client 
 */
module.exports = function(client) {
  for(const k in handlers)
    client.chat_input.on(k, handlers[k]);
}