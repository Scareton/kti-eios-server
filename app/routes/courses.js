const app = require('../../index').app;
const mustAuthenticated = require('../../index').mustAuthenticated;
const mongoose = require("mongoose");

const CourseModel = require('../models/course-model')
const CategoryModel = require("../models/category-model")
const LevelModel = require("../models/level-model")
const FacultyModel = require("../models/faculty-model")
const InstituteModel = require("../models/institute-model")
const DisciplineModel = require("../models/discipline-model")

app.get("/api/courses", (req, res) => {
  // CourseModel.find({ availability: { $ne: 0 } }, (err, courses) => {
  //   if (!err) res.send(courses)
  //   else {
  //     console.log(err)
  //     res.status(500).send("Произошла ошибка при получении курсов")
  //   }
  // }).populate("level discipline")

  CourseModel.aggregate([
    {
      $group: {
        _id: "$discipline",
        children: { $push: "$$ROOT" }
      }
    },
    {
      $lookup: {
        from: 'disciplines',
        localField: '_id',
        foreignField: '_id',
        as: '_id'
      }
    },
    {
      $unwind: "$_id"
    },
    {
      $group: {
        _id: "$children.level",
        children: { $push: "$$ROOT" }
      }
    },
    {
      $unwind: "$_id"
    },
    {
      $lookup: {
        from: 'levels',
        localField: '_id',
        foreignField: '_id',
        as: '_id'
      }
    },
    {
      $unwind: "$_id"
    }
  ]).exec((err, courses) => {
    if (!err) {
      res.send(courses)
    }
    else {
      console.log(err)
      res.status(500).send("Произошла ошибка при получении курсов")
    }
  })
})

app.get("/api/courses/categories", (req, res) => {
  // new FacultyModel({name: "Факультет промышленных технологий", alias: "fit", abbrevation: "ФПТ" }).save((err) => {
  //   // if (!err) res.send('ok')
  //   // else console.log(err)
  // });
  // new InstituteModel({name: "Камышинский технологический институт", alias: "kti", abbrevation: "КТИ" }).save((err) => {
  //   if (!err) res.send('ok')
  //   else console.log(err)
  // });
})