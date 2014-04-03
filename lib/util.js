/**
 * Module dependencies
 */

var parse = require('url').parse;

exports.isRemote = function(url) {
  return !!parse(url).scheme;
};

exports.build = function(path, body, opts, fn) {
  var request = opts.request;
  var log = opts.logs;

  request
    .post(opts.host + path)
    .send(body)
    .type('form')
    .buffer(false)
    .end(function(err, res) {
      if (err) return fn(err);
      if (!res.ok) return fn(new Error(res.text));

      res.on('data', function(data) {
        log('' + data); // TODO chunk.gsub("\000\000\000", "")
      });

      // TODO do we need to handle close or error?

      res.on('end', function() {
        var slug = res.headers['x-slug-url'];
        var manifest = res.headers['x-manifest-id'];
        var cache = res.headers['x-cache-url'];
        var exit = res.headers['x-exit-code'];

        if (!exit) return check(manifest, slug, cache, fn);
        if (exit !== '0') return fn(new Error('build exited with status ' + exit));
        fn(null, slug, cache);
      });
    });

  function check(manifest, slug, cache, fn) {
    request
      .get(opts.host + '/exit/' + manifest)
      .end(function(err, res) {
        if (err) return fn(err);
        var exit = res.text
        if (exit !== '0') return fn(new Error('build exited with status ' + exit));
        fn(null, slug, cache);
      });
  }
}
