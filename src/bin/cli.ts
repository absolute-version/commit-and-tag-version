#!/usr/bin/env node

import standardVersion from '@/index'
import cmdParser from '@/command'

/* istanbul ignore if -- @preserve */
if (process.version.match(/v(\d+)\./)[1] < 6) {
  console.error(
    'commit-and-tag-version: Node v6 or greater is required. `commit-and-tag-version` did not run.'
  )
} else {
  standardVersion(cmdParser.argv).catch(() => {
    process.exit(1)
  })
}
