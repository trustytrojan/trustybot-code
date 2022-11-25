const NewClient = require('./NewClient');

const client = new NewClient({ intents: [] });

client.on('ready', (client) => {
  //setCommands();
  console.log(`Logged in as ${client.user.tag}!`);
});

// register chat input command handlers
require('./chat-input')(client);

process.on('uncaughtException', (err) => { console.error(err); kill(); });
process.on('SIGTERM', kill);
process.on('SIGINT', kill);

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