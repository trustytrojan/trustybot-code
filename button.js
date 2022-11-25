const Discord = require('discord.js');
const NewClient = require('./NewClient');
const { randomUUID } = require('crypto');
const { Worker } = require('worker_threads');
const { execFile, ChildProcess } = require('child_process');
const { once } = require('events');

const handlers = {
  /** @param {Discord.ButtonInteraction} interaction */
  
};

/** @param {NewClient} client */
module.exports = function(client) {
  for(const k in handlers)
    client.button.on(k, handlers[k]);
};