import questions from './questions.js'

const question = questions[0]
const questionField = document.querySelector('.question')
questionField.innerHTML = question.q
question.choices.forEach((choice, index) => {
  const choiceField = document.querySelector(`#choice${index}`)
  if (choiceField) choiceField.innerHTML = choice
})

