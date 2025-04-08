import ColorwoodGame from "./js/game.js";

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const game = new ColorwoodGame(canvas);

  // Handle window resize
  window.addEventListener("resize", () => {
    game.init(); // Reinitialize game on resize
  });

  // Handle touch events for mobile
  canvas.addEventListener("touchstart", handleTouchStart);
  canvas.addEventListener("touchmove", handleTouchMove);
  canvas.addEventListener("touchend", handleTouchEnd);

  // Handle mouse events for desktop
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);

  // Handle CTA click
  canvas.addEventListener("click", (e) => {
    if (game.gameState === "cta") {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is within CTA button
      const scale = game.canvas.width / game.originalWidth;
      const buttonWidth = 200 * scale;
      const buttonHeight = 60 * scale;
      const buttonX = (game.canvas.width - buttonWidth) / 2;
      const buttonY = game.canvas.height / 2 + 20 * scale;

      if (x >= buttonX && x <= buttonX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight) {
        window.open("https://play.google.com/store/apps/details?id=com.colorwood.sort.puzzle", "_blank");
      }
    }
  });

  function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;

    if (e.touches) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    return { x, y };
  }

  function handleTouchStart(e) {
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    handleStart(x, y);
  }

  function handleTouchMove(e) {
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    if (game.isDragging) {
      game.updateDrag(x, y);
    } else {
      game.updateHover(x, y);
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    handleEnd(x, y);
  }

  function handleMouseDown(e) {
    const { x, y } = getCanvasCoordinates(e);
    handleStart(x, y);
  }

  function handleMouseMove(e) {
    const { x, y } = getCanvasCoordinates(e);
    if (game.isDragging) {
      game.updateDrag(x, y);
    } else {
      game.updateHover(x, y);
    }
  }

  function handleMouseUp(e) {
    const { x, y } = getCanvasCoordinates(e);
    handleEnd(x, y);
  }

  function handleStart(x, y) {
    if (game.gameState !== "gameplay") return;
    game.startDrag(x, y);
  }

  function handleEnd(x, y) {
    if (game.gameState !== "gameplay") return;
    game.endDrag(x, y);
  }
});
