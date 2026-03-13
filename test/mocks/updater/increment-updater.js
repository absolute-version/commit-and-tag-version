module.exports.readVersion = function (contents) {
  return Number.parseInt(contents);
};

module.exports.writeVersion = function (contents) {
  return this.readVersion(contents) + 1;
};
