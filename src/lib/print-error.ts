import chalk from 'chalk'

export default function (args, msg, opts) {
  if (!args.silent) {
    opts = Object.assign(
      {
        level: 'error',
        color: 'red'
      },
      opts
    )

    console[opts.level](chalk[opts.color](msg))
  }
}
