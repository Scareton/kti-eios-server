let mongoose = require('mongoose');

let InstituteSchema = new mongoose.Schema({
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
    default: "institute",
    immutable: true
  }
}, { typeKey: '$type' });

let Institute = mongoose.model('Institute', InstituteSchema);

module.exports = Institute;