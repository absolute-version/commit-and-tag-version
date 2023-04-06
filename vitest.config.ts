import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const dir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    // Alias transformations to match the ones on tsconfig.json paths
    alias: {
      '@': resolve(dir, 'src'),
      '@typings': resolve(dir, 'src/typings'),
      '@bin': resolve(dir, 'src/bin'),
      '@lib': resolve(dir, 'src/lib'),
      '@test': resolve(dir, 'test'),
      '@mocks': resolve(dir, 'test/mocks')
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov', 'json']
    }
  }
})
