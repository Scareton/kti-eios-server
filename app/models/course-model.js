let mongoose = require('mongoose');

// КОНТЕНТ (Вложения в курс)
// TODO сортировка вложений (order)
let ContentSchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  type: {
    $type: String,
    required: [true, "typeRequired"],
  },
  content: {
    $type: String,
    required: [true, "contentRequired"]
  },
  students: [
    {
      _id: {
        $type: mongoose.Types.ObjectId,
        required: [true, "studentIdRequired"]
      },
      s: {
        $type: Number,
        required: [true, "studentStatusRequired"]
      }
    }
  ],
  req: [{
    type: {
      $type: String,
      required: [true, "reqTypeRequired"]
    },
    target: {
      $type: mongoose.Types.ObjectId,
      required: [true, "reqTargetRequired"]
    }
  }]
}, { typeKey: '$type' })
let Content = mongoose.model('Content', ContentSchema);

// КУРС
let CourseSchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  availability: {
    $type: Number,
    default: 0
  },
  description: {
    $type: String,
    default: ""
  },
  level: {
    $type: mongoose.Types.ObjectId,
    required: [true, "levelRequired"]
  },
  discipline: {
    $type: mongoose.Types.ObjectId,
    required: [true, "disciplineRequired"]
  },
  type: {
    $type: String,
    default: "course",
    immutable: true
  },
  content: [ContentSchema]
}, { typeKey: '$type' });
let Course = mongoose.model('Course', CourseSchema);


module.exports = Course;