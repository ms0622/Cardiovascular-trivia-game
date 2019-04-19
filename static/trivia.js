const questionField = document.querySelector('.question')
const newGameField = document.querySelector('#new_game')

const choices = ['A', 'B', 'C', 'D']
let answering = false
let owner = false

const ws = new WebSocket(`ws://${location.hostname}:8080`)
ws.onmessage = message => {
  const json = JSON.parse(message.data)
  if (json.type == 'question') {
    answering = false
    if (json.owner) owner = true

    if (json.gameOver) {
      alert(`Game over! Your final score is ${json.score}`)
      if (owner) newGameField.style.display = 'block'
    } else {
      const question = json.question
      questionField.innerHTML = question.q
      question.choices.forEach((choice, index) => {
        const choiceField = document.querySelector(`#choice${index}`)
        if (choiceField) choiceField.innerHTML = choice
      })
    }
  } else if (json.type == 'result') {
    if (json.correct) {
      alert("Correct!")
    } else {
      alert(`Sorry, the correct choice was ${choices[json.correctChoice]}`)
    }
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
