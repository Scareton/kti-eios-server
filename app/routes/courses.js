const app = require('../../index').app;
const mustAuthenticated = require('../../index').mustAuthenticated;
const mongoose = require("mongoose");

const CourseModel = require('../models/course-model')
const CategoryModel = require("../models/category-model")
const LevelModel = require("../models/level-model")
const FacultyModel = require("../models/faculty-model")
const InstituteModel = require("../models/institute-model")
const DisciplineModel = require("../models/discipline-model")

/**
 * Получить список курсов
 */
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

/**
 * Проверить требования для получения секции или вложения
 */
function checkElementRequirments(element, parent, user, type) {
  return new Promise((resolve, reject) => {
    // Проверка, есть ли у элемента требования
    if (element.req[0]) {
      element.req.forEach(requirment => {
        // Тип требования - завершить работу с другим элементом
        if (requirment.type === "finished") {
          // Найти цель, на которую ссылается требование 
          let target = parent[type].find(item => item._id.equals(requirment.target))
          // Найти текущего пользователя в списке пользователей цели
          let targetStudent = target.students.find(item => item._id.equals(user._id))
          // Если пользователь найден в списке
          if (targetStudent !== undefined) {
            // Проверить статус пользователя для элемента-цели
            if (targetStudent.s !== 3) resolve(false)
          }
          // Если пользователь не найден в списке - отклонить элемент
          else resolve(false)
        }
        // Если тип требования неизвестен - отклонить элемент
        else resolve(false)
      });
      // Если перебор прошёл успешно - вернуть элемент
      resolve(true);
    }
    // Если у элемента нет требований - вернуть элемент
    else resolve(true);
  })
}

async function checkRequirments(course, user) {
  await Promise.all(course.sections.map(async (section, sectionIndex) => {
    await checkElementRequirments(section, course, user, "sections")
      .then(async (sectionResult) => {
        console.log(sectionResult, `section ${section.name}`)
        if (!sectionResult) course.sections.splice(sectionIndex, 1)
        else {
          await Promise.all(section.content.map(async (content, contentIndex) => {
            await checkElementRequirments(content, section, user, "content")
              .then(contentResult => {
                console.log(contentResult, `content ${content.name}`)
                if (!contentResult) section.content.splice(contentIndex, 1)
              })
          }))
        }
      });
  }));
}

/**
 * Получение определённого курса.
 * Задача - отправить курс, отфильтровав его секции и вложения 
 * индивидуально для каждого пользователя
 */
app.get("/api/courses/get/:courseId", (req, res) => {
  CourseModel.aggregate([
    {
      // Выбрать только курс с указанным _id
      $match: {
        _id: mongoose.Types.ObjectId(req.params.courseId)
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
    // Аггрегация возвращает массив с одним элементом.
    // Получить нужный курс, выбрав первый элемент массива
    let course = courses[0];
    if (!err && course) {
      // Отфильтровать секции курса
      checkRequirments(course, req.user).then(() => {
        res.send(course)
      })
    } else res.status(404).send("Курс не найден")
  })

  // res.send("123")
})

/**
 * Установить статус для вложения
 * @param {Number} status id статуса, который будет установлен
 */
function changeUserStatusInCourseContent(req, res, status) {
  CourseModel.findOne({ "sections.content._id": req.params.contentId }, (err, course) => {
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
        if (!err) res.redirect(`/api/courses/get/${req.params.courseId}`)
        else res.status(500).send("Ошибка при сохранении");
      })

    }
    else res.status(404).send("Курс не найден")
  })
}

app.post("/api/courses/contents/:contentId/watch", mustAuthenticated, (req, res) => {
  changeUserStatusInCourseContent(req, res, 1)
})

app.post("/api/courses/contents/:contentId/finish", mustAuthenticated, (req, res) => {
  changeUserStatusInCourseContent(req, res, 3)
})