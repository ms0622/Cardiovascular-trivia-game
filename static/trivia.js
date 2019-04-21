const questionField = document.querySelector('.question')
const newGameField = document.querySelector('#new_game')

const choices = ['A', 'B', 'C', 'D']
let answering = false
let owner = false

const wsAddress = location.protocol == 'http:' ?
  `ws://${location.hostname}:8080` :
  `wss://${location.hostname}/quiz-socket`
const ws = new WebSocket(wsAddress)
ws.onmessage = message => {
  const json = JSON.parse(message.data)
  if (json.type == 'question') {
    answering = false

    const question = json.question
    questionField.innerHTML = question.q
    question.choices.forEach((choice, index) => {
      const choiceField = document.querySelector(`#choice${index}`)
      if (choiceField) choiceField.innerHTML = choice
    })
  } else if (json.type == 'result') {
    if (json.correct) {
      alert("Correct!")
    } else {
      alert(`Sorry, the correct choice was ${choices[json.correctChoice]}`)
    }
  } else if (json.type == 'owner') {
    owner = true
    if (owner) newGameField.style.display = 'block'
  } else if (json.type == 'game_over') {
    alert(`Game over! Your final score is ${json.score}`)
    if (owner) newGameField.style.display = 'block'
  }
}

for (let i = 0; i < 4; i++) {
  const choice = document.querySelector(`#choice${i}`)
  choice.parentNode.onclick = () => answer(i)
}
newGameField.onclick = newGame

function answer(choice) {
  if (answering) return

  answering = true
  ws.send(JSON.stringify({type: 'answer', choice}))
}

function newGame() {
  ws.send(JSON.stringify({type: 'new_game'}))
  newGameField.style.display = 'none'
}
