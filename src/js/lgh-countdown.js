(function () {
  var el = document.getElementById('lgh-flavor-text');
  if (!el) return;

  var target = (el.getAttribute('data-target-date-et') || '2026-11-07').split('-');
  var ty = Number(target[0]);
  var tm = Number(target[1]);
  var td = Number(target[2]);

  function etParts() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    var out = {};
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type !== 'literal') out[parts[i].type] = Number(parts[i].value);
    }
    return out;
  }

  function update() {
    var n = etParts();
    var nowDay = Date.UTC(n.year, n.month - 1, n.day);
    var targetDay = Date.UTC(ty, tm - 1, td);
    var days = Math.max(0, Math.ceil((targetDay - nowDay) / 86400000));
    el.textContent = 'ONLY ' + days + ' DAY' + (days === 1 ? '' : 'S') + ' UNTIL GAME HARVEST!';
  }

  update();
  setInterval(update, 60000);
})();
