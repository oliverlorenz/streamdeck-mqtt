import { MqttHandler } from "./MqttHandler";
import Logger = require("bunyan");

export class ProfileHandler {
  private profileName: string | undefined;
  private logger: Logger;

  constructor(logger: Logger, private mqttHandler: MqttHandler) {
    this.logger = logger.child({ handler: 'ProfileHandler' })
  }

  onButtonPropertyChanged(callback: (buttonIndex: number, layer: string, payload: Buffer) => void) {
    this.logger.debug('button property changed');
    this.mqttHandler.onButtonPropertyChanged(callback.bind(this));
  }

  buttonUp(buttonIndex: number) {
    this.mqttHandler.sendButtonUp(buttonIndex);
  }

  async start() {
    this.mqttHandler.onProfileChanged((profileName: string) => {
      if (this.profileName) {
        this.mqttHandler.unsubscribeProfile(this.profileName);
      }
      this.profileName = profileName;
      this.mqttHandler.subscribeProfile(profileName);
    });
  }
}
