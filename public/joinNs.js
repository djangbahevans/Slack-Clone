function joinNs(endpoint) {
  if (nsSocket) {
    // check to see if ns socket is an actual socket
    nsSocket.close();
    // Remove event listener before it's added again
    document.querySelector('#user-input').removeEventListener('submit', formSubmission)
  }
  nsSocket = io(`${endpoint}`)
  nsSocket.on('nsRoomLoad', (nsRooms) => {
    let roomList = document.querySelector('.room-list')
    roomList.innerHTML = []
    nsRooms.forEach(room => {
      roomList.innerHTML += `<li class="room"><span class="glyphicon glyphicon-${room.privateRoom ? 'lock' : 'globe'}"></span>${room.roomTitle}</li>`
    })

    // add click listener to each room
    let roomNodes = document.getElementsByClassName('room')
    Array.from(roomNodes).forEach(elem => {
      elem.addEventListener('click', e => {
        // console.log(`Someone clicked on ${e.target.innerText}`);
        joinRoom(e.target.innerText)
      })
    })

    // add to room automatically... first time
    const topRoom = document.querySelector('.room')
    const topRoomName = topRoom.innerText
    joinRoom(topRoomName)
  })

  nsSocket.on('messageToClients', msg => {
    const newMsg = buildHTML(msg)
    const messagesUl = document.querySelector('#messages')

    messagesUl.innerHTML += newMsg
    messagesUl.scrollTo(0, messagesUl.scrollHeight)
  })

  document.querySelector('.message-form').addEventListener('submit', formSubmission)
}

function formSubmission(e) {
  e.preventDefault()
  const newMessage = document.querySelector('#user-message').value;
  nsSocket.emit('newMessageToServer', { text: newMessage })
}

function buildHTML(msg) {
  const convertedDate = new Date(msg.time).toLocaleString();
  const newHTML = `
  <li>
      <div class="user-image">
          <img src="${msg.avatar}" />
      </div>
      <div class="user-message">
          <div class="user-name-time">${msg.username} <span>${convertedDate}</span></div>
          <div class="message-text">${msg.text}</div>
      </div>
  </li>
  `

  return newHTML
}
