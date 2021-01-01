# emoj

> Find relevant emoji from text on the command-line

<img src="screenshot.gif" width="660">

Uses the API from this great article on [Emoji & Deep Learning](https://getdango.com/emoji-and-deep-learning/) and a local emoji database.

## Install

Ensure you have [Node.js](https://nodejs.org) version 10 or higher installed. Then run the following:

```
$ npm install --global emoj
```

Works best on macOS and Linux. Older Linux distributions don't support color emoji in the terminal, but newer ones (like Ubuntu 18.04 and Fedora 28) do. On Linux, I would recommend installing [Emoji One](https://github.com/eosrei/emojione-color-font#install-on-linux) for full emoji coverage. [Doesn't really work on Windows.](https://github.com/sindresorhus/emoj/issues/5)

## Usage

```
$ emoj --help

  Usage
    $ emoj [text]

  Example
    $ emoj 'i love unicorns'
    🦄  🎠  🐴  🐎  ❤  ✨  🌈

  Options
    --copy -c       Copy the first emoji to the clipboard
    --skin-tone -s  Set and persist the default emoji skin tone (0 to 5)

  Run it without arguments to enter the live search
  Use the up/down keys during live search to change the skin tone
```

## Related

- [alfred-emoj](https://github.com/sindresorhus/alfred-emoj) - Alfred plugin
