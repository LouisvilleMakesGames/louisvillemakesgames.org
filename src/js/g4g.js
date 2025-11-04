  // --- Blipping subheading text ---
  const phrases = [
    "Arts orgs in our city are feeling the pinch",
    "Help us keep our creative community space alive!",
    "Every dollar counts",
    "Get rad exclusive perks",
    "Help keep the creativity flowing"
  ];

  const blip = document.getElementById("blip-text");
  let phraseIndex = 0;

  function cyclePhrases() {
    blip.textContent = phrases[phraseIndex];
    blip.style.opacity = 1;

    setTimeout(() => {
      blip.style.opacity = 0;
      phraseIndex = (phraseIndex + 1) % phrases.length;
    }, 2500); // visible duration

    setTimeout(cyclePhrases, 3000); // total cycle time
  }
  cyclePhrases();

  // --- Animated donate button (JS-driven pulse & gradient) ---
  const donateBtn = document.getElementById("donate-btn");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!prefersReduced && donateBtn) {
    let t = 0;
    (function animate() {
      t += 0.02;

      // Gentle scale pulse
      const scale = 1 + 0.06 * Math.sin(t * 2);
      donateBtn.style.transform = `scale(${scale})`;

      // Tasteful red <-> purple gradient shift (HSL for smoothness)
      const hue1 = 350 + 10 * Math.sin(t * 1.2); // red-ish
      const hue2 = 285 + 10 * Math.cos(t * 1.1); // purple-ish
      const col1 = `hsl(${hue1} 85% 50%)`;
      const col2 = `hsl(${hue2} 80% 52%)`;
      donateBtn.style.backgroundImage = `linear-gradient(135deg, ${col1}, ${col2})`;
      donateBtn.style.border = "none";
      donateBtn.style.color = "#fff";

      // Glow that breathes with the pulse
      const glow = 18 + 10 * (Math.sin(t * 2) + 1); // 8..38
      donateBtn.style.boxShadow = `0 0 ${glow}px rgba(255, 60, 100, 0.6), 0 0 ${glow/2}px rgba(135, 60, 255, 0.55)`;

      // Subtle shine sweep
      const shinePos = (Math.sin(t) + 1) / 2 * 100; // 0..100%
      donateBtn.style.backgroundSize = "200% 200%";
      donateBtn.style.backgroundPosition = `${shinePos}% ${100 - shinePos}%`;

      requestAnimationFrame(animate);
    })();
  }