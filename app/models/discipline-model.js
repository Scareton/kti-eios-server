let mongoose = require('mongoose');

let DisciplineSchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  alias: {
    $type: String,
    required: [true, "aliasRequired"],
  },
  type: {
    $type: String,
    default: "discipline",
    immutable: true
  }
}, { typeKey: '$type' });

let Discipline = mongoose.model('Discipline', DisciplineSchema);

module.exports = Discipline;