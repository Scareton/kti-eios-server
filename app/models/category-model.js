let mongoose = require('mongoose');

let CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "nameRequired"],
  },
  alias: {
    type: String,
    required: [true, "aliasRequired"],
  }
});

let Category = mongoose.model('Category', CategorySchema);

module.exports = Category;