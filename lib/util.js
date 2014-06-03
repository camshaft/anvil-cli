/**
 * Module dependencies
 */

var parse = require('url').parse;

exports.isRemote = function(url) {
  return !!parse(url).protocol;
};

exports.build = function(path, body, opts, fn) {
  var request = opts.request;
  var log = opts.log;

  request
    .post(opts.host + path)
    .send(body)
    .type('form')
    .buffer(false)
    .end(function(err, res) {
      if (err) return fn(err);
      if (!res.ok) return fn(new Error(res.text));

      res.on('data', function(data) {
        data += '';
        if (!data) return;
        log(data);
      });

      // TODO do we need to handle close or error?

      res.on('end', function() {
        var slug = res.headers['x-slug-url'];
        var manifest = res.headers['x-manifest-id'];
        var cache = res.headers['x-cache-url'];
        var exit = res.headers['x-exit-code'];

        if (!exit) return check(manifest, slug, cache, fn);
        if (exit !== '0') return fn(new Error('build exited with status ' + exit));
        fn(null, [slug, cache]);
      });
    });

  function check(manifest, slug, cache, fn) {
    request
      .get(opts.host + '/exit/' + manifest)
      .buffer(true)
      .end(function(err, res) {
        if (err) return fn(err);
        if (res.error) return fn(res.error);
        var exit = res.text.charAt(0);
        if (exit !== '0') return fn(new Error('build exited with status ' + exit));
        fn(null, [slug, cache]);
      });
  }
}
