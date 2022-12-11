const { randomUUID } = require('crypto');
const { Worker } = require('worker_threads');
const { ChildProcess } = require('child_process');
const { once } = require('events');

const Discord = require('discord.js');
const { ActionRow, TextInput, Button } = Discord.ComponentType;
const { Primary } = Discord.ButtonStyle;
const { Paragraph, Short } = Discord.TextInputStyle;

const modal_wait_time = 300_000;

/**
 * @param {string} customId 
 * @param {string} label 
 * @param {Discord.TextInputStyle} style 
 */
const modalRow = (customId, label, style, required = false) => ({ type: ActionRow, components: [{ type: TextInput, customId, label, style, required }] });

/** 
 * @param {Discord.ChatInputCommandInteraction} interaction
 * @param {string} language
 * @returns {Promise<[Discord.ModalSubmitInteraction, string, string?, string[]?]>}
 */
 async function get_user_code(interaction, language) {
  const { user } = interaction;
  const customId = randomUUID();
  await interaction.showModal({ customId, title: `Paste your ${language} code here`, components: [
    modalRow('code', 'code', Paragraph, true),
    modalRow('stdin', 'user input (stdin)', Paragraph),
    modalRow('cli_args', 'command line arguments', Short)
  ] });
  let modal_int;
  try { modal_int = await interaction.awaitModalSubmit({ filter: (m) => m.customId === customId, time: modal_wait_time }); }
  catch(err) { await interaction.followUp(`${user} you took too long to submit your code`); return; }
  const code = modal_int.fields.getTextInputValue('code');
  let stdin, cli_args;
  try {
    stdin = modal_int.fields.getTextInputValue('stdin');
    cli_args = modal_int.fields.getTextInputValue('cli_args');
  } catch(err) { void err; }
  return [modal_int, code, stdin, cli_args?.split(' ')];
}

/**
 * @param {Worker | ChildProcess} process 
 * @returns {Promise<[string, string, number]>}
 */
async function get_process_output(process) {
  //if(!process.stdin) { await modal_int.reply('an internal error has occurred! please try again!'); return; }
  let stdout = '';
  let stderr = '';
  process.stdout.on('data', (chunk) => stdout += chunk);
  process.stderr.on('data', (chunk) => stderr += chunk);
  const [exit_code] = await once(process, 'exit');
  return [stdout, stderr, exit_code];
}

/**
 * @param {Discord.User} user 
 * @param {[string, string]} 
 * @param {string} stderr 
 * @param {number} exit_code 
 */
function compile_error_embed(user, [lang, language], code, errors, exit_code) {
  const compiler = {
    c: 'gcc',
    java: 'javac'
  }[lang];

  /** @type {Discord.APIEmbed} */
  const embed = {
    author: { name: user.tag, iconURL: user.displayAvatarURL() },
    title: `Compile error!`,
    description: `Your ${language} code failed to compile! See the errors below.`,
    fields: [
      { name: 'Your code', value: `\`\`\`${lang}\n${code}\`\`\`` },
      { name: `\`${compiler}\``, value: `\`\`\`${errors}\`\`\``  }
    ],
    footer: { text: `gcc exit code: ${exit_code}` }
  };

  return embed;
}

/**
 * @param {Discord.User} user 
 * @param {[string, string]} 
 * @param {string} code 
 * @param {number} exit_code 
 */
function compile_success_embed(user, [lang, language], code, exit_code) {
  /** @type {Discord.APIEmbed} */
  const embed = {
    author: { name: user.tag, iconURL: user.displayAvatarURL() },
    title: `Compile success!`,
    description: `Your ${language} code has successfully compiled.\`\`\`${lang}\n${code}\`\`\``,
    footer: { text: `gcc exit code: ${exit_code}` }
  };

  return embed;
}

/**
 * @param {string} code 
 * @param {[string, string]}
 * @param {string} stdin 
 * @param {[string, string, number]}
 */
function code_output_embed(user, code, [lang, language], stdin = '', [stdout, stderr, exit_code]) {
  /** @type {Discord.APIEmbedField[]} */
  const fields = [{ name: `Your ${language} code`, value: `\`\`\`${lang}\n${code}\`\`\`` }];

  if(stdin.length > 0)
    fields.push({ name: 'Standard input (`stdin`)', value: `\`\`\`${stdin}\`\`\`` });
  if(stdout.length > 0)
    fields.push({ name: 'Standard output (`stdout`)', value: `\`\`\`${stdout}\`\`\`` });
  if(stderr.length > 0)
    fields.push({ name: 'Standard error (`stderr`)', value: `\`\`\`${stderr}\`\`\`` });
  
  if(stdout.length === 0 && stderr.length === 0)
    fields.push({ name: 'No output!', value: 'Your code did not generate any output.' });

  /** @type {Discord.APIEmbed} */
  const embed = {
    author: { name: user.tag, iconURL: user.displayAvatarURL() },
    title: `Running your ${language} code`,
    fields,
    footer: { text: `Process exit code: ${exit_code}` }
  };

  return embed;
}

/** 
 * @param {string} code
 * @param {number} num_spaces
 */
function indent_all_lines(code, num_spaces) {
  const lines = code.split('\n');
  for(let i = 0; i < lines.length; ++i)
    for(let j = 0; j < num_spaces; ++j)
      lines[i] = ' '+lines[i];
  lines[lines.length-1].replace('\n', '');
  return lines.join('\n');
}

const rerun_button = { type: Button, customId: 'rerun', label: 'Rerun code with new input', emoji: '🔁', style: Primary };

module.exports = {
  get modal_wait_time() { return modal_wait_time; },
  get modalRow() { return modalRow; },
  get get_user_code() { return get_user_code; },
  get get_process_output() { return get_process_output; },
  get compile_error_embed() { return compile_error_embed; },
  get code_output_embed() { return code_output_embed; },
  get compile_success_embed() { return compile_success_embed; },
  get indent_all_lines() { return indent_all_lines; }
};