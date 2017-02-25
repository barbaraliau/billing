const Analytics = require('analytics-node');
// NB: Not a private key. This same key is on bridge-gui/index.html
const API_WRITE_KEY = 'JHfKYYbErCZRf2QFQTQNTyP0IF6RMSUC';
const devOptions = { flushAt: 1 };

if (process.env.NODE_ENV !== 'production') {
  return module.exports = new Analytics(API_WRITE_KEY, devOptions);
}

return module.exports = new Analytics(API_WRITE_KEY);
