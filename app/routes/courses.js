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
  CourseModel.aggregate([
    {
      $project: {
        _id: 1,
        name: 1,
        availability: 1,
        description: 1,
        level: 1,
        discipline: 1,
        type: 1
      }
    },
    {
      $lookup: {
        from: 'disciplines',
        localField: 'discipline',
        foreignField: '_id',
        as: 'discipline'
      }
    },
    {
      $lookup: {
        from: 'levels',
        localField: 'level',
        foreignField: '_id',
        as: 'level'
      }
    },
    {
      $unwind: "$level"
    },
    {
      $unwind: "$discipline"
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

function checkContentRequirments(req, res, creq, course) {
  return new Promise((resolve, reject) => {
    // Обработка условия типа "Завершённый этап"
    if (creq.type === "finished") {
      let target = course.content.find(item => item._id.equals(creq.target))
      let targetUser = target.students.find(item => item._id.equals(req.user._id))

      // Если во вложении для заданного пользователя статус установлен в "Завершено"
      // Передаём вложение
      if (targetUser.s === 3) resolve();
      else reject();
    }
    // Если тип не известен
    else reject();
  })
}

app.get("/api/courses/:courseId", (req, res) => {
  if (req.params.courseId) {
    CourseModel.findOne({ _id: req.params.courseId }, (err, course) => {
      if (!err && course !== null) {
        new Promise(resolve => {
          // Перебор вложений курса
          course.content.forEach((content, i) => {
            if (req.user) {
              // Оставить в массиве студентов только текущего пользователя
              content.students = content.students.filter(item => item._id.equals(req.user._id))

              // Если у вложения есть условия открытия
              if (content.req[0]) {
                content.req.forEach(creq => {
                  checkContentRequirments(req, res, creq, course).catch(() => {
                    course.content.splice(i, 1)
                  })
                });
              }
            } else {
              // Вернуть пустой массив со студентами
              content.students.length = 0;

              // Если у вложения есть условия открытия
              if (content.req[0]) {
                course.content.splice(i, 1)
              }
            }
          });
          resolve();
        }).then(() => {
          res.send(course)
        })
      }
      else res.status(500).send("Произошла ошибка во время получения курса")
    })
  } else {
    res.status(404).send("Курс не найден")
  }
})

/**
 * Установить статус для вложения
 * @param {Number} status id статуса, который будет установлен
 */
function changeUserStatusInCourseContent(req, res, status) {
  CourseModel.findOne({ _id: req.params.courseId }, (err, course) => {
    if (!err && course !== null) {
      // Найти указанное вложение
      let content = course.content.find(item => item._id == req.params.contentId);

      // Найти текущего пользователя во вложении
      let studentInContent = content.students.find(item => item._id.equals(req.user._id));

      // Если пользователя нет в списке - добавить его и установить статус 1
      if (studentInContent === undefined) {
        content.students.push({ _id: req.user._id, s: status })
      }
      // Если пользователь уже есть в списке - установить статус 1
      else {
        studentInContent.s = status
      }

      // Сохранить ресурс
      course.save(err => {
        if (!err) res.redirect(`/api/courses/${req.params.courseId}`)
        else res.status(500).send("Ошибка при сохранении");
      })

    }
    else res.status(404).send("Курс не найден")
  })
}

app.post("/api/courses/:courseId/:contentId/watch", mustAuthenticated, (req, res) => {
  changeUserStatusInCourseContent(req, res, 1)
})

app.post("/api/courses/:courseId/:contentId/finish", mustAuthenticated, (req, res) => {
  changeUserStatusInCourseContent(req, res, 3)
})