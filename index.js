module.exports = process.env.ANVIL_COV
  ? require('./lib-cov/anvil')
  : require('./lib/anvil');
