window.addEventListener("DOMContentLoaded", () => {
  var playlist = window.playlist,
      vidNow = 0;
  const video = document.getElementById("vVid"),
      vPlay = document.getElementById("vPlay"),
      vPlayIco = document.getElementById("vPlayIco"),
      vNow = document.getElementById("vNow"),
      vTime = document.getElementById("vTime"),
      vSeek = document.getElementById("vSeek"),
      vVolume = document.getElementById("vVolume"),
      vVolIco = document.getElementById("vVolIco"),
      vList = document.getElementById("vList"),
      full = document.getElementById("full")


  fetch("/progress", { keepalive: false })
      .then((response) => response.json())
      .then((json) => {
          for (var x = 0; x < playlist.length; x++) {
              if (playlist[x].name === json.now_playing) {
                  vidNow = x;
                  vidPlay(vidNow, true);
                  video.currentTime = json.current_duration
                  vSeek.value = json.current_duration
              }
          }
          if (vidNow == 0) vidPlay(0, true);
      });



  for (let i in playlist) {
      let row = document.createElement("div");
      row.className = "vRow";
      row.innerHTML = playlist[i]["name"];
      row.addEventListener("click", () => vidPlay(i));
      playlist[i]["row"] = row;
      vList.appendChild(row);
  }
  var vidStart = true,

      vidPlay = (idx, nostart) => {
          vidNow = idx;
          vidStart = nostart ? false : true;
          video.src = encodeURI(playlist[idx]["src"]);
          for (let i in playlist) {
              if (i == idx) {
                  playlist[i]["row"].classList.add("now");
              } else {
                  playlist[i]["row"].classList.remove("now");
              }
          }
      };

  video.addEventListener("canplay", () => {
      if (vidStart) {
          video.play();
          vidStart = false;
      }
  });
  full.addEventListener('click', () => {
      if (video.fullscreenElement || video.webkitDisplayingFullscreen) {
          video.webkitExitFullscreen();
          full.innerHTML = 'fullscreen_exit'
      } else {
          video.webkitEnterFullscreen();
          if (video.fullscreenElement || video.webkitDisplayingFullscreen) full.innerHTML = 'fullscreen'
      }
  })
  video.addEventListener("ended", () => {
      vidNow++;
      if (vidNow >= playlist.length) {
          vidNow = 0;
      }
      vidPlay(vidNow);
  });

  video.addEventListener("play", () => vPlayIco.innerHTML = "pause");
  video.addEventListener("pause", () => vPlayIco.innerHTML = "play_arrow");

  vPlay.addEventListener("click", () => {
      if (video.paused) {
          video.play();
      } else {
          video.pause();
      }
  });

  var timeString = secs => {
      let ss = Math.floor(secs),
          hh = Math.floor(ss / 3600),
          mm = Math.floor((ss - (hh * 3600)) / 60);
      ss = ss - (hh * 3600) - (mm * 60);

      if (hh > 0) {
          mm = mm < 10 ? "0" + mm : mm;
      }
      ss = ss < 10 ? "0" + ss : ss;
      return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
  };
  video.addEventListener("loadedmetadata", () => {
      vNow.innerHTML = timeString(0);
      vTime.innerHTML = timeString(video.duration);
  });
  video.addEventListener("timeupdate", () => {
      vNow.innerHTML = timeString(video.currentTime)
  });
  setInterval(function() {
      fetch("/progress", {
          keepalive: true,
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              current_duration: video.currentTime,
              now_playing: playlist[vidNow].name
          })
      }).then(function(res){ console.log('RES',res) })
      .catch(function(res){ console.log('ERR',res) })
  },5000)
  video.addEventListener("loadedmetadata", () => {
      vSeek.max = Math.floor(video.duration);
      var vSeeking = false; 
      vSeek.addEventListener("input", () => vSeeking = true); 
      vSeek.addEventListener("change", () => {
          video.currentTime = vSeek.value;
          if (!video.paused) video.play();
          vSeeking = false;
      });

      video.addEventListener("timeupdate", () => {
          if (!vSeeking) {
              vSeek.value = Math.floor(video.currentTime);
          }
      });
  });

  vVolIco.addEventListener("click", () => {
      video.volume = video.volume == 0 ? 1 : 0;
      vVolume.value = video.volume;
      vVolIco.innerHTML = (vVolume.value == 0 ? "volume_mute" : "volume_up");
  });
  vVolume.addEventListener("change", () => {
      video.volume = vVolume.value;
      vVolIco.innerHTML = (vVolume.value == 0 ? "volume_mute" : "volume_up");
  });

  video.addEventListener("canplay", () => {
      vPlay.disabled = false;
      vVolume.disabled = false;
      vSeek.disabled = false;
  });
  video.addEventListener("waiting", () => {
      vPlay.disabled = true;
      vVolume.disabled = true;
      vSeek.disabled = true;
  });
});