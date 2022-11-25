const Discord = require('discord.js');
const { ActionRow, TextInput, Button } = Discord.ComponentType;

const modal_wait_time = 300_000;

/**
 * @param {string} customId 
 * @param {string} label 
 * @param {Discord.TextInputStyle} style 
 */
const modalRow = (customId, label, style, required = false) => ({ type: ActionRow, components: [{ type: TextInput, customId, label, style, required }] });

/** 
 * @param {Discord.ChatInputCommandInteraction} interaction
 * @returns {Promise<[Discord.ModalSubmitInteraction, string, string]>}
 */
 async function get_code(interaction) {
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
async function get_output(_process, _stdin) {
  if(!_process.stdin) { await modal_int.reply('an internal error has occurred! please try again!'); return; }
  if(_stdin) _process.stdin.end(_stdin);
  let _stdout = '';
  let _stderr = '';
  _process.stdout.on('data', (chunk) => _stdout += chunk);
  _process.stderr.on('data', (chunk) => _stderr += chunk);
  const [exit_code] = await once(_process, 'exit');
  return [_stdout, _stderr, exit_code];
}

/**
 * @param {Discord.ModalSubmitInteraction} modal_int 
 * @param {string} code 
 * @param {string} stdin 
 * @param {[string, string, number]}
 */
function send_embed(modal_int, code, stdin, [stdout, stderr, exit_code]) {
  const { user } = modal_int;

  const fields = [{ name: 'Your code', value: `\`\`\`py\n${code}\`\`\`` }];
  if(stdin?.length > 0)
    fields.push({ name: 'Standard input (`stdin`)', value: `\`\`\`${stdin}\`\`\`` });
  if(stdout.length > 0)
    fields.push({ name: 'Standard output (`stdout`)', value: `\`\`\`${stdout}\`\`\`` });
  if(stderr.length > 0)
    fields.push({ name: 'Standard error (`stderr`)', value: `\`\`\`${stderr}\`\`\`` });

  const embed = {
    author: { name: user.tag, iconURL: user.displayAvatarURL() },
    title: `Running your ${lang} code`,
    fields,
    footer: { text: `Exit code: ${exit_code}` }
  };

  const reuse_button = { type: Button, customId: 'rerun',  };

  modal_int.reply({ embeds: [embed], components: [{ type: ActionRow, components: [reuse_button] }] });
}

module.exports = {
  get modal_wait_time() { return modal_wait_time; },
  get modalRow() { return modalRow; },
  get get_code() { return get_code; },
  get get_output() { return get_output; },
  get send_embed() { return send_embed; }
};