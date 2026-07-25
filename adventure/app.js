(function () {
  "use strict";

  var engine = window.CastleAdventureEngine;
  if (!engine) {
    throw new Error("CastleAdventureEngine is not loaded.");
  }

  var game = new engine.CastleAdventureGame();
  var state = null;
  var choicePromptActive = false;
  var activeEventQueue = [];
  var currentSessionConfig = {
    difficulty: "easy",
    testMode: false
  };

  var compassOrder = [
    null, "north", null,
    "west", null, "east",
    null, "south", null
  ];

  var verticalOrder = ["up", "down"];

  var movementSlots = {
    north: { title: "North", detail: "y + 1" },
    south: { title: "South", detail: "y - 1" },
    east: { title: "East", detail: "x + 1" },
    west: { title: "West", detail: "x - 1" },
    up: { title: "Up", detail: "z + 1" },
    down: { title: "Down", detail: "z - 1" },
    out: { title: "Out", detail: "Lobby exit only" }
  };

  var artFiles = {
    Princess: "Princess.png",
    Monster: "Monster.png",
    Secret: "Secret.png",
    Sword: "Sword.png",
    Diamond: "Diamond.png",
    MagicBall: "MagicBall.png",
    DreamGas: "DreamGas.png"
  };

  var ui = {
    menuCard: document.getElementById("menu-card"),
    dashboard: document.getElementById("dashboard"),
    menuSummaryText: document.getElementById("menu-summary-text"),
    restartGame: document.getElementById("restart-game"),
    backMenu: document.getElementById("back-menu"),
    heroTitle: document.getElementById("hero-title"),
    heroSubtitle: document.getElementById("hero-subtitle"),
    statusDifficulty: document.getElementById("status-difficulty"),
    statusSteps: document.getElementById("status-steps"),
    statusFloor: document.getElementById("status-floor"),
    statusPrincess: document.getElementById("status-princess"),
    statusGas: document.getElementById("status-gas"),
    mapNote: document.getElementById("map-note"),
    mapStack: document.getElementById("map-stack"),
    roomTitle: document.getElementById("room-title"),
    roomCoords: document.getElementById("room-coords"),
    roomDescription: document.getElementById("room-description"),
    princessBanner: document.getElementById("princess-banner"),
    compassGrid: document.getElementById("compass-grid"),
    verticalGrid: document.getElementById("vertical-grid"),
    exitGrid: document.getElementById("exit-grid"),
    controlHint: document.getElementById("control-hint"),
    inventoryGrid: document.getElementById("inventory-grid"),
    goalList: document.getElementById("goal-list"),
    logList: document.getElementById("log-list"),
    eventOverlay: document.getElementById("event-overlay"),
    eventEyebrow: document.getElementById("event-eyebrow"),
    eventArt: document.getElementById("event-art"),
    eventTitle: document.getElementById("event-title"),
    eventMessage: document.getElementById("event-message"),
    eventContinue: document.getElementById("event-continue"),
    outcomeOverlay: document.getElementById("outcome-overlay"),
    outcomeEyebrow: document.getElementById("outcome-eyebrow"),
    outcomeTitle: document.getElementById("outcome-title"),
    outcomeMessage: document.getElementById("outcome-message"),
    outcomeGoals: document.getElementById("outcome-goals"),
    outcomeRestart: document.getElementById("outcome-restart"),
    outcomeMenu: document.getElementById("outcome-menu")
  };

  bindMenu();
  bindOverlayActions();
  renderMenuState();

  function bindMenu() {
    ui.menuCard.querySelectorAll("[data-start-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        currentSessionConfig = readButtonConfig(button);
        renderMenuState();
        startSession(currentSessionConfig);
      });
    });

    ui.restartGame.addEventListener("click", function () {
      if (!state) {
        return;
      }
      startSession();
    });

    ui.backMenu.addEventListener("click", function () {
      closeOutcome();
      closeEventOverlay();
      activeEventQueue = [];
      ui.dashboard.classList.add("is-hidden");
      ui.menuCard.classList.remove("is-hidden");
      renderMenuState();
    });

    window.addEventListener("keydown", function (event) {
      if (!state || !state.started || isInteractionLocked()) {
        return;
      }

      var keyMap = {
        ArrowUp: "north",
        ArrowDown: "south",
        ArrowLeft: "west",
        ArrowRight: "east",
        PageUp: "up",
        PageDown: "down"
      };

      var direction = keyMap[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      if (state.currentRoom.exits.indexOf(direction) !== -1) {
        applyState(game.move(direction));
      }
    });
  }

  function bindOverlayActions() {
    ui.eventContinue.addEventListener("click", function () {
      advanceEventOverlay();
    });

    ui.outcomeRestart.addEventListener("click", function () {
      startSession();
    });

    ui.outcomeMenu.addEventListener("click", function () {
      closeOutcome();
      ui.dashboard.classList.add("is-hidden");
      ui.menuCard.classList.remove("is-hidden");
      renderMenuState();
    });
  }

  function renderMenuState() {
    ui.menuCard.querySelectorAll("[data-start-mode]").forEach(function (button) {
      var buttonConfig = readButtonConfig(button);
      var sameMode = buttonConfig.testMode === currentSessionConfig.testMode;
      var sameDifficulty = buttonConfig.difficulty === currentSessionConfig.difficulty;
      button.classList.toggle("is-last-used", sameMode && sameDifficulty);
    });

    if (currentSessionConfig.testMode) {
      ui.menuSummaryText.textContent = "Last selected: Test Layout. Click any card above to start immediately.";
    } else {
      ui.menuSummaryText.textContent = "Last selected: Adventure Run - " + engine.DIFFICULTIES[currentSessionConfig.difficulty].label + ". Click any card above to start immediately.";
    }
  }

  function startSession(config) {
    if (config) {
      currentSessionConfig = normalizeSessionConfig(config);
    }
    closeOutcome();
    closeEventOverlay();
    activeEventQueue = [];
    applyState(game.start({
      difficulty: currentSessionConfig.difficulty,
      testMode: currentSessionConfig.testMode
    }));
    ui.menuCard.classList.add("is-hidden");
    ui.dashboard.classList.remove("is-hidden");
    window.scrollTo(0, 0);
  }

  function renderGame() {
    if (!state || !state.started) {
      return;
    }

    var currentRoom = state.currentRoom;
    ui.heroTitle.textContent = state.testMode ? "Fixed Test Layout" : "Procedural Castle Run";
    ui.heroSubtitle.textContent = state.testMode
      ? "The full INSANE map is visible, matching the original test mode idea."
      : "Only explored rooms are shown. The rule set matches the CLI version, but movement and items use buttons instead of typed commands.";

    ui.statusDifficulty.textContent = state.difficulty.label;
    ui.statusSteps.textContent = String(state.player.step);
    ui.statusFloor.textContent = floorTitle(currentRoom.z);
    ui.statusPrincess.textContent = state.player.withPrincess ? "With You" : "Not Yet";
    ui.statusGas.textContent = state.player.gasTime > 0 ? ("Active: " + state.player.gasTime) : "Inactive";
    ui.statusPrincess.parentElement.classList.toggle("is-positive", state.player.withPrincess);
    ui.mapNote.textContent = state.testMode
      ? "Full reveal enabled. North is up, south is down, west is left, east is right."
      : "Map follows true castle dimensions. North is up, south is down, west is left, east is right.";

    ui.roomTitle.textContent = currentRoom.name;
    ui.roomCoords.textContent = "(" + currentRoom.x + ", " + currentRoom.y + ", " + currentRoom.z + ")";
    ui.roomDescription.innerHTML = currentRoom.description.map(function (line) {
      return "<p>" + escapeHtml(line) + "</p>";
    }).join("");

    if (state.player.withPrincess) {
      ui.princessBanner.classList.remove("is-hidden");
      ui.princessBanner.classList.add("is-rescued");
      ui.princessBanner.textContent = currentRoom.key === "LOBBY"
        ? "Princess rescued. You are back in the Lobby. Press Out to escape with her."
        : "Princess rescued. She is already with you. Bring her back to the Lobby, then press Out.";
    } else {
      ui.princessBanner.classList.remove("is-rescued");
      ui.princessBanner.classList.remove("is-hidden");
      ui.princessBanner.textContent = "Princess not rescued yet. Search the castle until you find her room.";
    }

    renderMap();
    renderMovement();
    renderInventory();
    renderGoals();
    renderLogs();
    renderEventOverlay();
    renderOutcomeOverlay();
  }

  function renderMap() {
    ui.mapStack.innerHTML = "";

    state.map.forEach(function (floor) {
      var floorCard = document.createElement("section");
      floorCard.className = "map-floor";

      var heading = document.createElement("header");
      var title = document.createElement("h4");
      title.textContent = floor.label;
      var subtitle = document.createElement("span");
      subtitle.className = "panel-note";
      subtitle.textContent = "z = " + floor.z;
      heading.appendChild(title);
      heading.appendChild(subtitle);
      floorCard.appendChild(heading);

      var grid = document.createElement("div");
      grid.className = "map-grid";
      grid.style.setProperty("--grid-columns", String(floor.width));

      floor.rows.forEach(function (row) {
        row.forEach(function (cell) {
          var cellNode = document.createElement("div");
          cellNode.className = "map-cell";

          if (!cell.exists && cell.blockedKnown) {
            cellNode.classList.add("is-blocked");
            cellNode.innerHTML = "<div class=\"cell-title\">Block</div><div class=\"cell-subtitle\">No Room</div>";
            grid.appendChild(cellNode);
            return;
          }

          if (!cell.exists) {
            cellNode.classList.add("is-unknown");
            cellNode.innerHTML = "<div class=\"cell-title\">?</div><div class=\"cell-subtitle\">Unknown</div>";
            grid.appendChild(cellNode);
            return;
          }

          if (!cell.visible) {
            cellNode.classList.add("is-unknown");
            cellNode.innerHTML = "<div class=\"cell-title\">?</div><div class=\"cell-subtitle\">Unexplored</div>";
            grid.appendChild(cellNode);
            return;
          }

          if (cell.visited) {
            cellNode.classList.add("is-visited");
          }
          if (cell.current) {
            cellNode.classList.add("is-current");
          }

          var icons = state.testMode || cell.current ? cell.icons.join(" ") : "";
          var subtitle = cell.current ? "Current Room" : (cell.visited ? "Visited" : "Visible");
          cellNode.innerHTML =
            "<div>" +
            "<div class=\"cell-title\">" + escapeHtml(cell.abbr) + "</div>" +
            "<div class=\"cell-subtitle\">" + escapeHtml(subtitle) + "</div>" +
            "</div>" +
            "<div class=\"cell-icons\">" + escapeHtml(icons || cell.roomName) + "</div>";
          grid.appendChild(cellNode);
        });
      });

      floorCard.appendChild(grid);
      ui.mapStack.appendChild(floorCard);
    });
  }

  function renderMovement() {
    ui.compassGrid.innerHTML = "";
    ui.verticalGrid.innerHTML = "";
    ui.exitGrid.innerHTML = "";
    var disableAll = isInteractionLocked();
    var exits = state.currentRoom.exits;

    compassOrder.forEach(function (direction) {
      if (!direction) {
        ui.compassGrid.appendChild(placeholderButton());
        return;
      }
      ui.compassGrid.appendChild(movementButton(direction, exits.indexOf(direction) !== -1 && !disableAll, false));
    });

    verticalOrder.forEach(function (direction) {
      ui.verticalGrid.appendChild(movementButton(direction, exits.indexOf(direction) !== -1 && !disableAll, false));
    });

    ui.exitGrid.appendChild(movementButton("out", exits.indexOf("out") !== -1 && !disableAll, true));

    ui.controlHint.textContent = exits.indexOf("out") !== -1
      ? "The four-direction pad only handles x / y movement. Up and Down change floors. Out is the Lobby exit, separate from normal south movement."
      : "The four-direction pad handles x / y movement. Up and Down change floors on the z axis.";
  }

  function renderInventory() {
    ui.inventoryGrid.innerHTML = "";
    var disableAll = isInteractionLocked();

    state.inventory.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "inventory-button";
      button.disabled = disableAll || !item.available;
      button.classList.toggle("is-available", item.available);
      var art = artUrl(item.id);
      var media = art
        ? "<img class=\"inventory-art\" src=\"" + escapeHtml(art) + "\" alt=\"" + escapeHtml(item.label) + "\">"
        : "<div class=\"inventory-art inventory-art-placeholder\"></div>";
      button.innerHTML =
        "<div class=\"inventory-media\">" + media + "</div>" +
        "<div class=\"inventory-copy\">" +
        "<strong>" + escapeHtml(item.label) + "</strong>" +
        "<span>" + escapeHtml(item.available ? inventoryDetail(item.id) : "Not in your inventory.") + "</span>" +
        "</div>";
      button.addEventListener("click", function () {
        applyState(game.useItem(item.id));
      });
      ui.inventoryGrid.appendChild(button);
    });
  }

  function renderGoals() {
    ui.goalList.innerHTML = "";
    var finished = !!state.outcome;

    state.goals.forEach(function (goal) {
      var item = document.createElement("article");
      item.className = "goal-item";
      if (goal.complete) {
        item.classList.add("is-complete");
      } else if (finished) {
        item.classList.add("is-failed");
      }
      item.innerHTML =
        "<strong>" + escapeHtml(goal.complete ? "Complete" : (finished ? "Failed" : "Pending")) + "</strong>" +
        "<span>" + escapeHtml(goal.label) + "</span>";
      ui.goalList.appendChild(item);
    });
  }

  function renderLogs() {
    ui.logList.innerHTML = "";
    var logs = state.logs.slice().reverse();
    logs.forEach(function (entry) {
      var node = document.createElement("article");
      node.className = "log-item";
      node.setAttribute("data-kind", entry.kind);
      node.textContent = entry.message;
      ui.logList.appendChild(node);
    });
  }

  function renderEventOverlay() {
    if (!activeEventQueue.length) {
      closeEventOverlay();
      return;
    }

    var event = activeEventQueue[0];
    ui.eventEyebrow.textContent = eventEyebrow(event);
    ui.eventTitle.textContent = event.title;
    ui.eventMessage.textContent = event.message;

    var art = artUrl(event.artId);
    if (art) {
      ui.eventArt.src = art;
      ui.eventArt.alt = event.title;
      ui.eventArt.classList.remove("is-hidden");
    } else {
      ui.eventArt.removeAttribute("src");
      ui.eventArt.alt = "";
      ui.eventArt.classList.add("is-hidden");
    }

    ui.eventOverlay.classList.remove("is-hidden");
    ui.eventOverlay.setAttribute("aria-hidden", "false");
  }

  function closeEventOverlay() {
    ui.eventOverlay.classList.add("is-hidden");
    ui.eventOverlay.setAttribute("aria-hidden", "true");
  }

  function renderOutcomeOverlay() {
    if (!state.outcome) {
      closeOutcome();
      return;
    }

    ui.outcomeEyebrow.textContent = state.outcome.type === "win" ? "Victory" : "Defeat";
    ui.outcomeTitle.textContent = state.outcome.title;
    ui.outcomeMessage.textContent = state.outcome.message;
    ui.outcomeGoals.innerHTML = "";

    state.outcome.goals.forEach(function (goal) {
      var item = document.createElement("article");
      item.className = "goal-item";
      item.classList.add(goal.complete ? "is-complete" : "is-failed");
      item.innerHTML =
        "<strong>" + escapeHtml(goal.complete ? "Complete" : "Failed") + "</strong>" +
        "<span>" + escapeHtml(goal.label) + "</span>";
      ui.outcomeGoals.appendChild(item);
    });

    ui.outcomeOverlay.classList.remove("is-hidden");
    ui.outcomeOverlay.setAttribute("aria-hidden", "false");
  }

  function closeOutcome() {
    ui.outcomeOverlay.classList.add("is-hidden");
    ui.outcomeOverlay.setAttribute("aria-hidden", "true");
  }

  function inventoryDetail(id) {
    switch (id) {
      case "Diamond":
        return "Bright, valuable, and still useless.";
      case "MagicBall":
        return "Use once to learn the princess floor or the monster floor.";
      case "DreamGas":
        return "Use once to put the monster to sleep for a short time.";
      case "Sword":
        return "Essential against an awake monster. Also reveals the secret on a sleeping one.";
      default:
        return "";
    }
  }

  function floorTitle(z) {
    if (z === 0) {
      return "Ground Floor";
    }
    if (z === 1) {
      return "First Floor";
    }
    if (z === 2) {
      return "Second Floor";
    }
    return "Floor " + z;
  }

  function directionLabel(direction) {
    if (direction === "out") {
      return "Out";
    }
    return direction.charAt(0).toUpperCase() + direction.slice(1);
  }

  function movementButton(direction, enabled, isExit) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "movement-button";
    if (enabled) {
      button.classList.add("is-enabled");
    }
    if (isExit) {
      button.classList.add("is-exit");
    }
    button.disabled = !enabled;
    button.innerHTML =
      "<strong>" + escapeHtml(movementSlots[direction].title) + "</strong>" +
      "<small>" + escapeHtml(movementSlots[direction].detail) + "</small>";
    button.addEventListener("click", function () {
      applyState(game.move(direction));
    });
    return button;
  }

  function placeholderButton() {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "movement-button is-placeholder";
    button.disabled = true;
    button.innerHTML = "<strong>&nbsp;</strong><small>&nbsp;</small>";
    return button;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function applyState(nextState) {
    state = nextState;
    enqueueTurnEvents(state);
    renderGame();
    flushBlockingPrompts();
  }

  function resolvePendingChoicePrompt(nextState) {
    if (!nextState || !nextState.pendingChoice || choicePromptActive) {
      return nextState;
    }

    choicePromptActive = true;
    closeEventOverlay();
    var useSword = window.confirm(
      nextState.pendingChoice.title +
      "\n\n" +
      nextState.pendingChoice.message +
      "\n\nPress OK to use the sword.\nPress Cancel to do nothing."
    );
    choicePromptActive = false;
    return game.resolvePendingChoice(useSword);
  }

  function enqueueTurnEvents(nextState) {
    if (!nextState || !nextState.turnEvents || !nextState.turnEvents.length) {
      return;
    }

    nextState.turnEvents.forEach(function (event) {
      activeEventQueue.push({
        type: event.type,
        artId: event.artId,
        title: event.title,
        message: event.message
      });
    });
  }

  function advanceEventOverlay() {
    if (!activeEventQueue.length) {
      closeEventOverlay();
      flushBlockingPrompts();
      return;
    }

    activeEventQueue.shift();
    renderGame();
    flushBlockingPrompts();
  }

  function flushBlockingPrompts() {
    if (activeEventQueue.length) {
      renderEventOverlay();
      return;
    }

    closeEventOverlay();

    if (state && state.pendingChoice) {
      state = resolvePendingChoicePrompt(state);
      enqueueTurnEvents(state);
      renderGame();
      flushBlockingPrompts();
    }
  }

  function isInteractionLocked() {
    return !!state.pendingChoice || !!state.outcome || activeEventQueue.length > 0;
  }

  function eventEyebrow(event) {
    if (event.artId === "Princess") {
      return "Rescue";
    }
    if (event.type === "pickup") {
      return "Item Acquired";
    }
    if (event.type === "action") {
      return "Item Used";
    }
    return "Encounter";
  }

  function artUrl(id) {
    if (!artFiles[id]) {
      return "";
    }
    return new URL("./assets/images/" + artFiles[id], window.location.href).href;
  }

  function readButtonConfig(button) {
    return normalizeSessionConfig({
      difficulty: button.getAttribute("data-difficulty") || "easy",
      testMode: button.getAttribute("data-start-mode") === "test"
    });
  }

  function normalizeSessionConfig(config) {
    var difficulty = config && config.difficulty ? config.difficulty : "easy";
    if (!engine.DIFFICULTIES[difficulty]) {
      difficulty = "easy";
    }

    return {
      difficulty: difficulty,
      testMode: !!(config && config.testMode)
    };
  }
})();
