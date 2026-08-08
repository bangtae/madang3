// app/main.js - 애플리케이션 진입점

document.addEventListener('DOMContentLoaded', () => {
  console.log('⚡ API Management Portal initialized');
  if (window.AppController) {
    window.AppController.init();
  }
});
