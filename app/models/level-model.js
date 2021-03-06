let mongoose = require('mongoose');

let LevelSchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  alias: {
    $type: String,
    required: [true, "aliasRequired"],
  },
  abbreviation: {
    $type: String,
  },
  type: {
    $type: String,
    default: "level",
    immutable: true
  }
}, { typeKey: '$type' });

let Level = mongoose.model('Level', LevelSchema);

module.exports = Level;