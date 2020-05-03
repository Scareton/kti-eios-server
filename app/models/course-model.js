let mongoose = require('mongoose');
const CategoryModel = require("./category-model")

let CourseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "nameRequired"],
  },
  availability: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ""
  },
  level: {
    type: mongoose.Types.ObjectId,
    ref: 'Level',
    required: [true, "levelRequired"]
  },
  // category: {
  //   type: mongoose.Types.ObjectId,
  //   ref: 'Category',
  //   required: [true, "categoryRequired"]
  // },
  discipline: {
    type: mongoose.Types.ObjectId,
    ref: 'Discipline',
    required: [true, "disciplineRequired"]
  }
});

let Course = mongoose.model('Course', CourseSchema);

module.exports = Course;