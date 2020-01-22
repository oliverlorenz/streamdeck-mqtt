import 'source-map-support/register';
import { UsbHandler } from './UsbHandler';
import { StreamDeckHandler } from './StreamDeckHandler';
import bunyan from 'bunyan';
import { StreamDeck } from 'elgato-stream-deck';
import { MqttHandler } from './MqttHandler';
import { ProfileHandler } from './ProfileHandler';
import { config } from 'dotenv';

config();

const logger = bunyan.createLogger({
  name: 'streamdeck',
  level: 'debug',
});

const usbHandler = new UsbHandler(logger);
const streamDeckHandler = new StreamDeckHandler(usbHandler);

streamDeckHandler.onReady(async (streamDeck: StreamDeck) => {
  streamDeck.on('up', (buttonIndex) => {
    profileHandler.buttonUp(buttonIndex);
  });

  const mqttHandler = new MqttHandler(logger);
  await mqttHandler.start();

  const profileHandler = new ProfileHandler(logger, mqttHandler);
  await profileHandler.start();

  profileHandler.onButtonPropertyChanged((buttonIndex, layer, payload) => {
    streamDeck.fillImage(buttonIndex, payload);
  });
});

streamDeckHandler.start();
