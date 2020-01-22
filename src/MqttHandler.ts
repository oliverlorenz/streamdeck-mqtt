import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import Logger from 'bunyan';
import match from 'mqtt-match';

const EVENT_PROFILE_CHANGED = 'profileChanged';
const EVENT_BUTTON_PROPERTY_CHANGED = 'buttonPropertyChanged';

export class MqttHandler {
  private emitter: EventEmitter;
  private logger: Logger;
  private mqttClient: MqttClient | undefined;
  private currentProfile: string | undefined;
  private serialNumber: string | undefined;

  constructor(logger: Logger) {
    this.emitter = new EventEmitter();
    this.logger = logger.child({ handler: 'MqttHandler' });
    this.serialNumber = process.env.STREAMDECK_SERIALNUMBER;
  }

  async start() {
    await new Promise((resolve) => {
      this.mqttClient  = mqtt.connect(
        process.env.MQTT_BROKER_URL,
        {
          password: process.env.MQTT_BROKER_PASSWORD,
          username: process.env.MQTT_BROKER_USERNAME,
        }
      );
      this.mqttClient.on('connect', resolve);
      this.mqttClient.on('message', this.onMessage.bind(this));
      this.mqttClient.subscribe(`${this.serialNumber}/#`);
    })
    this.logger.info('connected', { brokerUrl: process.env.MQTT_BROKER_URL });
  }

  onProfileChanged(callback: (profileName: string) => void) {
    this.emitter.on(EVENT_PROFILE_CHANGED, (payload: Buffer) => {
      const profileName = payload.toString();
      this.currentProfile = profileName;
      this.logger.info('profile changed', { profile: payload.toString() });
      callback(profileName);
    })
  }

  onButtonPropertyChanged(callback: (buttonIndex: number, layer: string, payload: Buffer) => void) {
    this.emitter.on(EVENT_BUTTON_PROPERTY_CHANGED, (buttonIndex: number, layer: string, payload: Buffer) => {
      this.logger.debug('button property changed', { buttonIndex, layer })
      callback(buttonIndex, layer, payload);
    });
  }

  getProfileTopic(profileName: string) {
    return `${this.serialNumber}/profile/${profileName}/#`;
  }

  getButtonTopic(profileName: string) {
    return `${this.serialNumber}/profile/${profileName}/#`;
  }

  subscribeProfile(profileName: string) {
    const topic = this.getProfileTopic(profileName)
    this.mqttClient?.subscribe(topic);
    this.logger.debug('subscribe to profile', { profileName, topic })
  }

  sendButtonUp(buttonIndex: number) {
    const topic = `${this.serialNumber}/profile/${this.currentProfile}/button/${buttonIndex}/function`;
    this.logger.debug('send button up', { buttonIndex })
    this.mqttClient?.publish(topic, 'up')
  }

  unsubscribeProfile(profileName: string) {
    const topic = this.getProfileTopic(profileName)
    this.mqttClient?.unsubscribe(topic);
    this.logger.debug('unsubscribe from profile', { profileName, topic })
  }

  protected isCurrentProfileChanged(topic: string) {
    return match(`${this.serialNumber}/profile/current`, topic);
  }

  protected isButtonLayerChanged(topic: string) {
    return match(`${this.serialNumber}/profile/${this.currentProfile}/button/+/layers/+`, topic);
  }

  protected onMessage(topic: string, payload: Buffer) {
    this.logger.debug('got message', { topic });
    if (this.isCurrentProfileChanged(topic)) {
      this.emitter.emit(EVENT_PROFILE_CHANGED, payload);
    } else if (this.isButtonLayerChanged(topic)) {
      const topicParts = topic.split('/');
      const buttonIndex = topicParts[4];
      const layer = topicParts[5];
      this.emitter.emit(EVENT_BUTTON_PROPERTY_CHANGED, buttonIndex, layer, payload);
    }
  }
}
