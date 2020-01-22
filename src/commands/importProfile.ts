import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import mqtt from 'mqtt';
// @ts-ignore
import sharp from 'sharp';
import { config } from 'dotenv';
config();

const profilePath = process.argv.pop();

if (!profilePath) {
  process.exit();
}

const profileDirectory = path.dirname(profilePath);
const file = fs.readFileSync(profilePath, 'utf8')
const { streamdeck, name } = YAML.parse(file);

(async () => {
  const mqttClient  = mqtt.connect(process.env.MQTT_BROKER_URL);
  await new Promise((resolve) => mqttClient.on('connect', resolve));
  for (const buttonIndex in streamdeck) {
    const button = streamdeck[parseInt(buttonIndex)];
    if (!button.layers) {
      continue;
    }
    button.layers.forEach(async (filePath: string, index: number) => {
      const pathToImage = profileDirectory + '/' + filePath;
      const topic = `${process.env.STREAMDECK_SERIALNUMBER}/profile/${name}/button/${buttonIndex}/layers/${index}`;

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
      console.log(`wrote to "${topic}", ${payload.length} bytes (${path.basename(pathToImage)})`)
    });
  }
})()
