# emoj [![Build Status](https://travis-ci.org/sindresorhus/emoj.svg?branch=master)](https://travis-ci.org/sindresorhus/emoj)

> Find relevant emoji from text on the command-line

<img src="screenshot.gif" width="660">

Uses the API from this great article on [Emoji & Deep Learning](http://getdango.com/emoji-and-deep-learning.html).<br>
Check out the [Dango app](http://getdango.com) if you want something like this on your phone.


## Install

Ensure you have [Node.js](https://nodejs.org) version 4 or higher installed. Then run the following:

```
$ npm install --global emoj
```

Works best on macOS. Terminals on Linux render emojis in monochrome as they don't support color emojis. On Linux, I would recommend installing [Emoji One](https://github.com/eosrei/emojione-color-font#install-on-linux) for full emoji coverage. [Doesn't really work on Windows.](https://github.com/sindresorhus/emoj/issues/5)


## Usage

```
$ emoj --help

  Usage
    $ emoj [text]

  Example
    $ emoj 'i love unicorns'
    🦄  🎠  🐴  🐎  ❤  ✨  🌈

  Run it without arguments to enter the live search
```


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
