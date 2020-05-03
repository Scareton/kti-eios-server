const app = require('../../index').app;
const mustAuthenticated = require('../../index').mustAuthenticated;
const mongoose = require("mongoose");

const CourseModel = require('../models/course-model')
const CategoryModel = require("../models/category-model")
const LevelModel = require("../models/level-model")
const FacultyModel = require("../models/faculty-model")
const InstituteModel = require("../models/institute-model")

app.get("/api/courses", (req, res) => {
  // if (req.isAuthenticated()) {
    CourseModel.find({ availability: { $ne: 0 } }, (err, courses) => {
      if (!err) res.send(courses)
      else {
        console.log(err)
        res.status(500).send("Произошла ошибка при получении курсов")
      }
    }).populate("category level")
  // } 
  // else {
  //   CourseModel.find({ availability: 1 }, (err, courses) => {
  //     if (!err) res.send(courses)
  //     else res.status(500).send("Произошла ошибка при получении курсов")
  //   }).populate("category level")
  // }
})

app.get("/api/courses/categories", (req, res) => {
  new FacultyModel({name: "Факультет промышленных технологий", alias: "fit", abbrevation: "ФПТ" }).save((err) => {
    // if (!err) res.send('ok')
    // else console.log(err)
  });
  new InstituteModel({name: "Камышинский технологический институт", alias: "kti", abbrevation: "КТИ" }).save((err) => {
    if (!err) res.send('ok')
    else console.log(err)
  });
})
