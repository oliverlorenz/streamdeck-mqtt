#!/usr/bin/env node
import commander from 'commander';
import { StreamDeckMqttHandler } from './index';
import * as StreamDeck from 'elgato-stream-deck';

const packageJson = require('package')(module);

(async() => {
    const command = await commander
        .version(packageJson.version)
        .option('-b, --broker-url <brokerUrl>', 'broker url', 'mqtt://localhost:1883')
        .option('-t, --topic-base <topicBase>', 'base topic')
        .option('-u, --username <username>', 'mqtt username')
        .option('-p, --password <password>', 'mqtt password')
        .parseAsync(process.argv);

    const handler = new StreamDeckMqttHandler(
        await StreamDeck.openStreamDeck(),
        command.brokerUrl,
        command.topicBase,
        {
            username: command.username,
            password: command.password
        }
    );
    await handler.start();
})()
