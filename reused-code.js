const Discord = require('discord.js');
const { Worker } = require('worker_threads');
const { ChildProcess } = require('child_process');
const { ActionRow, TextInput, Button } = Discord.ComponentType;
const { Primary } = Discord.ButtonStyle;

const modal_wait_time = 300_000;

/**
 * @param {string} customId 
 * @param {string} label 
 * @param {Discord.TextInputStyle} style 
 */
const modalRow = (customId, label, style, required = false) => ({ type: ActionRow, components: [{ type: TextInput, customId, label, style, required }] });

/** 
 * @param {Discord.ChatInputCommandInteraction} interaction
 * @returns {Promise<[Discord.ModalSubmitInteraction, string, string | undefined]>}
 */
 async function get_user_code(interaction) {
  const { user } = interaction;
  const customId = randomUUID();
  await interaction.showModal({ customId, title: 'Paste your code here', components: [
    modalRow('code', 'code', Paragraph, true),
    modalRow('stdin', 'user input (stdin)', Paragraph)
  ] });
  let modal_int;
  try { modal_int = await interaction.awaitModalSubmit({ filter: (m) => m.customId === customId, time: modal_wait_time }); }
  catch(err) { await interaction.followUp(`${user} you took too long to submit your code`); return; }
  const code = modal_int.fields.getTextInputValue('code');
  let stdin;
  try { stdin = modal_int.fields.getTextInputValue('stdin'); }
  catch(err) { void err; }
  return [modal_int, code, stdin];
}

/**
 * @param {Worker | ChildProcess} _process 
 * @returns {Promise<[string, string, number]>}
 */
async function get_process_output(_process) {
  if(!_process.stdin) { await modal_int.reply('an internal error has occurred! please try again!'); return; }
  let _stdout = '';
  let _stderr = '';
  _process.stdout.on('data', (chunk) => _stdout += chunk);
  _process.stderr.on('data', (chunk) => _stderr += chunk);
  const [exit_code] = await once(_process, 'exit');
  return [_stdout, _stderr, exit_code];
}

/**
 * @param {Discord.User} user 
 * @param {string} stderr 
 * @param {number} exit_code 
 */
function compile_error_embed(user, lang, stderr, exit_code) {
  /** @type {Discord.APIEmbed} */
  const embed = {
    author: { name: user.tag, iconURL: user.displayAvatarURL() },
    title: `Compile error!`,
    description: `Your ${lang} code failed to compile! Errors will be shown below.\`\`\`${stderr}\`\`\``,
    footer: { text: `gcc exit code: ${exit_code}` }
  };

  return embed;
}

/**
 * @param {string} code 
 * @param {string} stdin 
 * @param {[string, string, number]}
 */
function code_output_embed(code, stdin = '', [stdout, stderr, exit_code]) {
  const { user } = modal_int;

  /** @type {Discord.APIEmbedField[]} */
  const fields = [{ name: 'Your code', value: `\`\`\`py\n${code}\`\`\`` }];

  if(stdin.length > 0)
    fields.push({ name: 'Standard input (`stdin`)', value: `\`\`\`${stdin}\`\`\`` });
  if(stdout.length > 0)
    fields.push({ name: 'Standard output (`stdout`)', value: `\`\`\`${stdout}\`\`\`` });
  if(stderr.length > 0)
    fields.push({ name: 'Standard error (`stderr`)', value: `\`\`\`${stderr}\`\`\`` });

  /** @type {Discord.APIEmbed} */
  const embed = {
    author: { name: user.tag, iconURL: user.displayAvatarURL() },
    title: `Running your ${lang} code`,
    fields,
    footer: { text: `Process exit code: ${exit_code}` }
  };

  return embed;
}

/**
 * @param {Discord.ModalSubmitInteraction} modal_int 
 * @param {Discord.APIEmbed} embed 
 */
function reply_success(modal_int, embed) {
  /** @type {Discord.APIButtonComponent} */
  const reuse_button = { type: Button, customId: 'rerun', label: 'Rerun code with new input', emoji: '🔁', style: Primary };

  modal_int.reply({ embeds: [embed], components: [{ type: ActionRow, components: [reuse_button] }] });
}

/**
 * @param {Discord.ModalSubmitInteraction} modal_int 
 * @param {string} code 
 * @param {string} stdin 
 * @param {[string, string, number]}
 */
function send_embed(modal_int, code, stdin, [stdout, stderr, exit_code]) {
  

  
}

module.exports = {
  get modal_wait_time() { return modal_wait_time; },
  get modalRow() { return modalRow; },
  get get_user_code() { return get_user_code; },
  get get_process_output() { return get_process_output; },
  get compile_error_embed() { return compile_error_embed; },
  get code_output_embed() { return code_output_embed; },
  get send_embed() { return send_embed; }
};