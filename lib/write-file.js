import { writeFileSync } from 'fs';

export default function (args, filePath, content) {
  if (args.dryRun) return;
  writeFileSync(filePath, content, 'utf8');
}
