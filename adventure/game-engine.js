(function (global, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    global.CastleAdventureEngine = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ROOM_KEYS = [
    "LOBBY",
    "LIBRARY",
    "KITCHEN",
    "BEDROOM",
    "BATHROOM",
    "STUDY",
    "DININGROOM",
    "MUSICROOM",
    "BALLROOM",
    "LABORATORY",
    "LAUNDRYROOM",
    "INFIRMARY",
    "GALLERY",
    "THEATER",
    "ARMORY",
    "GAURDROOM",
    "CONFERENCEROOM",
    "STORAGEROOM",
    "PANTRY",
    "TORTUREROOM"
  ];

  var ROOM_LABELS = {
    LOBBY: "Lobby",
    LIBRARY: "Library",
    KITCHEN: "Kitchen",
    BEDROOM: "Bedroom",
    BATHROOM: "Bathroom",
    STUDY: "Study",
    DININGROOM: "Dining Room",
    MUSICROOM: "Music Room",
    BALLROOM: "Ball Room",
    LABORATORY: "Laboratory",
    LAUNDRYROOM: "Laundry Room",
    INFIRMARY: "Infirmary",
    GALLERY: "Gallery",
    THEATER: "Theater",
    ARMORY: "Armory",
    GAURDROOM: "Guard Room",
    CONFERENCEROOM: "Conference Room",
    STORAGEROOM: "Storage Room",
    PANTRY: "Pantry",
    TORTUREROOM: "Torture Room"
  };

  var ROOM_ABBR = {
    LOBBY: "L",
    LIBRARY: "LI",
    KITCHEN: "K",
    BEDROOM: "BE",
    BATHROOM: "BA",
    STUDY: "ST",
    DININGROOM: "DI",
    MUSICROOM: "MU",
    BALLROOM: "BR",
    LABORATORY: "LA",
    LAUNDRYROOM: "LR",
    INFIRMARY: "IN",
    GALLERY: "GA",
    THEATER: "TH",
    ARMORY: "AR",
    GAURDROOM: "GR",
    CONFERENCEROOM: "CR",
    STORAGEROOM: "SR",
    PANTRY: "PA",
    TORTUREROOM: "TR"
  };

  var FLOOR_LABELS = ["Ground Floor", "First Floor", "Second Floor"];
  var DIRECTION_LABELS = {
    north: "North",
    south: "South",
    east: "East",
    west: "West",
    up: "Up",
    down: "Down",
    out: "Out"
  };

  var ITEM_CONFIG = {
    Diamond: {
      key: "hasDiam",
      roomKey: "diam",
      pickup: "You picked up the Diamond.",
      missing: "You don't have a diamond.",
      inactive: "The diamond shines brightly, but it seems to have no use."
    },
    MagicBall: {
      key: "hasBall",
      roomKey: "ball",
      pickup: "You picked up the MagicBall.",
      missing: "You don't have a magic ball."
    },
    DreamGas: {
      key: "hasGas",
      roomKey: "gas",
      pickup: "You picked up the DreamGas.",
      missing: "You don't have any dream gas."
    },
    Sword: {
      key: "hasSword",
      roomKey: "sword",
      pickup: "You picked up the Sword.",
      missing: "You don't have a sword."
    }
  };

  var DIFFICULTIES = {
    easy: {
      id: "easy",
      label: "Easy",
      roomCount: 5,
      sizeX: 2,
      sizeY: 2,
      sizeZ: 2,
      lobbyX: 0,
      stepGoal: 8,
      goals: ["Finish in 8 steps."]
    },
    medium: {
      id: "medium",
      label: "Medium",
      roomCount: 9,
      sizeX: 3,
      sizeY: 2,
      sizeZ: 2,
      lobbyX: 1,
      stepGoal: 14,
      goals: ["Finish in 14 steps.", "Find the diamond."]
    },
    hard: {
      id: "hard",
      label: "Hard",
      roomCount: 13,
      sizeX: 3,
      sizeY: 3,
      sizeZ: 2,
      lobbyX: 1,
      stepGoal: 20,
      goals: ["Finish in 20 steps.", "Find the diamond."]
    },
    insane: {
      id: "insane",
      label: "Insane",
      roomCount: 20,
      sizeX: 3,
      sizeY: 3,
      sizeZ: 3,
      lobbyX: 1,
      stepGoal: 30,
      goals: ["Finish in 30 steps.", "Find the diamond.", "Find the secret."]
    }
  };

  function createGrid() {
    return Array.from({ length: 3 }, function () {
      return Array.from({ length: 3 }, function () {
        return Array.from({ length: 3 }, function () {
          return null;
        });
      });
    });
  }

  function createRoom(name, x, y, z) {
    return {
      name: name,
      x: x,
      y: y,
      z: z,
      monster: false,
      princess: false,
      diam: false,
      sword: false,
      ball: false,
      gas: false
    };
  }

  function copyArray(values) {
    return values.slice();
  }

  function floorName(z) {
    return FLOOR_LABELS[z] || ("Floor " + z);
  }

  function roomNameLabel(name) {
    return ROOM_LABELS[name] || name;
  }

  function roomAbbr(name) {
    return ROOM_ABBR[name] || name.slice(0, 2);
  }

  function clampLog(entries, limit) {
    if (entries.length > limit) {
      entries.splice(0, entries.length - limit);
    }
  }

  function directionDelta(direction) {
    switch (direction) {
      case "north":
        return { dx: 0, dy: 1, dz: 0 };
      case "south":
        return { dx: 0, dy: -1, dz: 0 };
      case "east":
        return { dx: 1, dy: 0, dz: 0 };
      case "west":
        return { dx: -1, dy: 0, dz: 0 };
      case "up":
        return { dx: 0, dy: 0, dz: 1 };
      case "down":
        return { dx: 0, dy: 0, dz: -1 };
      default:
        return { dx: 0, dy: 0, dz: 0 };
    }
  }

  function describeRoomContents(room) {
    var lines = [];
    if (room.monster) {
      lines.push("A soft snoring fills the air. You meet the monster.");
    }
    if (room.princess) {
      lines.push("A beautiful princess is trapped here, waiting for a hero to rescue her.");
    }
    if (room.diam) {
      lines.push("A dazzling diamond glimmers in the corner.");
    }
    if (room.sword) {
      lines.push("In the shadowy corner rests a sword.");
    }
    if (room.ball) {
      lines.push("A magical ball sits here, pulsing softly.");
    }
    if (room.gas) {
      lines.push("A vial of dream gas sits quietly on the table.");
    }
    if (!lines.length) {
      lines.push("There doesn't seem to be anything useful here.");
    }
    return lines;
  }

  function CastleAdventureGame(options) {
    options = options || {};
    this.random = typeof options.random === "function" ? options.random : Math.random;
    this.logLimit = options.logLimit || 200;
    this.reset();
  }

  CastleAdventureGame.prototype.reset = function () {
    this.mode = null;
    this.difficulty = null;
    this.castle = null;
    this.player = null;
    this.logs = [];
    this.currentSceneLines = [];
    this.currentSceneEntities = [];
    this.currentSceneMeta = null;
    this.turnEvents = [];
    this.pendingChoice = null;
    this.outcome = null;
    this.testMode = false;
    this.revealAll = false;
    this.turnIndex = 0;
  };

  CastleAdventureGame.prototype.start = function (settings) {
    settings = settings || {};
    var difficultyId = settings.difficulty || "easy";
    if (!DIFFICULTIES[difficultyId]) {
      difficultyId = "easy";
    }

    this.reset();
    this.testMode = !!settings.testMode;
    this.difficulty = this.testMode ? DIFFICULTIES.insane : DIFFICULTIES[difficultyId];
    this.revealAll = this.testMode;
    this.castle = this.testMode ? this.createFixedCastle() : this.createRandomCastle(this.difficulty);
    this.player = {
      x: this.difficulty.lobbyX,
      y: 0,
      z: 0,
      step: 0,
      withPrincess: false,
      hasDiam: false,
      hasBall: false,
      hasGas: false,
      hasSword: false,
      hasSecret: false,
      gasTime: -1,
      visited: {},
      blocked: {}
    };
    this.markVisited(this.player.x, this.player.y, this.player.z);
    this.discoverBlockedNeighbors(this.player.x, this.player.y, this.player.z);

    if (this.testMode) {
      this.addLog("Test mode enabled. The fixed INSANE layout is fully revealed.");
    } else {
      this.addLog(this.difficulty.label + " mode: " + this.difficulty.roomCount + "/" + this.difficulty.sizeX + "*" + this.difficulty.sizeY + "*" + this.difficulty.sizeZ + " rooms");
    }

    this.beginTurn(true);
    return this.getState();
  };

  CastleAdventureGame.prototype.createRandomCastle = function (difficulty) {
    var castle = {
      difficultyId: difficulty.id,
      sizeX: difficulty.sizeX,
      sizeY: difficulty.sizeY,
      sizeZ: difficulty.sizeZ,
      lobbyX: difficulty.lobbyX,
      roomCount: difficulty.roomCount,
      monsterFloor: 0,
      princessFloor: 0,
      monsterRoomKey: null,
      grid: createGrid()
    };

    castle.grid[castle.lobbyX][0][0] = createRoom("LOBBY", castle.lobbyX, 0, 0);
    var roomCount = 1;

    while (roomCount < castle.roomCount) {
      var x = this.randInt(castle.sizeX);
      var y = this.randInt(castle.sizeY);
      var z = this.randInt(castle.sizeZ);

      if (castle.grid[x][y][z]) {
        continue;
      }

      if (!this.hasAdjacentRoom(castle, x, y, z)) {
        continue;
      }

      var roomName = ROOM_KEYS[roomCount];
      var room = createRoom(roomName, x, y, z);
      castle.grid[x][y][z] = room;

      if (roomCount === castle.roomCount - 1) {
        room.monster = true;
        while (true) {
          var sx = this.randInt(castle.sizeX);
          var sy = this.randInt(castle.sizeY);
          var sz = this.randInt(castle.sizeZ);
          var swapRoom = castle.grid[sx][sy][sz];
          if (!swapRoom || swapRoom.name === "LOBBY") {
            continue;
          }
          var tempName = swapRoom.name;
          swapRoom.name = room.name;
          room.name = tempName;
          castle.monsterFloor = room.z;
          castle.monsterRoomKey = this.roomKey(room.x, room.y, room.z);
          break;
        }
      }

      roomCount += 1;
    }

    this.placeRandomContent(castle, difficulty);
    return castle;
  };

  CastleAdventureGame.prototype.placeRandomContent = function (castle, difficulty) {
    var leastStep = 2;
    if (difficulty.id === "hard" || difficulty.id === "insane") {
      leastStep = 3;
    }

    var placed = false;
    var attempt = 0;
    while (!placed && attempt < 30) {
      var px = this.randInt(castle.sizeX);
      var py = this.randInt(castle.sizeY);
      var pz = this.randInt(castle.sizeZ);
      var princessRoom = castle.grid[px][py][pz];
      if (princessRoom && !princessRoom.monster) {
        if (Math.abs(px - castle.lobbyX) + py + pz >= leastStep) {
          princessRoom.princess = true;
          castle.princessFloor = pz;
          placed = true;
        }
      }
      attempt += 1;
    }

    if (!placed) {
      for (var x = 0; x < castle.sizeX && !placed; x += 1) {
        for (var y = 0; y < castle.sizeY && !placed; y += 1) {
          for (var z = 0; z < castle.sizeZ && !placed; z += 1) {
            var room = castle.grid[x][y][z];
            if (room && !room.monster && room.name !== "LOBBY") {
              room.princess = true;
              castle.princessFloor = z;
              placed = true;
            }
          }
        }
      }
    }

    if (difficulty.id !== "easy") {
      this.placeSingleItem(castle, "diam");
    }
    if (difficulty.id !== "easy" && difficulty.id !== "medium") {
      this.placeSingleItem(castle, "ball");
    }
    if (difficulty.id === "hard" || difficulty.id === "insane") {
      this.placeSingleItem(castle, "sword");
    }
    if (difficulty.id === "insane") {
      this.placeSingleItem(castle, "gas");
    }
  };

  CastleAdventureGame.prototype.placeSingleItem = function (castle, key) {
    while (true) {
      var x = this.randInt(castle.sizeX);
      var y = this.randInt(castle.sizeY);
      var z = this.randInt(castle.sizeZ);
      var room = castle.grid[x][y][z];
      if (!room || room.name === "LOBBY" || room.monster || room.princess) {
        continue;
      }
      room[key] = true;
      return;
    }
  };

  CastleAdventureGame.prototype.createFixedCastle = function () {
    var castle = {
      difficultyId: "insane",
      sizeX: 3,
      sizeY: 3,
      sizeZ: 3,
      lobbyX: 1,
      roomCount: 20,
      monsterFloor: 1,
      princessFloor: 1,
      monsterRoomKey: null,
      grid: createGrid()
    };

    var NONE = 0;
    var PRINCESS = 1;
    var MONSTER = 2;
    var SWORD = 3;
    var GAS = 4;
    var DIAMOND = 5;
    var BALL = 6;
    var LOBBY = 7;
    var BLOCK = -1;

    var layout = createGrid().map(function (plane) {
      return plane.map(function (row) {
        return row.map(function () {
          return NONE;
        });
      });
    });

    layout[1][2][0] = BLOCK;
    layout[2][2][0] = BLOCK;
    layout[1][0][0] = LOBBY;
    layout[2][0][0] = GAS;
    layout[1][2][1] = DIAMOND;
    layout[2][2][1] = BLOCK;
    layout[2][1][1] = BALL;
    layout[0][2][1] = PRINCESS;
    layout[0][0][1] = MONSTER;
    layout[0][2][2] = BLOCK;
    layout[1][2][2] = BLOCK;
    layout[2][2][2] = SWORD;
    layout[0][1][2] = BLOCK;
    layout[2][0][2] = BLOCK;

    var normalRoomNames = [
      "LIBRARY",
      "KITCHEN",
      "BEDROOM",
      "BATHROOM",
      "STUDY",
      "DININGROOM",
      "MUSICROOM",
      "BALLROOM",
      "LABORATORY",
      "LAUNDRYROOM",
      "INFIRMARY",
      "GALLERY",
      "THEATER",
      "ARMORY",
      "GAURDROOM",
      "CONFERENCEROOM",
      "STORAGEROOM",
      "PANTRY",
      "TORTUREROOM"
    ];

    var roomTypeIndex = 0;
    for (var x = 0; x < 3; x += 1) {
      for (var y = 0; y < 3; y += 1) {
        for (var z = 0; z < 3; z += 1) {
          var type = layout[x][y][z];
          if (type === BLOCK) {
            castle.grid[x][y][z] = null;
            continue;
          }

          var name = normalRoomNames[roomTypeIndex];
          if (type === LOBBY) {
            name = "LOBBY";
          } else {
            roomTypeIndex += 1;
          }

          var room = createRoom(name, x, y, z);
          castle.grid[x][y][z] = room;

          if (type === PRINCESS) {
            room.princess = true;
            castle.princessFloor = z;
          } else if (type === MONSTER) {
            room.monster = true;
            castle.monsterFloor = z;
            castle.monsterRoomKey = this.roomKey(x, y, z);
          } else if (type === SWORD) {
            room.sword = true;
          } else if (type === GAS) {
            room.gas = true;
          } else if (type === DIAMOND) {
            room.diam = true;
          } else if (type === BALL) {
            room.ball = true;
          }
        }
      }
    }

    return castle;
  };

  CastleAdventureGame.prototype.beginTurn = function (showSceneEvents) {
    if (this.outcome) {
      return;
    }

    if (typeof showSceneEvents === "undefined") {
      showSceneEvents = true;
    }

    var room = this.currentRoom();
    var exits = this.availableDirections();
    this.turnEvents = [];
    this.turnIndex += 1;
    this.currentSceneMeta = {
      roomName: roomNameLabel(room.name),
      roomKey: room.name,
      exits: copyArray(exits),
      floorLabel: floorName(room.z),
      position: { x: room.x, y: room.y, z: room.z }
    };
    this.discoverBlockedNeighbors(room.x, room.y, room.z);

    if (this.player.gasTime > 0) {
      this.player.gasTime -= 1;
    }
    if (this.player.gasTime === 0 && !this.player.hasSecret) {
      this.addLog("The monster wakes up. You are no longer safe.", "warning");
      this.player.gasTime = -1;
    }

    this.currentSceneLines = describeRoomContents(room);
    this.currentSceneEntities = this.gatherSceneEntities(room);
    if (showSceneEvents) {
      this.queueSceneEvents(room);
    }
    this.addLog("Entered " + roomNameLabel(room.name) + ". Exits: " + exits.map(function (direction) {
      return DIRECTION_LABELS[direction];
    }).join(", ") + ".", "scene");

    var pickupMessages = this.pickupItems(room);
    for (var i = 0; i < pickupMessages.length; i += 1) {
      this.addLog(pickupMessages[i], "pickup");
    }

    if (room.monster) {
      if (this.player.gasTime > 0) {
        this.addLog("The monster is asleep. You are in a short safety.", "info");
      } else if (this.player.hasSword) {
        this.pendingChoice = {
          type: "sword-escape",
          title: "Monster Encounter",
          message: "You are in great danger. Use the sword now, or the monster will strike."
        };
        this.addLog("The monster is awake. You must decide whether to use the sword.", "warning");
      } else {
        this.finishLoss(
          "Monster Attack",
          "You are in great danger, and you have no weapon to defend yourself."
        );
      }
    }
  };

  CastleAdventureGame.prototype.queueSceneEvents = function (room) {
    if (room.monster) {
      this.turnEvents.push({
        type: "encounter",
        artId: "Monster",
        title: "Monster Encounter",
        message: this.player.gasTime > 0
          ? "You found the monster, but it is sleeping for now."
          : "You found the monster. Stay alert."
      });
    }
  };

  CastleAdventureGame.prototype.pickupItems = function (room) {
    var messages = [];

    if (room.diam) {
      this.player.hasDiam = true;
      room.diam = false;
      messages.push(ITEM_CONFIG.Diamond.pickup);
      this.queuePickupEvent("Diamond", "You picked up the Diamond.");
    }
    if (room.ball) {
      this.player.hasBall = true;
      room.ball = false;
      messages.push(ITEM_CONFIG.MagicBall.pickup);
      this.queuePickupEvent("MagicBall", "You picked up the MagicBall.");
    }
    if (room.gas) {
      this.player.hasGas = true;
      room.gas = false;
      messages.push(ITEM_CONFIG.DreamGas.pickup);
      this.queuePickupEvent("DreamGas", "You picked up the DreamGas.");
    }
    if (room.sword) {
      this.player.hasSword = true;
      room.sword = false;
      messages.push(ITEM_CONFIG.Sword.pickup);
      this.queuePickupEvent("Sword", "You picked up the Sword.");
    }
    if (room.princess) {
      this.player.withPrincess = true;
      room.princess = false;
      messages.push("You have rescued the princess! Return to the Lobby.");
      this.turnEvents.push({
        type: "pickup",
        artId: "Princess",
        title: "Princess Rescued",
        message: "The princess is now with you. Bring her back to the Lobby."
      });
    }

    return messages;
  };

  CastleAdventureGame.prototype.queuePickupEvent = function (artId, message) {
    this.turnEvents.push({
      type: "pickup",
      artId: artId,
      title: "Item Acquired",
      message: message
    });
  };

  CastleAdventureGame.prototype.queueActionEvent = function (artId, title, message) {
    this.turnEvents.push({
      type: "action",
      artId: artId,
      title: title,
      message: message
    });
  };

  CastleAdventureGame.prototype.issueCommand = function (command) {
    if (!command) {
      return this.getState();
    }

    var trimmed = String(command).trim();
    if (!trimmed) {
      return this.getState();
    }

    if (this.pendingChoice && (trimmed === "y" || trimmed === "n")) {
      return this.resolvePendingChoice(trimmed === "y");
    }

    if (trimmed.slice(0, 3) === "go ") {
      return this.move(trimmed.slice(3).trim().toLowerCase());
    }

    return this.useItem(trimmed);
  };

  CastleAdventureGame.prototype.move = function (direction) {
    if (this.pendingChoice || this.outcome) {
      return this.getState();
    }

    var room = this.currentRoom();
    if (direction === "out") {
      if (room.name !== "LOBBY") {
        this.addLog("There is no exit out from here.", "warning");
        this.beginTurn(false);
        return this.getState();
      }

      if (this.player.withPrincess) {
        this.finishWin();
      } else {
        this.finishLoss(
          "Abandoned Rescue",
          "You go out with... Wait, you forgot something... or someone? The princess is still in the castle."
        );
      }
      return this.getState();
    }

    if (this.availableDirections().indexOf(direction) === -1) {
      this.addLog("There is no room there!", "warning");
      this.beginTurn(false);
      return this.getState();
    }

    var delta = directionDelta(direction);
    this.player.x += delta.dx;
    this.player.y += delta.dy;
    this.player.z += delta.dz;
    this.player.step += 1;
    this.markVisited(this.player.x, this.player.y, this.player.z);
    this.beginTurn(true);
    return this.getState();
  };

  CastleAdventureGame.prototype.useItem = function (itemName) {
    if (this.pendingChoice || this.outcome) {
      return this.getState();
    }

    if (itemName === "MagicBall") {
      if (!this.player.hasBall) {
        this.addLog(ITEM_CONFIG.MagicBall.missing, "warning");
        this.beginTurn(false);
        return this.getState();
      }
      var ballMessage;
      if (this.randInt(2) === 0) {
        ballMessage = "The magic ball reveals that the princess is on floor " + this.castle.princessFloor + ".";
        this.addLog("The magic ball displays a message: The person you want to see is on the " + this.castle.princessFloor + " floor.", "hint");
      } else {
        ballMessage = "The magic ball reveals that the monster is on floor " + this.castle.monsterFloor + ".";
        this.addLog("The magic ball displays a message: The creature you don't want to see is on the " + this.castle.monsterFloor + " floor.", "hint");
      }
      this.addLog("Crunch------the magic ball broke, and you must continue on your way.", "info");
      this.addLog("Hint: The ground floor is the 0 floor, and the floor above the ground floor is 1 floor.", "hint");
      this.player.hasBall = false;
      this.beginTurn(false);
      this.queueActionEvent(
        "MagicBall",
        "MagicBall Used",
        ballMessage + " The ball breaks immediately afterward."
      );
      return this.getState();
    }

    if (itemName === "Diamond") {
      var diamondMessage;
      if (!this.player.hasDiam) {
        this.addLog(ITEM_CONFIG.Diamond.missing, "warning");
        diamondMessage = "You do not have the Diamond.";
      } else {
        this.addLog(ITEM_CONFIG.Diamond.inactive, "info");
        diamondMessage = "The diamond shines brightly, but it still has no obvious use.";
      }
      this.beginTurn(false);
      this.queueActionEvent("Diamond", "Diamond Used", diamondMessage);
      return this.getState();
    }

    if (itemName === "DreamGas") {
      if (!this.player.hasGas) {
        this.addLog(ITEM_CONFIG.DreamGas.missing, "warning");
        this.beginTurn(false);
        return this.getState();
      }
      this.player.hasGas = false;
      this.player.gasTime = 5;
      this.addLog("You release the dream gas. Maybe the mist can keep you safe for a short time.", "info");
      this.addLog("Hint: The monster is asleep in 4 steps.", "hint");
      this.beginTurn(false);
      this.queueActionEvent(
        "DreamGas",
        "DreamGas Used",
        "You release the dream gas. The monster will sleep for 4 steps."
      );
      return this.getState();
    }

    if (itemName === "Sword") {
      if (!this.player.hasSword) {
        this.addLog(ITEM_CONFIG.Sword.missing, "warning");
        this.beginTurn(false);
        return this.getState();
      }

      var room = this.currentRoom();
      if (room.monster && this.player.gasTime > 0) {
        room.monster = false;
        this.player.hasSword = false;
        this.player.hasSecret = true;
        this.addLog("You use the sword to hit the sleeping monster. The monster is defeated.", "success");
        this.addLog("Congratulations! You found the secret.", "success");
        this.addLog("Inside the monster's belly, you discover a dazzling crown.", "success");
        this.beginTurn(false);
        this.queueActionEvent(
          "Secret",
          "Secret Found",
          "You defeat the sleeping monster and discover a dazzling crown inside its belly."
        );
      } else {
        this.addLog("You swing the sword around. Nothing happened.", "info");
        this.beginTurn(false);
        this.queueActionEvent(
          "Sword",
          "Sword Used",
          "You swing the sword around, but nothing happens."
        );
      }
      return this.getState();
    }

    this.addLog("Invalid command. Use movement buttons or an item from your inventory.", "warning");
    this.beginTurn(false);
    return this.getState();
  };

  CastleAdventureGame.prototype.resolvePendingChoice = function (useSword) {
    if (!this.pendingChoice || this.pendingChoice.type !== "sword-escape") {
      return this.getState();
    }

    this.turnEvents = [];
    var room = this.currentRoom();
    this.pendingChoice = null;

    if (!useSword) {
      this.finishLoss(
        "Hesitation",
        "You choose not to use the sword. The monster attacks you in your hesitation."
      );
      return this.getState();
    }

    room.monster = false;
    this.player.hasSword = false;
    this.addLog("The sword hit the monster, but it got stuck in its body. Now the monster escapes to another room.", "warning");

    var candidates = [];
    for (var x = 0; x < this.castle.sizeX; x += 1) {
      for (var y = 0; y < this.castle.sizeY; y += 1) {
        for (var z = 0; z < this.castle.sizeZ; z += 1) {
          var candidate = this.castle.grid[x][y][z];
          if (!candidate) {
            continue;
          }
          if (candidate.name === "LOBBY" || candidate.princess || candidate === room) {
            continue;
          }
          candidates.push(candidate);
        }
      }
    }

    if (candidates.length) {
      var target = candidates[this.randInt(candidates.length)];
      target.monster = true;
      this.castle.monsterFloor = target.z;
      this.castle.monsterRoomKey = this.roomKey(target.x, target.y, target.z);
      this.addLog("The monster has fled to another room...", "warning");
      this.queueActionEvent(
        "Monster",
        "Monster Escaped",
        "The sword wounded the monster, but it fled to another room in the castle."
      );
    } else {
      this.queueActionEvent(
        "Monster",
        "Monster Cornered",
        "The monster tried to flee, but there was nowhere left for it to go."
      );
    }

    return this.getState();
  };

  CastleAdventureGame.prototype.finishWin = function () {
    this.outcome = {
      type: "win",
      title: "You Win",
      message: "You escaped with the princess! Congratulations!",
      goals: this.evaluateGoals()
    };
    this.addLog(this.outcome.message, "success");
  };

  CastleAdventureGame.prototype.finishLoss = function (title, message) {
    this.outcome = {
      type: "loss",
      title: title,
      message: message,
      goals: this.evaluateGoals()
    };
    this.addLog(message, "danger");
  };

  CastleAdventureGame.prototype.evaluateGoals = function () {
    var goals = [];
    var difficulty = this.difficulty;

    goals.push({
      label: "Finish within " + difficulty.stepGoal + " steps",
      complete: this.player.step <= difficulty.stepGoal
    });

    if (difficulty.id === "medium" || difficulty.id === "hard" || difficulty.id === "insane") {
      goals.push({
        label: "Find the diamond",
        complete: this.player.hasDiam
      });
    }

    if (difficulty.id === "insane") {
      goals.push({
        label: "Find the secret",
        complete: this.player.hasSecret
      });
    }

    return goals;
  };

  CastleAdventureGame.prototype.availableDirections = function () {
    var room = this.currentRoom();
    var directions = [];
    var x = room.x;
    var y = room.y;
    var z = room.z;

    if (x > 0 && this.castle.grid[x - 1][y][z]) {
      directions.push("west");
    }
    if (x < this.castle.sizeX - 1 && this.castle.grid[x + 1][y][z]) {
      directions.push("east");
    }
    if (y > 0 && this.castle.grid[x][y - 1][z]) {
      directions.push("south");
    }
    if (y < this.castle.sizeY - 1 && this.castle.grid[x][y + 1][z]) {
      directions.push("north");
    }
    if (z > 0 && this.castle.grid[x][y][z - 1]) {
      directions.push("down");
    }
    if (z < this.castle.sizeZ - 1 && this.castle.grid[x][y][z + 1]) {
      directions.push("up");
    }
    if (room.name === "LOBBY") {
      directions.push("out");
    }

    return directions;
  };

  CastleAdventureGame.prototype.currentRoom = function () {
    return this.castle.grid[this.player.x][this.player.y][this.player.z];
  };

  CastleAdventureGame.prototype.addLog = function (message, kind) {
    this.logs.push({
      id: this.logs.length + 1,
      kind: kind || "info",
      message: message
    });
    clampLog(this.logs, this.logLimit);
  };

  CastleAdventureGame.prototype.markVisited = function (x, y, z) {
    var key = this.roomKey(x, y, z);
    this.player.visited[key] = true;
    delete this.player.blocked[key];
  };

  CastleAdventureGame.prototype.roomKey = function (x, y, z) {
    return x + ":" + y + ":" + z;
  };

  CastleAdventureGame.prototype.discoverBlockedNeighbors = function (x, y, z) {
    var deltas = [
      { dx: -1, dy: 0, dz: 0 },
      { dx: 1, dy: 0, dz: 0 },
      { dx: 0, dy: -1, dz: 0 },
      { dx: 0, dy: 1, dz: 0 },
      { dx: 0, dy: 0, dz: -1 },
      { dx: 0, dy: 0, dz: 1 }
    ];

    for (var i = 0; i < deltas.length; i += 1) {
      var nx = x + deltas[i].dx;
      var ny = y + deltas[i].dy;
      var nz = z + deltas[i].dz;

      if (
        nx < 0 || nx >= this.castle.sizeX ||
        ny < 0 || ny >= this.castle.sizeY ||
        nz < 0 || nz >= this.castle.sizeZ
      ) {
        continue;
      }

      if (!this.castle.grid[nx][ny][nz]) {
        this.player.blocked[this.roomKey(nx, ny, nz)] = true;
      }
    }
  };

  CastleAdventureGame.prototype.hasAdjacentRoom = function (castle, x, y, z) {
    return (
      (x < castle.sizeX - 1 && castle.grid[x + 1][y][z]) ||
      (x > 0 && castle.grid[x - 1][y][z]) ||
      (y < castle.sizeY - 1 && castle.grid[x][y + 1][z]) ||
      (y > 0 && castle.grid[x][y - 1][z]) ||
      (z < castle.sizeZ - 1 && castle.grid[x][y][z + 1]) ||
      (z > 0 && castle.grid[x][y][z - 1])
    );
  };

  CastleAdventureGame.prototype.randInt = function (max) {
    return Math.floor(this.random() * max);
  };

  CastleAdventureGame.prototype.gatherSceneEntities = function (room) {
    var entities = [];

    if (room.monster) {
      entities.push({
        id: "Monster",
        label: "Monster",
        detail: this.player.gasTime > 0 ? "Sleeping" : "Awake"
      });
    }
    if (room.princess) {
      entities.push({
        id: "Princess",
        label: "Princess",
        detail: "Waiting to be rescued"
      });
    }
    if (room.diam) {
      entities.push({
        id: "Diamond",
        label: "Diamond",
        detail: "Item"
      });
    }
    if (room.sword) {
      entities.push({
        id: "Sword",
        label: "Sword",
        detail: "Item"
      });
    }
    if (room.ball) {
      entities.push({
        id: "MagicBall",
        label: "MagicBall",
        detail: "Item"
      });
    }
    if (room.gas) {
      entities.push({
        id: "DreamGas",
        label: "DreamGas",
        detail: "Item"
      });
    }

    return entities;
  };

  CastleAdventureGame.prototype.getMapState = function () {
    var floors = [];
    for (var z = 0; z < this.castle.sizeZ; z += 1) {
      var rows = [];
      for (var y = this.castle.sizeY - 1; y >= 0; y -= 1) {
        var row = [];
        for (var x = 0; x < this.castle.sizeX; x += 1) {
          var room = this.castle.grid[x][y][z];
          var key = this.roomKey(x, y, z);
          var isVisible = this.revealAll || !!this.player.visited[key] || (x === this.player.x && y === this.player.y && z === this.player.z);
          var isBlockedKnown = this.revealAll ? !room : !!this.player.blocked[key];

          row.push({
            x: x,
            y: y,
            z: z,
            exists: !!room,
            visible: isVisible,
            blockedKnown: isBlockedKnown,
            current: x === this.player.x && y === this.player.y && z === this.player.z,
            visited: !!this.player.visited[key],
            roomName: room ? roomNameLabel(room.name) : null,
            roomKey: room ? room.name : null,
            abbr: room ? roomAbbr(room.name) : "",
            icons: room ? this.cellIcons(room) : [],
            key: key
          });
        }
        rows.push(row);
      }
      floors.push({
        z: z,
        label: floorName(z),
        width: this.castle.sizeX,
        height: this.castle.sizeY,
        rows: rows
      });
    }
    return floors;
  };

  CastleAdventureGame.prototype.cellIcons = function (room) {
    var icons = [];
    if (room.name === "LOBBY") {
      icons.push("L");
    }
    if (room.princess) {
      icons.push("P");
    }
    if (room.monster) {
      icons.push("M");
    }
    if (room.sword) {
      icons.push("S");
    }
    if (room.diam) {
      icons.push("D");
    }
    if (room.ball) {
      icons.push("B");
    }
    if (room.gas) {
      icons.push("G");
    }
    return icons;
  };

  CastleAdventureGame.prototype.getState = function () {
    var room = this.currentRoom();
    return {
      started: !!this.castle,
      testMode: this.testMode,
      difficulty: this.difficulty ? {
        id: this.difficulty.id,
        label: this.difficulty.label,
        stepGoal: this.difficulty.stepGoal,
        goals: copyArray(this.difficulty.goals)
      } : null,
      player: this.player ? {
        x: this.player.x,
        y: this.player.y,
        z: this.player.z,
        step: this.player.step,
        withPrincess: this.player.withPrincess,
        hasDiam: this.player.hasDiam,
        hasBall: this.player.hasBall,
        hasGas: this.player.hasGas,
        hasSword: this.player.hasSword,
        hasSecret: this.player.hasSecret,
        gasTime: this.player.gasTime
      } : null,
      currentRoom: room ? {
        name: roomNameLabel(room.name),
        key: room.name,
        x: room.x,
        y: room.y,
        z: room.z,
        exits: this.availableDirections(),
        description: copyArray(this.currentSceneLines),
        sceneEntities: this.currentSceneEntities.map(function (entity) {
          return {
            id: entity.id,
            label: entity.label,
            detail: entity.detail
          };
        })
      } : null,
      map: this.castle ? this.getMapState() : [],
      inventory: this.player ? [
        { id: "Diamond", label: "Diamond", available: this.player.hasDiam },
        { id: "MagicBall", label: "MagicBall", available: this.player.hasBall },
        { id: "DreamGas", label: "DreamGas", available: this.player.hasGas },
        { id: "Sword", label: "Sword", available: this.player.hasSword }
      ] : [],
      goals: this.player ? this.evaluateGoals() : [],
      goalDescriptions: this.difficulty ? copyArray(this.difficulty.goals) : [],
      pendingChoice: this.pendingChoice ? {
        type: this.pendingChoice.type,
        title: this.pendingChoice.title,
        message: this.pendingChoice.message
      } : null,
      turnEvents: this.turnEvents.map(function (event) {
        return {
          type: event.type,
          artId: event.artId,
          title: event.title,
          message: event.message
        };
      }),
      outcome: this.outcome ? {
        type: this.outcome.type,
        title: this.outcome.title,
        message: this.outcome.message,
        goals: this.outcome.goals.map(function (goal) {
          return {
            label: goal.label,
            complete: goal.complete
          };
        })
      } : null,
      logs: this.logs.map(function (entry) {
        return {
          id: entry.id,
          kind: entry.kind,
          message: entry.message
        };
      }),
      legend: []
    };
  };

  return {
    CastleAdventureGame: CastleAdventureGame,
    DIFFICULTIES: DIFFICULTIES,
    FLOOR_LABELS: FLOOR_LABELS,
    ROOM_LABELS: ROOM_LABELS,
    DIRECTION_LABELS: DIRECTION_LABELS
  };
});
