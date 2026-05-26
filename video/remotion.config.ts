/**
 * Note: When rendering on a server, you need to call `Config.setVideoImageFormat('jpeg')`
 * before `Config.registerRoot` to avoid a Puppeteer error.
 */

import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOutputFormat('mp4');
Config.setCodec('h264');
