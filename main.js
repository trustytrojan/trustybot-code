const NewClient = require('./NewClient');

const client = new NewClient({ intents: [] });

client.on('ready', (client) => {
  //client.application.commands.set(require('./command-data'));
  console.log(`Logged in as ${client.user.tag}!`);
});

// register chat input command handlers
require('./chat-input')(client);

process.on('uncaughtException', (err) => { console.error(err); kill(); });
process.on('SIGTERM', kill);
process.on('SIGINT', kill);

function kill() {
  client.destroy();
  process.exit();
}

client.login(require('./token.json'));