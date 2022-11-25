const { randomUUID } = require('crypto');
const { Worker } = require('worker_threads');
const { execFile } = require('child_process');
const { once } = require('events');
const { writeFile, rm } = require('fs');

const Discord = require('discord.js');

const { Button, TextInput, ActionRow } = Discord.ComponentType;
const { Short, Paragraph } = Discord.TextInputStyle;

const client = new Discord.Client({ intents: [] });

client.on('ready', (client) => {
  //setCommands();
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
  if(!interaction.isChatInputCommand()) return;
  const { commandName, options, user } = interaction;
  switch(commandName) {
    case 'ping': await interaction.reply(`\`${client.ws.ping}ms\``); break;

    case 'javascript': {
      // get the code from the user
      const customId = randomUUID();
      await interaction.showModal({ customId, title: 'Paste your code here', components: [
        modalRow('code', 'code', Paragraph, true),
        modalRow('stdin', 'user input (stdin)', Paragraph)
      ] });
      let modal_int;
      try { modal_int = await interaction.awaitModalSubmit({ filter: (m) => m.customId === customId, time: 60_000 }); }
      catch(err) { await interaction.followUp(`${user} you took too long to submit your code`); return; }
      const code = modal_int.fields.getTextInputValue('code');
      let _stdin;
      try { _stdin = modal_int.fields.getTextInputValue('stdin'); }
      catch(err) { void err; }

      // execute the code in a separate thread
      const worker = new Worker(code, { eval: true, stderr: true, stdin: true, stdout: true });
      if(_stdin) worker.stdin.write(_stdin);
      let _stdout = '';
      let _stderr = '';
      worker.stdout.on('data', (chunk) => _stdout += chunk);
      worker.stderr.on('data', (chunk) => _stderr += chunk);
      const [exit_code] = await once(worker, 'exit');

      // send the user's code along with its output
      const fields = [{ name: 'Your code', value: `\`\`\`js\n${code}\`\`\`` }];
      if(_stdin?.length > 0)
        fields.push({ name: 'Standard input (`stdin`)', value: `\`\`\`${_stdin}\`\`\`` });
      if(_stdout.length > 0)
        fields.push({ name: 'Standard output (`stdout`)', value: `\`\`\`${_stdout}\`\`\`` });
      if(_stderr.length > 0)
        fields.push({ name: 'Standard error (`stderr`)', value: `\`\`\`${_stderr}\`\`\`` });

      await modal_int.reply({ embeds: [{
        author: { name: user.tag, iconURL: user.displayAvatarURL() },
        title: 'Running your Javascript code',
        fields,
        footer: { text: `Exit code: ${exit_code}` }
      }] });
    } break;

    case 'python': {
      // get the code from the user
      const customId = randomUUID();
      await interaction.showModal({ customId, title: 'Paste your code here', components: [
        modalRow('code', 'code', Paragraph, true),
        modalRow('stdin', 'user input (stdin)', Paragraph)
      ] });
      let modal_int;
      try { modal_int = await interaction.awaitModalSubmit({ filter: (m) => m.customId === customId, time: 60_000 }); }
      catch(err) { await interaction.followUp(`${user} you took too long to submit your code`); return; }
      const code = modal_int.fields.getTextInputValue('code');
      let _stdin;
      try { _stdin = modal_int.fields.getTextInputValue('stdin'); }
      catch(err) { void err; }

      // save the code to a temporary file
      const filename = `${customId}.py`;
      await new Promise((resolve) => writeFile(filename, code, resolve));

      // run the code in a child process
      const child = execFile('python', [filename]);
      if(_stdin) child.stdin.write(_stdin);
      let _stdout = '';
      let _stderr = '';
      child.stdout.on('data', (chunk) => _stdout += chunk);
      child.stderr.on('data', (chunk) => _stderr += chunk);
      const [exit_code] = await once(child, 'exit');

      // delete the temporary file
      rm(filename, () => {});

      // send the user's code along with its output
      const fields = [{ name: 'Your code', value: `\`\`\`js\n${code}\`\`\`` }];
      if(_stdin?.length > 0)
        fields.push({ name: 'Standard input (`stdin`)', value: `\`\`\`${_stdin}\`\`\`` });
      if(_stdout.length > 0)
        fields.push({ name: 'Standard output (`stdout`)', value: `\`\`\`${_stdout}\`\`\`` });
      if(_stderr.length > 0)
        fields.push({ name: 'Standard error (`stderr`)', value: `\`\`\`${_stderr}\`\`\`` });

      await modal_int.reply({ embeds: [{
        author: { name: user.tag, iconURL: user.displayAvatarURL() },
        title: 'Running your Python code',
        fields,
        footer: { text: `Exit code: ${exit_code}` }
      }] });
    } break;

    case 'c': {

    } break;
  }
});

process.on('uncaughtException', (err) => { console.error(err); kill(); });
process.on('SIGTERM', kill);
process.on('SIGINT', kill);

/**
 * @param {string} customId 
 * @param {string} label 
 * @param {Discord.TextInputStyle} style 
 */
const modalRow = (customId, label, style, required = false) => ({ type: ActionRow, components: [{ type: TextInput, customId, label, style, required }] });

// this should only be run in the 'ready' event listener
function setCommands() {
  client.application.commands.set(require('./command-data'));
}

function kill() {
  client.destroy();
  console.log('Bot destroyed.');
  process.exit();
}

client.login(require('./token.json'));
