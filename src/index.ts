import 'source-map-support/register';
import bunyan, { LogLevelString } from 'bunyan';
import { MqttHandler } from './MqttHandler';
import { config } from 'dotenv';
import { Profile } from 'elgato-stream-deck-utils';
import Logger from 'bunyan';
import * as StreamDeck from 'elgato-stream-deck';
import { IClientOptions } from 'mqtt';
config();
const packageJson = require('package')(module);

export class StreamDeckMqttHandler {
  private profile: Profile;

  constructor(
    private streamDeck: StreamDeck.StreamDeck,
    private brokerUrl: string,
    private baseTopic: string = '',
    private mqttOptions?: IClientOptions,
    private logger?: bunyan
  ) {
    this.profile = new Profile(this.streamDeck);
    if (!this.logger) {
      this.logger = bunyan.createLogger({
        name: packageJson.name,
        level: process.env.DEBUG_LEVEL as LogLevelString || 'info',
      });
    }
  }

  protected async imageChangedHandler(buttonIndex: number, imageLayerIndex: number, payload: Buffer) {
    const button = this.profile.getButtonByIndex(buttonIndex);
    if (payload.length) {
      await button.setImage(imageLayerIndex, payload);
    } else {
      await button.clearImage(imageLayerIndex);
    }
    await button.render();
  }

  async start() {
    this.streamDeck.clearAllKeys();

    const mqttHandler = new MqttHandler(this.logger as Logger);
    await mqttHandler.start(
      this.baseTopic,
      this.brokerUrl
    );

    
    mqttHandler.onButtonImageLayerChanged(this.imageChangedHandler);

    this.profile.onButtonDown((buttonIndex) => {
      mqttHandler.sendButtonDown(buttonIndex);
    });

    this.profile.onButtonUp((buttonIndex) => {
      mqttHandler.sendButtonUp(buttonIndex);
    });
  }
}
