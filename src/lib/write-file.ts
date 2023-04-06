import fs from 'fs'

export default function (args, filePath, content) {
  if (args.dryRun) return
  fs.writeFileSync(filePath, content, 'utf8')
}
