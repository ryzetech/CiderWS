"use strict";

const WebSocket = require('ws');
const events = require('events');
const evem = new events.EventEmitter();

const { Song, States, PlaybackData } = require("./src/classes.js");
const { MissingParameterError, ParameterRangeError, ParameterTypeMismatchError, WebsocketConnectionError } = require("./src/errors.js");

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
    this.currentSong;
    this.states;
    this.socket;
    this.connect();
  }

  connectionCheck() {
    if (this.socket.readyState !== 1) throw new WebsocketConnectionError(this.socket.readyState);
  }

  /**
   * @private
   */
  paramCheck(param, paramLabel, type, rangeStart, rangeEnd) {
    if (typeof (param) === "undefined") throw new MissingParameterError(paramLabel);
    if (typeof (param) !== type) throw new ParameterTypeMismatchError(paramLabel, type);
    if (typeof (rangeStart) !== "undefined" && typeof (rangeEnd) !== "undefined") {
      if (param <= rangeStart || param >= rangeEnd) throw new ParameterRangeError(paramLabel, rangeStart, rangeEnd);
    }
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
   * Opens the WebSocket connection (executed on instantiation!)
   */
  connect() {
    if (!this.socket || this.socket.readyState == 3) {
      this.socket = new WebSocket(`ws://${this.host}:${this.port}`);

      this.socket.onopen = (event) => { evem.emit("connectionOpen", event); };
      this.socket.onclose = (event) => { evem.emit("connectionClose"), event; };
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
   * NOT TO BE CONFUSED WITH close()!!!  
   * Doesn't only stop playback, but also closes the Cider instance! Y'know, just in case.
   * Note that reconnecting to is not possible after this, unless you restart Cider.
   */
  quit() {
    this.connectionCheck();

    this.socket.send(JSON.stringify({
      action: 'quit',
    }));
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
   * @param {function} callback 
   */
  removeListener(event, callback) {
    evem.removeListener(event, callback);
  }

  /**
   * Alias for removeListener()
   * @see {@link removeListener()}
   * @param {string} event 
   * @param {function} callback 
   */
  off(event, callback) {
    this.removeListener(event, callback);
  }

  /**
   * Forces CiderWS to fetch and update the current song and states
   */
  forceUpdate() {
    this.connectionCheck();

    this.socket.send(JSON.stringify({
      action: 'get-currentmediaitem',
    }));
  }

  /**
   * Gets the current song
   * @async
   * @returns {Song} The current song
   */
  async getSong() {
    this.connectionCheck();

    this.forceUpdate();

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
   * Gets the current states
   * @async
   * @returns {States} The current states
   */
  async getStates() {
    this.connectionCheck();

    this.forceUpdate();

    return new Promise(resolve => {
      if (this.states) return resolve(this.states);
      const interval = setInterval(() => {
        if (!this.states) return;
        clearInterval(interval);
        resolve(this.states);
      }, 10);
    });
  }

  /**
   * Sends a playback related command to the client
   * @param {string} com The command to send ("play", "pause", "playpause" "next", "previous")
   */
  command(com) {
    this.connectionCheck();

    this.paramCheck(com, "command", "string");
    if (!["play", "pause", "playpause", "next", "previous"].includes(com)) throw new Error("You can only use the commands 'play', 'pause', 'playpause', 'next' and 'previous' with command()");

    this.socket.send(JSON.stringify({
      action: com,
    }));
  }

  /**
   * Skips to a specific time in the current song
   * @param {number} time The time to skip to, in seconds
   * @param {boolean} [adjust = false] If true, the time will be accepted in milliseconds
   */
  seek(time, adjust = false) {
    this.connectionCheck();

    this.paramCheck(time, "time", "number");

    if (!parseFloat(time)) throw new ParameterTypeMismatchError("time", "float");

    if (adjust) {
      time = parseInt(time / 1000);
    }
    this.socket.send(JSON.stringify({
      action: "seek",
      data: time,
    }));
  }

  /**
   * Sets the volume of the client
   * @param {number} volume The volume to set, from 0 to 1
   */
  setVolume(volume) {
    this.connectionCheck();

    this.paramCheck(volume, "volume", "number", 0, 1);

    this.socket.send(JSON.stringify({
      action: "volume",
      volume: volume,
    }));
  }

  /**
   * Cycles through the repeat modes
   */
  cycleRepeat() {
    this.connectionCheck();

    this.socket.send(JSON.stringify({
      action: 'repeat',
    }));
  }

  /**
   * Sets the repeat mode
   * @param {number} mode The repeat mode to set (0 = off, 1 = repeat one, 2 = repeat all)
   */
  setRepeat(mode) {
    this.connectionCheck();

    this.paramCheck(mode, "mode", "number", 0, 2);
    if (mode % 1 !== 0) throw new ParameterTypeMismatchError("value", "whole number");

    this.socket.send(JSON.stringify({
      action: "set-repeat",
      repeat: mode,
    }));
  }

  /**
   * Toggles shuffle mode
   * @see {@link setShuffle()} if you want to set shuffle mode to a specific value
   */
  toggleShuffle() {
    this.connectionCheck();

    this.socket.send(JSON.stringify({
      action: 'shuffle',
    }));
  }

  /**
   * Sets shuffle mode
   * @param {boolean} enabled Sets whether shuffle mode is enabled or not
   */
  setShuffle(enabled) {
    this.connectionCheck();

    this.paramCheck(enabled, "enabled", "boolean");

    this.socket.send(JSON.stringify({
      action: 'set-shuffle',
      shuffle: enabled ? 1 : 0,
    }));
  }

  /**
   * Sets the autoplay mode
   * @param {boolean} enabled 
   */
  setAutoplay(enabled) {
    this.connectionCheck();

    this.paramCheck(enabled, "enabled", "boolean");

    this.socket.send(JSON.stringify({
      action: "set-autoplay",
      autoplay: enabled,
    }));
  }

  /**
   * Gets the lyrics for the current song (if available)
   * @async
   * @returns {object[]} An Array of Objects with lyrics for the current song with the following properties:
   * - `startTime` - The time at which the lyric should be displayed, in seconds
   * - `endTime` - The time at which the lyric should be hidden, in seconds
   * - `line` - The lyric text
   * - `translation` - The translation of the lyric text (if available and chosen)
   */
  async getLyricsAdvanced() {
    this.connectionCheck();

    this.socket.send(JSON.stringify({
      action: 'get-lyrics',
    }));
    return new Promise((resolve, reject) => {
      evem.once("lyrics", (data) => {
        resolve(data.data);
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
      let line = l.line.trim();
      if (line.startsWith("lrc") || line === "") continue;
      full += line + "\n";
    }
    return full;
  }

  /**
   * Plays a Song by its ID immediately
   * @param {string} id The ID of the element to be played
   * @param {string} [kind = "song"] The type of the element to be played (defaults to song)
   */
  playById(id, kind = "song") {
    this.connectionCheck();

    this.paramCheck(id, "id", "string");
    this.paramCheck(kind, "kind", "string");

    this.socket.send(JSON.stringify({
      action: 'play-mediaitem',
      id: id,
      kind: kind,
    }));
  }

  /**
   * Searches for a song, artist, album or playlist and returns the results
   * @async
   * @param {string} query 
   * @param {string} [type = "song"]
   * @param {number} [limit = 10]
   * @returns {Song[] | object[]} An array of (Song) objects
   */
  async search(query, type = "song", limit = 10) {
    this.connectionCheck();

    this.paramCheck(query, "query", "string");
    this.paramCheck(type, "type", "string");

    this.paramCheck(limit, "limit", "number", 1, 50);

    this.socket.send(JSON.stringify({
      action: 'search',
      term: query,
      limit: limit,
    }));

    return new Promise(resolve => {
      evem.once("searchResults", (data) => {
        let d = data.data;

        switch (type) {
          case "song":
            d = d.songs.data;
            let songs = [];
            for (let s of d) {
              songs.push(new Song(s.attributes));
            }
            resolve(songs);
            break;
          case "playlist":
            d = d.playlists.data;
            break;
          case "album":
            d = d.albums.data;
            break;
          case "artist":
            d = d.artists.data;
            break;
        }

        resolve(d);
      });
    });
  }
}

module.exports = { CiderWS };