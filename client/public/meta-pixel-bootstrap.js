(function (w, d) {
  var n = w.fbq;
  if (!n) n = w.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!w._fbq) w._fbq = n;
  if (!n.push) n.push = n;
  n.loaded = true;
  if (!n.version) n.version = '2.0';
  if (!n.queue) n.queue = [];
  var libraryUrl = 'https://connect.facebook.net/en_US/fbevents.js';
  if (!n.callMethod && !d.querySelector('script[src="' + libraryUrl + '"]')) {
    var script = d.createElement('script');
    script.id = 'cruisin-meta-pixel-library';
    script.async = true;
    script.src = libraryUrl;
    var firstScript = d.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  }
  d.documentElement.setAttribute('data-cruisin-meta-bootstrap', 'ready');
  w.dispatchEvent(new Event('cruisin-meta-bootstrap-ready'));
})(window, document);
