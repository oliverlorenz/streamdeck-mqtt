import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import Logger from 'bunyan';
import match from 'mqtt-match';
// @ts-ignore
import mqttWildcard from 'mqtt-wildcard';

const EVENT_BUTTON_PROPERTY_CHANGED = 'buttonPropertyChanged';
const EVENT_BUTTON_LAYER_IMAGE_CHANGED = 'buttonLayerImageChanged';

export class MqttHandler {
  private emitter: EventEmitter;
  private mqttClient: MqttClient | undefined;
  private currentProfile: string | undefined;
  private serialNumber: string | undefined;
  private baseTopic: string | undefined;

  constructor(
    private logger: Logger
  ) {
    this.emitter = new EventEmitter();
  }

  async start(baseTopic: string, brokerUrl: string, mqttOptions?: mqtt.IClientOptions) {
    this.baseTopic = baseTopic;
    await new Promise((resolve) => {
      this.mqttClient  = mqtt.connect(
        brokerUrl,
        mqttOptions
      );
      this.mqttClient.on('connect', resolve);
      this.mqttClient.on('message', this.onMessage.bind(this));
      this.mqttClient.subscribe(`${this.baseTopic}/#`);
    })
    this.logger.info('connected', { brokerUrl });
  }

  // onProfileChanged(callback: (profileName: string) => void) {
  //   this.emitter.on(EVENT_PROFILE_CHANGED, (payload: Buffer) => {
  //     const profileName = payload.toString();
  //     this.currentProfile = profileName;
  //     this.logger.info('profile changed', { profile: payload.toString() });
  //     callback(profileName);
  //   })
  // }

  onButtonPropertyChanged(callback: (buttonIndex: number, layer: string, payload: Buffer) => void) {
    this.emitter.on(EVENT_BUTTON_PROPERTY_CHANGED, (buttonIndex: number, layer: string, payload: Buffer) => {
      this.logger.debug('button property changed', { buttonIndex, layer })
      callback(buttonIndex, layer, payload);
    });
  }

  onButtonImageLayerChanged(callback: (buttonIndex: number, layerIndex: number, payload: Buffer) => void) {
    this.emitter.on(EVENT_BUTTON_LAYER_IMAGE_CHANGED, (buttonIndex: number, layerIndex: number, payload: Buffer) => {
      this.logger.debug('button image layer changed', { buttonIndex, layerIndex })
      callback(buttonIndex, layerIndex, payload);
    });
  }

  setButtonImageLayer(buttonIndex: number, imageLayerIndex: number, imageBuffer: Buffer | string, permanent: boolean = false, qos: 1 | 2 = 1) {
    this.mqttClient?.publish(
      this.getButtonImageLayerTopic(
        buttonIndex.toString(), 
        imageLayerIndex.toString()
      ),
      imageBuffer,
      {
        retain: permanent,
        qos
      }
    )
  }

  // getProfileTopic(profileName: string) {
  //   return `${this.serialNumber}/profile/${profileName}/#`;
  // }

  getButtonTopic(profileName: string) {
    return `${this.serialNumber}/profile/${profileName}/#`;
  }

  // subscribeProfile(profileName: string) {
  //   const topic = this.getProfileTopic(profileName)
  //   this.mqttClient?.subscribe(topic);
  //   this.logger.debug('subscribe to profile', { profileName, topic })
  // }

  

  // unsubscribeProfile(profileName: string) {
  //   const topic = this.getProfileTopic(profileName)
  //   this.mqttClient?.unsubscribe(topic);
  //   this.logger.debug('unsubscribe from profile', { profileName, topic })
  // }

  // protected isCurrentProfileChanged(topic: string) {
  //   return match(`${this.serialNumber}/profile/current`, topic);
  // }

  protected getButtonImageLayerTopic(buttonIndexOrWildcard: string, layerIndexOrWildcard: string) {
    return `${this.baseTopic}/button/${buttonIndexOrWildcard}/layers/${layerIndexOrWildcard}/image`
  }

  protected getButtonDownTopic(buttonIndexOrWildcard: string) {
    return `${this.baseTopic}/button/${buttonIndexOrWildcard}/event/down`
  }

  public sendButtonDown(buttonIndex: number) {
    this.logger.debug('send button down', { buttonIndex })
    this.mqttClient?.publish(
      this.getButtonDownTopic(buttonIndex.toString()),
      Date.now().toString() 
    )
  }

  protected getButtonUpTopic(buttonIndexOrWildcard: string) {
    return `${this.baseTopic}/button/${buttonIndexOrWildcard}/event/up`
  }

  public sendButtonUp(buttonIndex: number) {
    this.logger.debug('send button up', { buttonIndex })
    this.mqttClient?.publish(
      this.getButtonUpTopic(buttonIndex.toString()),
      Date.now().toString() 
    )
  }

  protected isButtonLayerImageChangedMessage(topic: string) {
    return match(
      this.getButtonImageLayerTopic('+', '+'), 
      topic
    );
  }

  protected onMessage(topic: string, payload: Buffer) {
   if (this.isButtonLayerImageChangedMessage(topic)) {
     console.log(topic)
      const wildcard = mqttWildcard(
        topic,
        this.getButtonImageLayerTopic('+', '+'),
      );
      if (wildcard) {
        const buttonIndex = wildcard[0];
        const layerIndex = wildcard[1];
        this.emitter.emit(EVENT_BUTTON_LAYER_IMAGE_CHANGED, buttonIndex, layerIndex, payload);
      }
    }
  }
}
