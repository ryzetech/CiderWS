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
 * @var {string[]} genre The song's genre(s)
 */
 class Song {
  constructor(data) {
    if (data.data) data = data.data;
    this.title = data.name;
    this.artist = data.artistName;
    this.album = data.albumName;
    this.artwork = data.artwork.url.replace("{w}", data.artwork.width).replace("{h}", data.artwork.height);
    this.trackNumber = data.trackNumber;
    this.url = data.url ? data.url.appleMusic : "";

    if (typeof (data.url) === "object") {
      this.url = data.url ? data.url.appleMusic : "";
    } else {
      this.url = data.url;
    }

    if (!data.songId) {
      if (typeof (data.url) === "string") this.id = new RegExp("i=[0-9]+").exec(this.url)[0].replace("i=", "");
      else this.id = "";
    }
    else this.id = data.songId;

    this.duration = data.durationInMillis;
    this.genre = data.genreNames;
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
 * @var {boolean} isShuffling Whether the player is shuffling or not
 * @var {number} repeatMode The repeat mode of the player (0 = off, 1 = song, 2 = queue)
 * @var {number} volume The volume of the player (0-1)
 * @var {boolean} autoplay Whether autoplay is enabled or not
 */
 class States {
  constructor(data) {
    if (data.data) data = data.data;
    this.isPlaying = data.status;
    this.isShuffling = data.shuffleMode == 1;
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
    if (data.data) data = data.data;
    this.isPlaying = data.status;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.remainingTime = Math.round(data.remainingTime);
    this.elapsedTime = Math.round(data.durationInMillis - data.remainingTime);
    this.progress = data.currentPlaybackProgress;
  }
}

module.exports = { Song, States, PlaybackData };