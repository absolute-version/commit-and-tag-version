import fs from 'fs';
import { Config } from './opts/types'

export default function writeFile(config: Config, filePath: string, content: string | NodeJS.ArrayBufferView) {
  if (config.dryRun) return;
  fs.writeFileSync(filePath, content, 'utf8');
}
