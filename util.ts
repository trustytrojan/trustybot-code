import { randomUUID } from 'crypto';
import { Worker } from 'worker_threads';
import { ChildProcess } from 'child_process';
import { once } from 'events';

import {
  ComponentType,
  ButtonStyle,
  TextInputStyle,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  APIEmbed,
  APIEmbedField,
  APIActionRowComponent,
  APITextInputComponent,
  JSONEncodable,
  User
} from 'discord.js';

const { ActionRow, TextInput } = ComponentType;
const { Paragraph, Short } = TextInputStyle;

const modal_wait_time = 300_000;

export const modal_row = (
  custom_id: string,
  label: string,
  style: TextInputStyle,
  required: boolean = false
): JSONEncodable<APIActionRowComponent<APITextInputComponent>> => ({
  toJSON: () => ({
    type: ActionRow,
    components: [{ type: TextInput, custom_id, label, style, required }]
  })
});

interface UserCodeAndInput {
  modal_int: ModalSubmitInteraction,
  code: string,
  stdin?: string,
  cli_args?: string[]
}

interface ProgLangStrings {
  short: string;
  long: string;
}

export async function get_user_code_and_input(
  interaction: ChatInputCommandInteraction,
  { long: language }: ProgLangStrings
): Promise<UserCodeAndInput | undefined> {
  const { user } = interaction;
  const customId = randomUUID();
  await interaction.showModal({ customId, title: `Paste your ${language} code here`, components: [
    modal_row('code', 'code', Paragraph, true),
    modal_row('stdin', 'user input (stdin)', Paragraph),
    modal_row('cli_args', 'command line arguments', Short)
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
  return { modal_int, code, stdin, cli_args: cli_args?.split(' ') };
}

interface ProcessOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export async function get_process_output(
  process: Worker | ChildProcess
): Promise<ProcessOutput> {
  if(!process.stdout)
    throw new TypeError('process.stdout is null!');
  if(!process.stderr)
    throw new TypeError('process.stderr is null!');
  let stdout = '';
  let stderr = '';
  process.stdout.on('data', (chunk) => stdout += chunk);
  process.stderr.on('data', (chunk) => stderr += chunk);
  const [exit_code] = await once(process, 'exit');
  return { stdout, stderr, exit_code };
}

export function compile_error_embed(
  user: User,
  lang: ProgLangStrings,
  code: string,
  compiler_errors: string,
  exit_code: number
): APIEmbed {
  const compiler = {
    c: 'gcc',
    java: 'javac'
  }[lang.short];

  return {
    author: { name: user.tag, icon_url: user.displayAvatarURL() },
    title: `Compile error!`,
    description: `Your ${lang.long} code failed to compile! See the errors below.`,
    fields: [
      { name: 'Your code', value: `\`\`\`${lang.short}\n${code}\`\`\`` },
      { name: `\`${compiler}\``, value: `\`\`\`${compiler_errors}\`\`\``  }
    ],
    footer: { text: `Compiler exit code: ${exit_code}` }
  };
}

export const compile_success_embed = (
  user: User,
  lang: string,
  language: string,
  code: string,
  exit_code: string
): APIEmbed => ({
  author: { name: user.tag, icon_url: user.displayAvatarURL() },
  title: `Compile success!`,
  description: `Your ${language} code has successfully compiled.\`\`\`${lang}\n${code}\`\`\``,
  footer: { text: `gcc exit code: ${exit_code}` }
});

export function code_output_embed(
  user: User,
  code: string,
  lang: ProgLangStrings,
  stdin: string,
  { stdout, stderr, exit_code }: ProcessOutput
): APIEmbed {
  const fields: APIEmbedField[] = [
    { name: `Your ${lang.long} code`, value: `\`\`\`${lang.short}\n${code}\`\`\`` }
  ];

  if(stdin.length > 0)
    fields.push({ name: 'Standard input (`stdin`)', value: `\`\`\`${stdin}\`\`\`` });
  if(stdout.length > 0)
    fields.push({ name: 'Standard output (`stdout`)', value: `\`\`\`${stdout}\`\`\`` });
  if(stderr.length > 0)
    fields.push({ name: 'Standard error (`stderr`)', value: `\`\`\`${stderr}\`\`\`` });
  
  if(stdout.length === 0 && stderr.length === 0)
    fields.push({ name: 'No output!', value: 'Your code did not generate any output.' });

  return {
    author: { name: user.tag, icon_url: user.displayAvatarURL() },
    title: `Running your ${lang.long} code`,
    fields,
    footer: { text: `Process exit code: ${exit_code}` }
  };
}