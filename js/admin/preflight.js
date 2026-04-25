/* Runs before module scripts. External file keeps token bootstrap out of page text. */
(function () {
  var K = 'customsite_access_token';
  var t = null;
  try {
    t = localStorage.getItem(K) || sessionStorage.getItem(K);
    if (t && !localStorage.getItem(K)) {
      try {
        localStorage.setItem(K, t);
      } catch (e) {}
    }
  } catch (e) {}
  if (t) {
    var o = document.getElementById('admSignedOut');
    var a = document.getElementById('admApp');
    if (o) o.style.display = 'none';
    if (a) a.style.display = 'flex';
  }
})();
