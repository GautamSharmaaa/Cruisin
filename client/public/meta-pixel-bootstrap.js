(function (w) {
  w.document.documentElement.setAttribute('data-cruisin-meta-bootstrap', 'ready');
  if (w.fbq) {
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
  w.dispatchEvent(new Event('cruisin-meta-bootstrap-ready'));
})(window);
