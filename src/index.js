import ColorwoodGame from "./js/game-interview.js";

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
  canvas.addEventListener("mouseleave", handleMouseLeave); // Add mouseleave event

  // Handle CTA click
  canvas.addEventListener("click", (e) => {
    if (game.gameState === "cta") {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is within CTA button
      const scale = game.canvas.width / game.originalWidth;
      const buttonWidth = 300 * scale; // Updated to match new button width
      const buttonHeight = 80 * scale; // Updated to match new button height
      const buttonX = (game.canvas.width - buttonWidth) / 2;
      const buttonY = game.canvas.height / 2 + 20 * scale;

      if (x >= buttonX && x <= buttonX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight) {
        window.open("https://play.google.com/store/apps/details?id=games.burny.color.sort.woody.puzzle&hl=en-US", "_blank");
      }
    }
  });

  // Add event listener for the HTML CTA button
  document.getElementById("ctaButton").addEventListener("click", () => {
    window.open("https://play.google.com/store/apps/details?id=games.burny.color.sort.woody.puzzle&hl=en-US", "_blank");
  });

  // Add event listener for the intro overlay
  document.getElementById("introOverlay").addEventListener("click", () => {
    if (game.gameState === "intro") {
      game.hideIntro();
      game.gameState = "gameplay";
      game.hasInteracted = true;
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
    e.preventDefault(); // Prevent default behavior
    const { x, y } = getCanvasCoordinates(e);
    handleStart(x, y);
  }

  function handleMouseMove(e) {
    e.preventDefault(); // Prevent default behavior for smoother dragging
    const { x, y } = getCanvasCoordinates(e);
    if (game.isDragging) {
      game.updateDrag(x, y);
    } else {
      game.updateHover(x, y);
    }
  }

  function handleMouseUp(e) {
    e.preventDefault(); // Prevent default behavior
    const { x, y } = getCanvasCoordinates(e);
    handleEnd(x, y);
  }

  // Add mouseleave handler to reset dragging state when mouse leaves canvas
  function handleMouseLeave(e) {
    if (game.isDragging) {
      // Reset dragging state when mouse leaves canvas
      game.isDragging = false;
      game.dragOffsetX = 0;
      game.dragOffsetY = 0;
      game.selectedHoleIndex = -1;
      game.selectedGroupSize = 0;
    }
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
