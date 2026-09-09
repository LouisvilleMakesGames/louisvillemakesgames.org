(function setupGiveForGoodMessageRotator() {
  var blip = document.getElementById("blip-text");
  var messageList = document.querySelectorAll("#g4g-messages li");

  if (!blip || !messageList.length) {
    return;
  }

  var phrases = Array.prototype.map.call(messageList, function (node) {
    return node.textContent.trim();
  }).filter(Boolean);

  if (!phrases.length) {
    return;
  }

  var phraseIndex = 0;

  function cyclePhrases() {
    blip.textContent = phrases[phraseIndex];
    blip.style.opacity = 1;

    setTimeout(function () {
      blip.style.opacity = 0;
      phraseIndex = (phraseIndex + 1) % phrases.length;
    }, 2500);

    setTimeout(cyclePhrases, 3000);
  }

  cyclePhrases();
})();

(function setupGiveForGoodPhotoDeck() {
  var deck = document.getElementById("g4g-photo-deck");
  if (!deck) {
    return;
  }

  var cards = Array.prototype.slice.call(deck.querySelectorAll(".g4g-deck-card"));
  if (cards.length < 2) {
    return;
  }

  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var order = cards.slice();
  var isAnimating = false;
  var shuffleDelay = prefersReducedMotion ? 2200 : 1050;
  var shuffleStepDuration = prefersReducedMotion ? 0 : 380;

  function applyStack() {
    order.forEach(function(card, index) {
      card.classList.remove("deck-top", "deck-mid", "deck-back", "deck-hidden", "deck-out");

      if (index === 0) {
        card.classList.add("deck-top");
      } else if (index === 1) {
        card.classList.add("deck-mid");
      } else if (index === 2) {
        card.classList.add("deck-back");
      } else {
        card.classList.add("deck-hidden");
      }
    });
  }

  function tick() {
    if (isAnimating) {
      return;
    }

    isAnimating = true;
    var topCard = order[0];
    topCard.classList.remove("deck-top");
    topCard.classList.add("deck-out");

    setTimeout(function() {
      order.push(order.shift());
      applyStack();
      isAnimating = false;
    }, shuffleStepDuration);
  }

  applyStack();
  setInterval(tick, shuffleDelay);
})();

(function setupGiveForGoodDonationMeter() {
  var meter = document.getElementById("g4g-donation-meter");
  if (!meter) {
    return;
  }

  var currentAmountEl = document.getElementById("g4g-current-amount");
  var goalAmountEl = document.getElementById("g4g-goal-amount");
  var metaEl = document.getElementById("g4g-meter-meta");
  var fillEl = document.getElementById("g4g-meter-fill");
  var goalCents = parseInt(meter.getAttribute("data-goal-cents"), 10) || 1000000;
  var endpoint = (meter.getAttribute("data-endpoint") || "").replace(/&amp;/g, "&");
  var proxyPrefix = meter.getAttribute("data-proxy-prefix") || "";
  var fallbackProxyPrefix = "https://api.allorigins.win/raw?url=";
  var jinaMirrorUrl = "https://r.jina.ai/http://" + endpoint.replace(/^https?:\/\//, "");
  var sourceTimeoutMs = 2200;
  var trackEl = meter.querySelector(".g4g-meter-track");
  var currentRaisedCents = null;
  var currentGoalCents = goalCents;
  var activeAnimationFrame = null;
  var hasKnownTotal = false;

  if (!currentAmountEl || !goalAmountEl || !metaEl || !fillEl || !endpoint || !trackEl) {
    return;
  }

  function formatDollarsFromCents(cents) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format((cents || 0) / 100);
  }

  function setLoading(isLoading) {
    meter.classList.toggle("is-loading", isLoading);
    meter.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  function updateMeter(raisedCents, nextGoalCents) {
    var safeRaised = Math.max(0, Number(raisedCents) || 0);
    var safeGoal = Math.max(1, Number(nextGoalCents) || goalCents);
    var percent = Math.min(100, Math.round((safeRaised / safeGoal) * 100));

    currentRaisedCents = safeRaised;
    currentGoalCents = safeGoal;
    currentAmountEl.textContent = formatDollarsFromCents(safeRaised);
    goalAmountEl.textContent = formatDollarsFromCents(safeGoal);
    fillEl.style.width = percent + "%";
    metaEl.textContent = percent + "% complete";
    trackEl.setAttribute("aria-valuenow", String(percent));
  }

  function setKnownTotal(isKnown) {
    hasKnownTotal = isKnown;
    meter.classList.toggle("no-total", !isKnown);
  }

  function parseRaisedCents(value) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    // Treat zero/negative totals as unknown to avoid flashing bad API values.
    if (parsed <= 0) {
      return null;
    }

    return Math.round(parsed);
  }

  function animateMeterTo(nextRaisedCents, nextGoalCents, durationMs) {
    var startRaised = currentRaisedCents == null ? 0 : currentRaisedCents;
    var endRaised = Math.max(0, Number(nextRaisedCents) || 0);
    var endGoal = Math.max(1, Number(nextGoalCents) || goalCents);
    var startGoal = currentGoalCents;
    var startTime = null;

    if (activeAnimationFrame) {
      cancelAnimationFrame(activeAnimationFrame);
      activeAnimationFrame = null;
    }

    if (durationMs <= 0) {
      updateMeter(endRaised, endGoal);
      return;
    }

    function step(timestamp) {
      if (!startTime) {
        startTime = timestamp;
      }

      var progress = Math.min(1, (timestamp - startTime) / durationMs);
      var eased = 1 - Math.pow(1 - progress, 3);
      var easedRaised = Math.round(startRaised + (endRaised - startRaised) * eased);
      var easedGoal = Math.round(startGoal + (endGoal - startGoal) * eased);

      updateMeter(easedRaised, easedGoal);

      if (progress < 1) {
        activeAnimationFrame = requestAnimationFrame(step);
      } else {
        activeAnimationFrame = null;
      }
    }

    activeAnimationFrame = requestAnimationFrame(step);
  }

  function parseJsonFromTextResponse(text) {
    var start = text.indexOf("{");
    var end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found in text response");
    }

    return JSON.parse(text.slice(start, end + 1));
  }

  function firstFulfilled(promises) {
    return new Promise(function(resolve, reject) {
      var pending = promises.length;
      var errors = [];

      if (!pending) {
        reject(new Error("No sources to fetch"));
        return;
      }

      promises.forEach(function(promise, index) {
        Promise.resolve(promise).then(resolve).catch(function(error) {
          errors[index] = error;
          pending -= 1;
          if (pending === 0) {
            reject(errors[0] || new Error("All sources failed"));
          }
        });
      });
    });
  }

  async function fetchSource(source) {
    var abortController = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = setTimeout(function() {
      if (abortController) {
        abortController.abort();
      }
    }, sourceTimeoutMs);

    try {
      var response = await fetch(source.url, {
        cache: "no-store",
        signal: abortController ? abortController.signal : undefined
      });

      if (!response.ok) {
        throw new Error("Non-200 response");
      }

      if (source.parseMode === "json") {
        return response.json();
      }

      return parseJsonFromTextResponse(await response.text());
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function fetchMetrics(options) {
    var shouldShowLoading = options && options.showLoading;
    var shouldAnimate = !options || options.animate !== false;
    if (shouldShowLoading) {
      setLoading(true);
    }

    var sources = [{
      url: jinaMirrorUrl,
      parseMode: "text-json"
    }];

    if (proxyPrefix) {
      sources.push({
        url: proxyPrefix + encodeURIComponent(endpoint),
        parseMode: "json"
      });
    }
    if (proxyPrefix !== fallbackProxyPrefix) {
      sources.push({
        url: fallbackProxyPrefix + encodeURIComponent(endpoint),
        parseMode: "json"
      });
    }

    try {
      var payload = await firstFulfilled(sources.map(fetchSource));
      var raisedCents = payload.total_amount_raised_in_cents;
      var endpointGoalCents = payload.goal_amount_in_cents;
      var parsedRaisedCents = parseRaisedCents(raisedCents);

      if (parsedRaisedCents != null) {
        setKnownTotal(true);
        if (shouldAnimate) {
          animateMeterTo(parsedRaisedCents, endpointGoalCents || goalCents, currentRaisedCents == null ? 1400 : 900);
        } else {
          updateMeter(parsedRaisedCents, endpointGoalCents || goalCents);
        }

        setLoading(false);
        return;
      }
    } catch (error) {
    }

    if (hasKnownTotal) {
      if (shouldShowLoading) {
        setLoading(false);
      }
      metaEl.textContent = "Live total unavailable, showing last known values";
      return;
    }

    setKnownTotal(false);
    metaEl.textContent = "Loading live total...";
    if (shouldShowLoading) {
      setLoading(true);
    } else {
      setLoading(true);
    }
  }

  setKnownTotal(false);
  setLoading(true);
  metaEl.textContent = "Loading live total...";
  fetchMetrics({ animate: true, showLoading: true });
  setInterval(function() {
    fetchMetrics({ animate: true, showLoading: !hasKnownTotal });
  }, 60000);

  meter.addEventListener("click", function() {
    fetchMetrics({ animate: true, showLoading: true });
  });
})();