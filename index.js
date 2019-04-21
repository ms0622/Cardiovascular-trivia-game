const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 8080 })
const game = {running: false}

function noop() {}
let questionTimer

wss.on('connection', function connection(ws) {
  if (wss.clients.size == 1) ws.send(JSON.stringify({type: 'owner'}))
  if (!game.running) newGame()

  ws.player = {score: 0, answered: false}
  ws.isAlive = true

  ws.on('pong', data => {
    ws.isAlive = true
  })

  ws.on('message', function incoming(message) {
    const json = JSON.parse(message)

    if (json.type == 'new_game') {
      newGame()
      sendEveryoneQuestions()
      return
    }

    const choice = json.choice
    const { correctChoice } = questions[game.questionNumber]
    const correct = correctChoice == choice

    ws.player.answered = true
    if (correct) {
      ws.player.score += 100000
    }
    ws.send(JSON.stringify({type: 'result', correct, correctChoice}))
    checkEveryoneAnswered()
  })
})

setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      const index = wss.clients.findIndex(p => p == ws)
      ws.terminate()
      console.log(`Removed player ${index}`)
    }

    ws.isAlive = false
    ws.ping('test', false, noop)
  })
}, 10000)

function checkEveryoneAnswered(timeLimitReached) {
  if (timeLimitReached || Array.from(wss.clients).every(ws => ws.player.answered)) {
    clearTimeout(questionTimer)
    game.questionNumber++
    if (game.questionNumber == questions.length) {
      game.finished = true
      wss.clients.forEach(ws => {
        const obj = {
          type: 'game_over',
          score: ws.player.score
        }
        ws.send(JSON.stringify(obj))
    })
    } else {
      sendEveryoneQuestions()
    }
  }
}

function sendEveryoneQuestions() {
  wss.clients.forEach(ws => {
    ws.player.answered = false
    sendQuestion(ws)
  })
  questionTimer = setTimeout(() => checkEveryoneAnswered(true), 30000)
}

function sendQuestion(ws) {
  const index = game.questionNumber
  const question = questions[index]
  const resp = {
    type: 'question',
    question: {
      q: question.q,
      choices: question.choices,
      funfact: question.funfact
    },
    id: index
  }

  ws.send(JSON.stringify(resp))
}

app.use('/quiz', express.static('static'))
app.use(bodyParser.json())
app.listen(3001, _ => console.log('ready'))

const questions = require('./questions.js')
questions.forEach(q => q.correctChoice = 0)

function randomizeQuestions() {
  questions.forEach(question => {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  })

  questions.forEach((question, index) => {
    const choices = question.choices
    const correctChoice = choices[question.correctChoice]
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    question.correctChoice = choices.findIndex(c => c === correctChoice)
  })
}

function newGame() {
  randomizeQuestions()
  game.questionNumber = 0
  game.finished = false
  game.running = true
  wss.clients.forEach(p => {
    p.score = 0
    p.answered = false
  })
}
