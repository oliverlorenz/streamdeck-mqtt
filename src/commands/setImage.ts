import mqtt from 'mqtt';
// @ts-ignore
import sharp from 'sharp';

const sharp = require('sharp');

const mqttHost = process.env.MQTT_HOST || 'mqtt://192.168.0.6';

const pathToImage = process.argv.pop();
const layer = process.argv.pop();
const buttonIndex = process.argv.pop();
const profileName = process.argv.pop();
const serialNumber = process.argv.pop();

console.log(pathToImage);
console.log(process.argv);

const mqttClient  = mqtt.connect(mqttHost);
mqttClient.on('connect', async () => {
  const topic = `${serialNumber}/profile/${profileName}/button/${buttonIndex}/${layer}`;
  const baseImage = sharp({
    create: {
      width: 96,
      height: 96,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const compositeList: sharp.OverlayOptions[] = [];
  const image = sharp(pathToImage)
    .resize(96, 96);

  compositeList.push({
    input: await image.toBuffer(),
    gravity: 'centre',
  });

  const payload = await baseImage
    .composite(compositeList)
    .removeAlpha()
    .flatten()
    .toBuffer()

  await mqttClient.publish(
    topic,
    payload,
    {
      retain: true,
      qos: 1,
    },
    () => {
      mqttClient.end();
    }
  );
});
