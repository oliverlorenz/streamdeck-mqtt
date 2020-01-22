import { UsbHandler } from './UsbHandler';
import { EventEmitter } from 'events';
// tslint:disable-next-line: import-name
import * as ElgatoStreamDeck from 'elgato-stream-deck'
// @ts-ignore
import Logger = require('bunyan');

export class StreamDeckHandler {
  private emitter: EventEmitter;
  private streamDeck: ElgatoStreamDeck.StreamDeck | undefined;
  protected logger: Logger;

  constructor(protected usbHandler: UsbHandler) {
    this.emitter = new EventEmitter();
    this.logger = usbHandler.logger.child({
      component: 'StreamDeckHandler',
    });
  }

  private emitReady(streamDeck: any) {
    this.logger.debug('Streamdeck is ready emit');
    this.emitter.emit('ready', streamDeck);
  }

  private getStreamDeck(): ElgatoStreamDeck.StreamDeck {
    if (!this.streamDeck) {
      this.logger.debug('stream deck opening');
      this.streamDeck = ElgatoStreamDeck.openStreamDeck();
      this.logger.info('stream deck opened', { serialNumber: this.streamDeck.getSerialNumber() });
    }
    return this.streamDeck;
  }

  public start() {
    if (this.usbHandler.isStreamDeckAttached()) {
      this.logger.debug('streamdeck is ready');
      this.emitReady(this.getStreamDeck());
    }
    this.usbHandler.onAttached(() => {
      this.emitReady(this.getStreamDeck());
    });
  }

  onReady(callback: (streamDeck: ElgatoStreamDeck.StreamDeck) => void): void {
    this.emitter.on('ready', callback);
  }

  public getSerialNumber() {
    return this.streamDeck?.getSerialNumber();
  }
}
