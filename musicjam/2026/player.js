(function () {
  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var PlayerContextProvider = window.cassetteCore.PlayerContextProvider;
  var playerContextFilter = window.cassetteCore.playerContextFilter;
  var MediaPlayerControls = window.cassettePlayer.MediaPlayerControls;

  var playlist = [
    {
      url: "assets/music/Glenn Essex & Secret Family Recipe - Ocean Silver Stream.mp3",
      title: "Introduction",
      artist: "Glenn Essex & Secret Family Recipe",
      album: "Warp Zone Music Jam 2026",
      theme: "Oceans, The Silver Spring"
    },
    {
      url: "assets/music/Secret Family Recipe - Quirky Boss Battle.mp3",
      title: "Quirky Boss Battle",
      artist: "Secret Family Recipe",
      album: "Warp Zone Music Jam 2026",
      theme: "Boss Battle, Quirky"
    },
    {
      url: "assets/music/DurrBurr - 3 Hours til Close.mp3",
      title: "3 Hours til Close",
      artist: "DurrBurr",
      album: "Warp Zone Music Jam 2026",
      theme: "2PM On A Cool Spring Day, Hopeful"
    },
    {
      url: "assets/music/beanbunny - Quirky Desert.mp3",
      title: "Quirky Desert",
      artist: "beanbunny",
      album: "Warp Zone Music Jam 2026",
      theme: "Desert, Quirky"
    },
    {
      url: "assets/music/ikiru77 - Growth.mp3",
      title: "Growth",
      artist: "ikiru77",
      album: "Warp Zone Music Jam 2026",
      theme: "Ancient, Simple"
    },
    {
      url: "assets/music/BanhBaoBoy - Finally Answered.mp3",
      title: "Finally Answered",
      artist: "BanhBaoBoy",
      album: "Warp Zone Music Jam 2026",
      theme: "Prophetic Rambling, Forlorn"
    },
    {
      url: "assets/music/James McLain - Wheres Mommy.mp3",
      title: "Where's Mommy",
      artist: "James McLain",
      album: "Warp Zone Music Jam 2026",
      theme: "Everyone Is Dead, Mournful"
    },
    {
      url: "assets/music/The Drifting Bard - A Lover Scorned.mp3",
      title: "A Lover Scorned",
      artist: "The Drifting Bard",
      album: "Warp Zone Music Jam 2026",
      theme: "Love Theme, Unstable"
    },
    {
      url: "assets/music/Alex Garbus - Dreamscape Escape.mp3",
      title: "Dreamscape Escape",
      artist: "Alex Garbus",
      album: "Warp Zone Music Jam 2026",
      theme: "It Was All A Dream, Bouncy"
    },
    {
      url: "assets/music/Dei - Snowcreepin.mp3",
      title: "Snowcreepin'",
      artist: "Dei",
      album: "Warp Zone Music Jam 2026",
      theme: "Mystery, Cool"
    },
    {
      url: "assets/music/MrGoodWine - Static in the wire.mp3",
      title: "Static in the wire",
      artist: "MrGoodWine",
      album: "Warp Zone Music Jam 2026",
      theme: "From Beyond, Tumble Down Shack"
    },
    {
      url: "assets/music/michealwave - Pirate Forlorn Demo.mp3",
      title: "Pirate Forlorn Demo",
      artist: "michealwave",
      album: "Warp Zone Music Jam 2026",
      theme: "Pirate, Forlorn"
    },
    {
      url: "assets/music/tanukisuitup - The Sirens Call.mp3",
      title: "The Siren's Call",
      artist: "Nick Modarelli",
      album: "Warp Zone Music Jam 2026",
      theme: "I Can Hear The Siren's Call, Anthem"
    }
  ];

  function PlaylistMenu(props) {
    var playlistItems = props.playlist;
    var activeTrackIndex = props.activeTrackIndex;
    var onSelectTrackIndex = props.onSelectTrackIndex;
    var paused = props.paused;
    var onTogglePause = props.onTogglePause;

    return React.createElement(
      "ol",
      { className: "playlist-list" },
      playlistItems.map(function (track, index) {
        var isActive = activeTrackIndex === index;
        var artistName = track.artist || "Unknown artist";
        var themeText = track.theme || "???";
        var lineText = '"' + track.title + '" by ' + artistName + " - Theme: " + themeText;
        return React.createElement(
          "li",
          { key: track.title + "-" + index, className: isActive ? "is-active" : "" },
          React.createElement(
            "button",
            {
              type: "button",
              className: "playlist-button",
              onClick: function () {
                onSelectTrackIndex(index);
                if (isActive && paused) {
                  onTogglePause(false);
                }
              }
            },
            React.createElement("span", { className: "playlist-number" }, String(index + 1).padStart(2, "0")),
            React.createElement("span", { className: "playlist-line" }, lineText)
          )
        );
      })
    );
  }

  PlaylistMenu = playerContextFilter(PlaylistMenu, [
    "playlist",
    "activeTrackIndex",
    "onSelectTrackIndex",
    "paused",
    "onTogglePause"
  ]);

  function NowPlayingHeaderBase(props) {
    var playlistItems = props.playlist;
    var activeTrackIndex = props.activeTrackIndex;
    var paused = props.paused;
    var activeTrack = playlistItems[activeTrackIndex] || {};
    var title = activeTrack.title || "No Track Loaded";
    var artist = activeTrack.artist || "Unknown artist";

    return React.createElement(
      "div",
      { className: "now-playing-banner" },
      React.createElement("span", { className: "now-playing-state" }, paused ? "Paused" : "Now Playing"),
      React.createElement("span", { className: "now-playing-title" }, title),
      React.createElement("span", { className: "now-playing-artist" }, artist)
    );
  }

  var NowPlayingHeader = playerContextFilter(NowPlayingHeaderBase, [
    "playlist",
    "activeTrackIndex",
    "paused"
  ]);

  function PlaybackAnimationSync(props) {
    var paused = props.paused;

    React.useEffect(function () {
      document.body.classList.toggle("music-playing", !paused);
    }, [paused]);

    return null;
  }

  PlaybackAnimationSync = playerContextFilter(PlaybackAnimationSync, ["paused"]);

  function PlayerApp() {
    return React.createElement(
      PlayerContextProvider,
      {
        playlist: playlist,
        autoplay: false,
        startingTrackIndex: 0,
        defaultVolume: 1,
        defaultRepeatStrategy: "none"
      },
      React.createElement(
        "div",
        { className: "player-layout" },
        React.createElement(
          "div",
          { className: "player-column" },
          React.createElement(NowPlayingHeader, null),
          React.createElement(MediaPlayerControls, {
            controls: ["spacer", "backskip", "playpause", "forwardskip", "volume", "spacer", "progress"],
            getDisplayText: function () {
              return "";
            }
          }),
          React.createElement(
            "div",
            { className: "playlist-wrap" },
            React.createElement("h3", null, "Track Listing"),
            React.createElement(PlaylistMenu, null)
          )
        )
      ),
      React.createElement(PlaybackAnimationSync, null)
    );
  }

  ReactDOM.render(React.createElement(PlayerApp), document.getElementById("cassette-app"));
})();
