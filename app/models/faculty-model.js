let mongoose = require('mongoose');

let FacultySchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  alias: {
    $type: String,
    required: [true, "aliasRequired"],
  },
  institute: {
    $type: mongoose.Types.ObjectId,
    ref: "Institute"
  },
  type: {
    $type: String,
    default: "faculty",
    immutable: true
  }
}, { typeKey: '$type' });

let Faculty = mongoose.model('Faculty', FacultySchema);

module.exports = Faculty;