const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 8080 })
const game = {running: false}
const players = []

function noop() {}

wss.on('connection', function connection(ws) {
  if (!game.running) newGame()

  ws.player = {score: 0, answered: false}
  ws.isAlive = true
  players.push(ws)
  sendQuestion(ws)

  ws.on('pong', data => {
    ws.isAlive = true
  })

  ws.on('message', function incoming(message) {
    const json = JSON.parse(message)
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
  players.forEach(ws => {
    if (!ws.isAlive) {
      const index = players.findIndex(p => p == ws)
      players.splice(index, 1)
      console.log(`Removed player ${index}`)
    }

    ws.isAlive = false
    ws.ping('test', false, noop)
  })
}, 10000)

function checkEveryoneAnswered() {
  if (players.every(ws => ws.player.answered)) {
    game.questionNumber++
    if (game.questionNumber == questions.length) game.finished = true
    players.forEach(ws => {
      ws.player.answered = false
      sendQuestion(ws)
    })
  }
}

function sendQuestion(ws) {
  if (game.finished) {
    ws.send(JSON.stringify({type: 'question', gameOver: true, score: ws.player.score}))
    return
  }

  const index = game.questionNumber
  const question = questions[index]
  ws.send(JSON.stringify({
    type: 'question',
    gameOver: false,
    question: {
      q: question.q,
      choices: question.choices,
      funfact: question.funfact
    },
    id: index
  }))
}

app.use('/', express.static('static'))
app.use(bodyParser.json())
app.listen(3000, _ => console.log('ready'))

const questions = require('./questions.js')
questions.forEach(q => q.correctChoice = 0)

app.post('/answer', (req, resp) => {
})

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
}
