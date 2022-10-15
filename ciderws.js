"use strict";

const WebSocket = require('ws');
const events = require('events');
const evem = new events.EventEmitter();

/**
 * CiderWS - A simple WebSocket client for Cider
 * 
 * @author ryzetech
 * @class CiderWS
 * @public
 * 
 */
class CiderWS {
  /**
   * Creates a new connection to Cider
   * @since 1.0.0
   * @constructor
   * 
   * @param {string} host The host to connect to (default: localhost)
   * @param {number} port The port to connect to (default: 26369)
   */
  constructor(host = "localhost", port = 26369) {
    this.host = host;
    this.port = port;
    this.currentSong = new Song({
      data: {
        name: "No Title Found",
        artist: "",
        album: "",
        duration: 0,
        id: undefined,
        artwork: {
          url: "",
          width: 0,
          height: 0
        },
        url: "",
        trackNumber: undefined
      }
    });
    this.states;
    this.socket;
    this.connect();
  }

  /**
   * @private
   */
  handleMessage(event) {
    let d = JSON.parse(event.data);
    evem.emit(d.type, d);

    switch (d.type) {
      default:
        // console.log(d.type);
        break;

      case "playbackStateUpdate":
        let newSong = new Song(d);
        let newStat = new States(d);
        if (this.currentSong == undefined || this.currentSong.id != newSong.id) {
          this.currentSong = newSong;
          if (newSong.duration > 0) evem.emit("songUpdate", newSong);
        }
        if (JSON.stringify(this.states) != JSON.stringify(newStat)) {
          this.states = newStat;
          evem.emit("statesUpdate", newStat);
        }
        evem.emit("playbackUpdate", new PlaybackData(d));
        newSong = undefined;
        newStat = undefined;
        break;
    }
  }

  /**
   * @private
   */
  connect() {
    if (!this.socket || this.socket.readyState == 3) {
      this.socket = new WebSocket(`ws://${this.host}:${this.port}`);

      this.socket.onmessage = (event) => { this.handleMessage(event); };
    }
  }

  /**
   * Closes the WebSocket connection
   */
  close() {
    this.socket.close();
  }

  /**
   * Adds a listener to the event emitter.
   * The listener can be called multiple times, for each event emitted.
   * @param {string} event 
   * @param {} callback 
   */
  on(event, callback) {
    evem.on(event, callback);
  }

  /**
   * Adds a listener to the event emitter.
   * The listener can only be called once, the first time an event is emitted.
   * @param {string} event 
   * @param {} callback 
   */
  once(event, callback) {
    evem.once(event, callback);
  }

  /**
   * Will remove one instance of the listener from the listener array for the event named event.
   * @param {string} event 
   * @param {} callback 
   */
  removeListener(event, callback) {
    evem.removeListener(event, callback);
  }

  /**
   * Gets the current song
   * @async
   * @returns {Song} The current song
   */
  async getSong() {
    return new Promise(resolve => {
      if (this.currentSong) return resolve(this.currentSong);
      const interval = setInterval(() => {
        if (!this.currentSong) return;
        clearInterval(interval);
        resolve(this.currentSong);
      }, 10);
    });
  }

  /**
   * Gets the current options
   * @async
   * @returns {States} The current options
   */
  async getOptions() {
    return new Promise(resolve => {
      if (this.states) return resolve(this.states);
      const interval = setInterval(() => {
        if (!this.states) return;
        clearInterval(interval);
        resolve(this.states);
      }, 10);
    });
  }

  /*
  setAutoplay(value) {
    this.socket.send(JSON.stringify({
      type: "setAutoplay",
      data: value,
    }));
  }
  */

  /**
   * Orders the client to play / resume playback
   */
  play() {
    this.socket.send(JSON.stringify({
      action: 'play',
    }));
  }

  /**
   * Orders the client to pause playback
   */
  pause() {
    this.socket.send(JSON.stringify({
      action: 'pause',
    }));
  }

  /**
   * Skips to the next song in the queue
   */
  next() {
    this.socket.send(JSON.stringify({
      action: 'next',
    }));
  }

  /**
   * Returns to the previous song in the queue
   */
  previous() {
    this.socket.send(JSON.stringify({
      action: 'previous',
    }));
  }

  /**
   * Skips to a specific time in the current song
   * @param {number} time The time to skip to, in seconds
   * @param {boolean} adjust If true, the time will be accepted in milliseconds
   */
  seek(time, adjust) {
    if (adjust) {
      time = parseInt(time / 1000);
    }
    this.socket.send(JSON.stringify({
      type: "seek",
      data: time,
    }));
  }

  /**
   * Sets the volume of the client
   * @param {number} volume The volume to set, from 0 to 1
   */
  setVolume(volume) {
    this.socket.send(JSON.stringify({
      type: "setVolume",
      data: volume,
    }));
  }

  /**
   * Cycles through the repeat modes
   */
  cycleRepeat() {
    this.socket.send(JSON.stringify({
      action: 'repeat',
    }));
  }

  /**
   * Toggles shuffle mode
   * @see {@link setShuffle()} if you want to set shuffle mode to a specific value
   */
  shuffle() {
    this.socket.send(JSON.stringify({
      action: 'shuffle',
    }));
  }

  /**
   * Sets shuffle mode
   * @param {boolean} val Sets whether shuffle mode is enabled or not
   */
  setShuffle(val) {
    this.socket.send(JSON.stringify({
      action: 'set-shuffle',
      shuffle: val ? 1 : 0,
    }));
  }

  /**
   * Gets the lyrics for the current song (if available)
   * @async
   * @returns {Array} An Array of Objects with lyrics for the current song with the following properties:
   * - `startTime` - The time at which the lyric should be displayed, in seconds
   * - `endTime` - The time at which the lyric should be hidden, in seconds
   * - `line` - The lyric text
   * - `translation` - The translation of the lyric text (if available and chosen)
   */
  async getLyricsAdvanced() {
    this.socket.send(JSON.stringify({
      action: 'get-lyrics',
    }));
    return new Promise((resolve, reject) => {
      evem.once("lyrics", (data) => {
        resolve(data);
      });
    });
  }

  /**
   * Gets the lyrics for the current song in a plain text format (if available)
   * @async
   * @returns {string} The lyrics for the current song
   */
  async getLyrics() {
    let lyrics = await this.getLyricsAdvanced();
    let full = "";
    for (let l of lyrics) {
      if (l.line.startsWith("lrc") || l.line === " ") continue;
      full += l.line + "\n";
    }
    return full;
  }
}

/**
 * This class defines the most important properties of a song.
 * It generates a new song object from a playbackStateUpdate event.
 * 
 * @class Song
 * @param {Object} data The data from the websocket
 * 
 * @var {string} id The song ID
 * @var {string} title The song name
 * @var {string} artist The song artist
 * @var {string} album The song album
 * @var {string} artwork The song's album art URL
 * @var {number} trackNumber The song's track number on the album
 * @var {number} duration The song duration in seconds
 * @var {string} url The Apple Music URL for the song
 */
class Song {
  constructor(data) {
    data = data.data;
    this.title = data.name;
    this.artist = data.artistName;
    this.album = data.albumName;
    this.artwork = data.artwork.url.replace("{w}", data.artwork.width).replace("{h}", data.artwork.height);
    this.trackNumber = data.trackNumber;
    this.url = data.url ? data.url.appleMusic : "";
    this.id = data.songId;
    this.duration = data.durationInMillis;
    // this.playbackdata = new PlaybackData(data);
  }
}

/**
 * This class saves the current options and states for the player when defined by the client.
 * 
 * @class States
 * @param {Object} data The data from the websocket
 * 
 * @var {boolean} isPlaying Whether the player is playing or not
 * @var {boolean} shuffle Whether the player is shuffling or not
 * @var {number} repeatMode The repeat mode of the player (0 = off, 1 = song, 2 = queue)
 * @var {number} volume The volume of the player (0-1)
 * @var {boolean} autoplay Whether autoplay is enabled or not
 */
class States {
  constructor(data) {
    data = data.data;
    this.isPlaying = data.status;
    this.shuffle = data.shuffleMode == 1;
    this.repeatMode = data.repeatMode;
    this.volume = data.volume;
    this.autoplay = data.autoplayEnabled;
  }
}

/**
 * This class shows data relevant for the current playback, e.g. elapsed time, remaining time, when the song will end, etc.
 * 
 * @class PlaybackData
 * @param {Object} data The data from the websocket
 * 
 * @var {boolean} isPlaying Whether the player is playing or not
 * @var {number} startTime The timestamp at which the song started playing
 * @var {number} endTime The timestamp at which the song will end
 * @var {number} remainingTime The remaining time in milliseconds
 * @var {number} elapsedTime The elapsed time in milliseconds
 * @var {number} progress The progress of the song in decimal form (0-1)
 */
class PlaybackData {
  constructor(data) {
    data = data.data;
    this.isPlaying = data.status;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.remainingTime = Math.round(data.remainingTime);
    this.elapsedTime = Math.round(data.durationInMillis - data.remainingTime);
    this.progress = data.currentPlaybackProgress;
  }
}

module.exports = { CiderWS };