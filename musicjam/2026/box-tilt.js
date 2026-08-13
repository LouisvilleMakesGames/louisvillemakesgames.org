(function () {
  var selector = [
    ".panel",
    ".playlist-wrap",
    ".playlist-button",
    ".now-playing-banner",
    "#cassette-app .cassette",
    ".player-intro .btn-secondary",
    "footer p"
  ].join(",");

  var elements = Array.prototype.slice.call(document.querySelectorAll(selector));
  if (!elements.length) return;

  elements.forEach(function (element) {
    element.classList.add("mouse-tilt-box");
  });

  var pointerX = window.innerWidth * 0.5;
  var pointerY = window.innerHeight * 0.5;
  var rafId = null;
  var maxRotate = 2.2;

  function updateTilt() {
    rafId = null;
    var nx = (pointerX / window.innerWidth) * 2 - 1;
    var ny = (pointerY / window.innerHeight) * 2 - 1;
    var rotateY = nx * maxRotate;
    var rotateX = -ny * maxRotate;

    elements.forEach(function (element) {
      element.style.transform = "perspective(1400px) rotateX(" + rotateX.toFixed(3) + "deg) rotateY(" + rotateY.toFixed(3) + "deg)";
    });
  }

  function scheduleUpdate() {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(updateTilt);
  }

  window.addEventListener("mousemove", function (event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    scheduleUpdate();
  });

  window.addEventListener(
    "touchmove",
    function (event) {
      if (!event.touches || !event.touches.length) return;
      pointerX = event.touches[0].clientX;
      pointerY = event.touches[0].clientY;
      scheduleUpdate();
    },
    { passive: true }
  );

  window.addEventListener("mouseleave", function () {
    elements.forEach(function (element) {
      element.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg)";
    });
  });

  scheduleUpdate();
})();
