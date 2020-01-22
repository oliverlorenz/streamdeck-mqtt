import usb, { Device } from 'usb';
import bunyan from 'bunyan';

export class UsbHandler {
  constructor(
    public logger: bunyan,
  ) {}

  private isStreamDeckDevice(device: Device) {
    return device.deviceDescriptor.idVendor === 0x0fd9;
  }

  public onAttached(callback: (device: Device) => void): void {
    usb.on('attach', (attachedUsbDevice: Device) => {
      this.logger.info('streamdeck attached');
      if (this.isStreamDeckDevice(attachedUsbDevice)) {
        callback(attachedUsbDevice);
      }
    });
  }

  public onDetached(callback: (device: Device) => void): void {
    usb.on('detach', (detachedUsbDevice: Device) => {
      this.logger.info('streamdeck detached');
      if (this.isStreamDeckDevice(detachedUsbDevice)) {
        callback(detachedUsbDevice);
      }
    });
  }

  public isStreamDeckAttached(): boolean {
    return !!usb.getDeviceList().find((device: Device) => {
      return this.isStreamDeckDevice(device);
    });
  }
}
