/* Modal */
var modalContainer = document.body.querySelector('#modal-container');

// Ouverture du modal sur la demande de l'username
function openUsernameModal() {
  modalContainer.querySelector('#contentUsername').classList.remove('none');
  modalContainer.querySelector('#contentUsers').classList.add('none');
  modalContainer.classList.remove('out');
  document.body.classList.add('modal-active');
}

// Ouverture du modal sur la liste des utilisateurs connectés
function openUsersModal() {
  modalContainer.querySelector('#contentUsername').classList.add('none');
  modalContainer.querySelector('#contentUsers').classList.remove('none');
  modalContainer.classList.remove('out');
  document.body.classList.add('modal-active');
}

// Fermeture du modal
function closeModal() {
  modalContainer.classList.add('out');
  document.body.classList.remove('modal-active');
}