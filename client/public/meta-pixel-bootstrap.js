(function (w, d) {
  if (w.fbq) {
    d.documentElement.setAttribute('data-cruisin-meta-bootstrap', 'ready');
    w.dispatchEvent(new Event('cruisin-meta-bootstrap-ready'));
    return;
  }
  var n = w.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  var script = d.createElement('script');
  script.id = 'cruisin-meta-pixel-library';
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  var firstScript = d.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(script, firstScript);
  d.documentElement.setAttribute('data-cruisin-meta-bootstrap', 'ready');
  w.dispatchEvent(new Event('cruisin-meta-bootstrap-ready'));
})(window, document);
