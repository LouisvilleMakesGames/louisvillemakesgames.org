(function () {
  var galleryRoot = document.getElementById("jam-gallery");
  if (!galleryRoot || typeof window.baguetteBox === "undefined") return;

  window.baguetteBox.run("#jam-gallery", {
    filter: /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i,
    animation: "fadeIn",
    noScrollbars: true,
    buttons: true
  });
})();
