window.addEventListener('load', () => {
  const element = document.getElementById('eee');
  let height = 0, bigger = true;
  function animation () {
    if (bigger) {
      height += 2;
      if (height >= 300) {
        bigger = false;
      }
    } else {
      height -= 2;
      if (height <= 0) {
        bigger = true;
      }
    }
    element.style.height = `${height}px`;
    window.requestAnimationFrame(() => {
      animation();
    })
  }
  animation();
})