(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const screens = [
    "titleScreen",
    "selectScreen",
    "battleScreen",
    "resultScreen",
    "settingsScreen",
    "howScreen"
  ];

  const roster = {
    blaze: {
      id: "blaze",
      name: "블레이즈",
      en: "BLAZE",
      type: "밸런스형",
      color: "#4f96ff",
      speed: 2.8,
      attackRate: 460,
      ultDamage: 40,
      skill: "강타",
      skillType: "heavy"
    },
    kale: {
      id: "kale",
      name: "케일",
      en: "KALE",
      type: "파워형",
      color: "#ff547c",
      speed: 3.15,
      attackRate: 310,
      ultDamage: 25,
      skill: "기절공",
      skillType: "projectile"
    },
    aris: {
      id: "aris",
      name: "아리스",
      en: "ARIS",
      type: "기술형",
      color: "#bba0ff",
      speed: 3.15,
      attackRate: 310,
      ultDamage: 30,
      skill: "다크 레이저",
      skillType: "beam"
    },
    winter: {
      id: "winter",
      name: "윈터",
      en: "WINTER",
      type: "스피드형",
      color: "#56f0ee",
      speed: 4.15,
      attackRate: 220,
      ultDamage: 20,
      skill: "대쉬",
      skillType: "dash"
    }
  };

  const state = {
    screen: "titleScreen",
    picks: { 1: null, 2: null },
    currentPlayer: 1,
    fighters: [],
    keys: new Set(),
    active: false,
    round: 1,
    wins: [0, 0],
    timer: 90,
    lastFrame: 0,
    raf: 0,
    countdownTimer: null,
    master: 0.65,
    sfx: true,
    music: true,
    audio: null,
    musicTimer: null,
    matchOver: false,
    settingsReturn: "titleScreen",
    resultShown: false
  };

  function showScreen(id) {
    screens.forEach((screen) => {
      $(screen).classList.toggle("active", screen === id);
    });

    state.screen = id;

    if (id !== "battleScreen") {
      stopBattleLoop();
    }

    const musicModes = {
      titleScreen: "menu",
      selectScreen: "select",
      battleScreen: "battle",
      resultScreen: "result"
    };

    if (musicModes[id]) {
      startMusic(musicModes[id]);
    } else {
      stopMusic();
    }
  }

  function audioContext() {
    if (!state.audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) state.audio = new AC();
    }

    if (state.audio && state.audio.state === "suspended") {
      state.audio.resume().catch(() => {});
    }

    return state.audio;
  }

  function tone(freq = 440, duration = 0.08, wave = "sine", volume = 0.06, delay = 0) {
    if (!state.sfx || state.master <= 0) return;

    const ac = audioContext();
    if (!ac) return;

    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    const start = ac.currentTime + delay;

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume * state.master),
      start + 0.012
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(ac.destination);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function sfx(kind) {
    const sounds = {
      nav: [[420, 0.045, "sine", 0.04]],
      select: [
        [520, 0.07, "triangle", 0.07],
        [780, 0.1, "triangle", 0.06]
      ],
      transition: [
        [280, 0.09, "sawtooth", 0.04],
        [560, 0.13, "sine", 0.05]
      ],
      start: [
        [330, 0.12, "triangle", 0.06],
        [495, 0.12, "triangle", 0.06],
        [740, 0.22, "triangle", 0.06]
      ],
      hit: [
        [150, 0.055, "square", 0.08],
        [90, 0.08, "triangle", 0.06]
      ],
      guard: [[300, 0.07, "triangle", 0.045]],
      skill: [
        [420, 0.08, "sawtooth", 0.05],
        [700, 0.18, "sine", 0.06]
      ],
      ult: [
        [180, 0.12, "sawtooth", 0.07],
        [360, 0.16, "sawtooth", 0.06],
        [720, 0.28, "triangle", 0.08]
      ],
      win: [
        [440, 0.12, "triangle", 0.06],
        [660, 0.12, "triangle", 0.06],
        [880, 0.3, "triangle", 0.07]
      ],
      count: [[400, 0.09, "sine", 0.06]]
    };

    (sounds[kind] || sounds.nav).forEach((sound, index) => {
      tone(sound[0], sound[1], sound[2], sound[3], index * 0.075);
    });
  }

  function startMusic(mode) {
    stopMusic();

    if (!state.music || state.master <= 0) return;

    const patterns = {
      menu: [110, 164.81, 220, 164.81],
      select: [130.81, 196, 261.63, 196],
      battle: [73.42, 110, 146.83, 110],
      result: [130.81, 164.81, 196, 261.63]
    };

    const expectedScreen = {
      menu: "titleScreen",
      select: "selectScreen",
      battle: "battleScreen",
      result: "resultScreen"
    };

    const notes = patterns[mode] || patterns.menu;
    let index = 0;

    state.musicTimer = window.setInterval(() => {
      if (
        !state.music ||
        state.master <= 0 ||
        state.screen !== expectedScreen[mode]
      ) {
        return;
      }

      const ac = audioContext();
      if (!ac) return;

      const oscillator = ac.createOscillator();
      const gain = ac.createGain();
      const now = ac.currentTime;

      oscillator.type = mode === "battle" ? "triangle" : "sine";
      oscillator.frequency.value = notes[index++ % notes.length];

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(
        0.012 * state.master,
        now + 0.08
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      oscillator.connect(gain);
      gain.connect(ac.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.4);
    }, mode === "battle" ? 390 : 650);
  }

  function stopMusic() {
    if (state.musicTimer) {
      clearInterval(state.musicTimer);
      state.musicTimer = null;
    }
  }

  function stopBattleLoop() {
    state.active = false;

    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }

    if (state.countdownTimer) {
      clearTimeout(state.countdownTimer);
      state.countdownTimer = null;
    }
  }

  function chooseCharacter(id, player = state.currentPlayer) {
    if (!roster[id]) return;

    const other = player === 1 ? 2 : 1;

    if (state.picks[other] === id) {
      sfx("nav");
      flashMessage("두 플레이어는 다른 캐릭터를 선택해야 합니다.");
      return;
    }

    state.picks[player] = id;
    sfx("select");

    if (!state.picks[1]) {
      state.currentPlayer = 1;
    } else if (!state.picks[2]) {
      state.currentPlayer = 2;
    } else {
      state.currentPlayer = 0;
    }

    updatePickUI();
  }

  function updatePickUI() {
    [1, 2].forEach((player) => {
      const character = state.picks[player]
        ? roster[state.picks[player]]
        : null;

      $(`p${player}PickName`).textContent =
        character ? character.name : "선택하세요";

      $(`p${player}PickType`).textContent =
        character
          ? character.type
          : player === 1
            ? "왼쪽 플레이어"
            : "오른쪽 플레이어";

      $(`p${player}PickStatus`).textContent =
        character
          ? `${character.en} 선택 완료`
          : `P${player} 선택 대기`;
    });

    document.querySelectorAll(".character-card").forEach((card) => {
      const id = card.dataset.character;

      card.classList.toggle("picked-p1", state.picks[1] === id);
      card.classList.toggle("picked-p2", state.picks[2] === id);

      card.classList.toggle(
        "unavailable",
        (state.picks[1] === id && state.picks[2] !== id) ||
        (state.picks[2] === id && state.picks[1] !== id)
      );

      const label = card.querySelector(".card-pick");

      label.textContent =
        state.picks[1] === id
          ? "P1 선택 완료"
          : state.picks[2] === id
            ? "P2 선택 완료"
            : "선택하기";
    });

    $("startBattleButton").disabled = !(
      state.picks[1] &&
      state.picks[2] &&
      state.picks[1] !== state.picks[2]
    );
  }

  function beginMatch() {
    if (
      !state.picks[1] ||
      !state.picks[2] ||
      state.picks[1] === state.picks[2]
    ) {
      return;
    }

    state.wins = [0, 0];
    state.round = 1;
    state.matchOver = false;

    setupRound();
    showScreen("battleScreen");
    sfx("transition");
    beginCountdown();
  }

  function makeFighter(player, id) {
    return {
      player,
      char: roster[id],
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hp: 100,
      gauge: 0,
      grounded: true,
      guard: false,
      stun: 0,
      invuln: 0,
      attackCooldown: 0,
      combo: 0,
      lastAttack: 0,
      skillCooldown: 0,
      skillTimer: 0,
      ultTimer: 0,
      ultUsed: false,
      action: "idle",
      face: player === 1 ? 1 : -1,
      el: $(player === 1 ? "p1Fighter" : "p2Fighter")
    };
  }

  function setupRound() {
    stopBattleLoop();

    state.timer = 90;
    state.resultShown = false;

    state.fighters = [
      makeFighter(1, state.picks[1]),
      makeFighter(2, state.picks[2])
    ];

    state.fighters.forEach((fighter) => {
      fighter.x = fighter.player === 1
        ? arenaWidth() * 0.2
        : arenaWidth() * 0.8;
    });

    $("roundLabel").textContent = `ROUND ${state.round}`;
    $("p1BattleName").textContent = roster[state.picks[1]].name;
    $("p2BattleName").textContent = roster[state.picks[2]].name;
    $("p1ArenaName").textContent = roster[state.picks[1]].en;
    $("p2ArenaName").textContent = roster[state.picks[2]].en;

    setFighterArt(1, state.picks[1]);
    setFighterArt(2, state.picks[2]);

    $("combatEffects").innerHTML = "";
    $("battleMessage").textContent = "";

    updateHud();
    renderFighters();
  }

  function arenaWidth() {
    return $("arena").clientWidth || 800;
  }

  function arenaHeight() {
    return $("arena").clientHeight || 380;
  }

  function setFighterArt(player, id) {
    const target = $(
      player === 1 ? "p1Fighter" : "p2Fighter"
    ).querySelector(".fighter-figure");

    target.className = `fighter-figure ${id}-art`;

    const image = target.querySelector(".battle-character-image");

    if (image) {
      image.src = `assets/${id}.png`;
      image.alt = roster[id].name;
    }
  }

  function beginCountdown() {
    state.active = false;

    const overlay = $("countdownOverlay");
    const label = overlay.querySelector("span");
    const number = overlay.querySelector("strong");

    overlay.classList.remove("hidden");
    label.textContent = `ROUND ${state.round}`;

    const sequence = ["3", "2", "1", "FIGHT"];
    let index = 0;

    function next() {
      if (state.screen !== "battleScreen") return;

      if (index < sequence.length) {
        number.textContent = sequence[index];
        number.style.fontSize = index === 3 ? "64px" : "86px";

        if (index === 3) {
          label.textContent = "";
        }

        sfx(index === 3 ? "start" : "count");

        index++;
        state.countdownTimer = setTimeout(
          next,
          index === 4 ? 650 : 800
        );
      } else {
        overlay.classList.add("hidden");
        state.active = true;
        state.lastFrame = performance.now();
        state.raf = requestAnimationFrame(loop);
      }
    }

    next();
  }

  function loop(now) {
    if (!state.active || state.screen !== "battleScreen") return;

    const dt = Math.min((now - state.lastFrame) / 1000, 0.035);
    state.lastFrame = now;

    updateGame(dt);
    state.raf = requestAnimationFrame(loop);
  }

  function updateGame(dt) {
    state.timer = Math.max(0, state.timer - dt);

    if (state.timer <= 0) {
      const [p1, p2] = state.fighters;

      finishRound(
        p1.hp === p2.hp ? 0 : p1.hp > p2.hp ? 1 : 2
      );
      return;
    }

    state.fighters.forEach((fighter) => {
      fighter.attackCooldown = Math.max(
        0,
        fighter.attackCooldown - dt * 1000
      );
      fighter.stun = Math.max(0, fighter.stun - dt);
      fighter.invuln = Math.max(0, fighter.invuln - dt);
      fighter.skillCooldown = Math.max(0, fighter.skillCooldown - dt);
      fighter.skillTimer = Math.max(0, fighter.skillTimer - dt);
      fighter.ultTimer = Math.max(0, fighter.ultTimer - dt);

      if (
        fighter.stun > 0 ||
        fighter.skillTimer > 0 ||
        fighter.ultTimer > 0
      ) {
        fighter.vx = 0;
      } else if (!fighter.guard) {
        const left =
          state.keys.has(fighter.player === 1 ? "KeyA" : "ArrowLeft") ||
          mobileHeld(fighter.player, "left");

        const right =
          state.keys.has(fighter.player === 1 ? "KeyD" : "ArrowRight") ||
          mobileHeld(fighter.player, "right");

        fighter.vx = (right ? 1 : 0) - (left ? 1 : 0);

        if (fighter.vx) {
          fighter.face = fighter.vx > 0 ? 1 : -1;
        }

        fighter.x += fighter.vx * fighter.char.speed * 60 * dt;
      } else {
        fighter.vx = 0;
      }

      // 양수 방향으로 점프하고 중력으로 다시 바닥에 내려옵니다.
      fighter.vy -= 1200 * dt;
      fighter.y += fighter.vy * dt;

      if (fighter.y <= 0) {
        fighter.y = 0;
        fighter.vy = 0;
        fighter.grounded = true;
      }

      fighter.x = Math.max(
        28,
        Math.min(arenaWidth() - 28, fighter.x)
      );

      fighter.action = fighter.guard
        ? "guard"
        : fighter.skillTimer > 0
          ? "skill"
          : fighter.ultTimer > 0
            ? "ultimate"
            : fighter.stun > 0
              ? "stun"
              : fighter.vx
                ? "move"
                : "idle";
    });

    // 캐릭터가 서로의 위치를 통과하지 않도록 합니다.
    const [a, b] = state.fighters;

    if (Math.abs(a.x - b.x) < 45) {
      const mid = (a.x + b.x) / 2;

      a.x = mid - (a.x < b.x ? 23 : -23);
      b.x = mid + (a.x < b.x ? 23 : -23);
    }

    updateHud();
    renderFighters();
  }

  function renderFighters() {
    state.fighters.forEach((fighter) => {
      fighter.el.style.left = `${fighter.x}px`;
      fighter.el.style.bottom = `${36 + fighter.y}px`;
      fighter.el.style.transform = "translateX(-50%)";

      fighter.el.classList.toggle("guarding", fighter.guard);
      fighter.el.classList.toggle("jumping", fighter.y > 0);
      fighter.el.classList.toggle(
        "skill-active",
        fighter.skillTimer > 0 || fighter.ultTimer > 0
      );

      const figure = fighter.el.querySelector(".fighter-figure");

      figure.style.transform = fighter.player === 2
        ? "scaleX(-1) scale(1.25)"
        : "scale(1.25)";

      fighter.el.dataset.action = fighter.action;
      fighter.el.style.setProperty("--fighter-color", fighter.char.color);
    });
  }

  function updateHud() {
    state.fighters.forEach((fighter) => {
      const p = fighter.player;

      $(`p${p}HpText`).textContent = `${Math.ceil(fighter.hp)} / 100`;
      $(`p${p}HpBar`).style.width = `${fighter.hp}%`;
      $(`p${p}GaugeText`).textContent = `${Math.floor(fighter.gauge)}%`;
      $(`p${p}GaugeBar`).style.width = `${fighter.gauge}%`;

      $(`p${p}HpBar`).style.filter =
        fighter.hp < 25 ? "saturate(1.5) brightness(1.2)" : "none";
    });

    $("timer").textContent = String(Math.ceil(state.timer)).padStart(2, "0");
  }

  function fighter(player) {
    return state.fighters.find((item) => item.player === player);
  }

  function act(player, action) {
    if (!state.active || state.screen !== "battleScreen") return;

    const f = fighter(player);
    const opponent = fighter(player === 1 ? 2 : 1);

    if (!f || !opponent || f.hp <= 0) return;

    if (action === "guard") {
      f.guard = true;
      f.action = "guard";
      return;
    }

    if (action === "jump") {
      if (
        f.grounded &&
        !f.guard &&
        f.stun <= 0 &&
        f.skillTimer <= 0 &&
        f.ultTimer <= 0
      ) {
        f.vy = 480;
        f.grounded = false;
        sfx("nav");
      }
      return;
    }

    if (f.stun > 0 || f.skillTimer > 0 || f.ultTimer > 0) return;

    if (action === "attack") {
      if (f.guard || f.attackCooldown > 0) return;

      f.attackCooldown = f.char.attackRate;
      f.combo = performance.now() - f.lastAttack < 600
        ? (f.combo % 2) + 1
        : 1;
      f.lastAttack = performance.now();

      f.action = "attack";
      f.el.classList.remove("attacking");
      void f.el.offsetWidth;
      f.el.classList.add("attacking");

      setTimeout(() => f.el.classList.remove("attacking"), 190);
      sfx("hit");

      if (
        Math.abs(opponent.x - f.x) < 105 &&
        Math.abs(f.y - opponent.y) < 95
      ) {
        dealDamage(
          f,
          opponent,
          5,
          false,
          f.combo === 2 ? 55 : 18
        );
      }
      return;
    }

    if (action === "skill") {
      if (f.skillCooldown > 0) return;

      f.skillCooldown = 9;
      f.skillTimer = f.char.skillType === "beam" ? 2 : 0.45;
      f.guard = false;
      f.action = "skill";

      sfx("skill");

      // 케일: 기절공. 방어할 수 없고 맞으면 1초 기절합니다.
      if (f.char.skillType === "projectile") {
        effectText("STUN ORB", f.x, f.player);

        setTimeout(() => {
          if (state.screen !== "battleScreen") return;

          const distance = Math.abs(f.x - opponent.x);
          showProjectile(f, opponent);

          if (distance < Math.max(260, arenaWidth() * 0.42)) {
            dealDamage(f, opponent, 8, true, 0);
            opponent.stun = 1;
            effectText("STUN!", opponent.x, opponent.player);
          }
        }, 260);
      }

      // 블레이즈: 강타. 강한 피해와 밀쳐내기를 줍니다.
      if (f.char.skillType === "heavy") {
        if (Math.abs(opponent.x - f.x) < 130) {
          dealDamage(f, opponent, 15, true, 90);
          effectText("POWER HIT", opponent.x, opponent.player);
        } else {
          effectText("MISS", f.x, f.player);
        }
      }

      // 윈터: 대쉬.
      if (f.char.skillType === "dash") {
        const direction = opponent.x > f.x ? 1 : -1;

        f.x = Math.max(
          25,
          Math.min(arenaWidth() - 25, f.x + direction * 100)
        );

        if (Math.abs(opponent.x - f.x) < 105 && !opponent.guard) {
          dealDamage(f, opponent, 5, true, 40);
          effectText("DASH!", opponent.x, opponent.player);
        }
      }

      // 아리스: 다크 레이저.
      if (f.char.skillType === "beam") {
        const distance = Math.abs(opponent.x - f.x);

        addEffect("beam", 0, 0);

        setTimeout(() => {
          if (
            state.screen === "battleScreen" &&
            distance < arenaWidth() * 0.85 &&
            !opponent.guard
          ) {
            dealDamage(f, opponent, 10, true, 25);
            effectText("DARK LASER", opponent.x, opponent.player);
          }
        }, 250);
      }

      return;
    }

    if (action === "ultimate") {
      if (f.gauge < 100 || f.ultUsed) return;

      f.gauge = 0;
      f.ultUsed = true;
      f.ultTimer = 1;
      f.guard = false;

      sfx("ult");
      effectText("ULTIMATE", f.x, f.player);

      setTimeout(() => {
        if (
          state.screen !== "battleScreen" ||
          !state.fighters.includes(f)
        ) {
          return;
        }

        const distance = Math.abs(opponent.x - f.x);

        if (distance < Math.max(300, arenaWidth() * 0.55)) {
          dealDamage(
            f,
            opponent,
            f.char.ultDamage,
            true,
            85
          );

          addBurst(opponent.x, opponent.player);
          effectText("BREAK!", opponent.x, opponent.player);
        }

        f.ultUsed = false;
      }, 750);
    }
  }

  function dealDamage(attacker, target, damage, unblockable, knockback) {
    if (target.invuln > 0 || target.skillTimer > 0) return;

    if (target.guard && !unblockable) {
      sfx("guard");
      addBurst(target.x, target.player);
      return;
    }

    target.hp = Math.max(0, target.hp - damage);
    target.invuln = 0.18;

    attacker.gauge = Math.min(100, attacker.gauge + 5);
    target.gauge = Math.min(100, target.gauge + 5);

    if (knockback) {
      target.x = Math.max(
        25,
        Math.min(
          arenaWidth() - 25,
          target.x + (target.x > attacker.x ? 1 : -1) * knockback
        )
      );
    }

    target.el.classList.remove("hit");
    void target.el.offsetWidth;
    target.el.classList.add("hit");

    setTimeout(() => target.el.classList.remove("hit"), 220);

    addBurst(target.x, target.player);
    updateHud();
    sfx("hit");

    if (target.hp <= 0) {
      finishRound(attacker.player);
    }
  }

  function addEffect(type, x, y) {
    const element = document.createElement("div");
    element.className = type;

    if (type === "beam") {
      element.style.top = "45%";
      element.style.left = "4%";
      element.style.right = "4%";
    } else {
      element.style.left = `${x}px`;
      element.style.top = `${arenaHeight() - y - 150}px`;
    }

    $("combatEffects").appendChild(element);

    setTimeout(() => element.remove(), type === "beam" ? 750 : 600);
  }

  function addBurst(x, player) {
    const element = document.createElement("div");

    element.className = "burst";
    element.style.left =
      `${Math.max(0, Math.min(arenaWidth() - 120, x - 60))}px`;
    element.style.top =
      `${player === 1 ? arenaHeight() - 230 : arenaHeight() - 240}px`;
    element.style.borderColor = player === 1 ? "#56f0ee" : "#ff547c";
    element.style.boxShadow =
      `0 0 35px ${player === 1 ? "#56f0ee" : "#ff547c"}`;

    $("combatEffects").appendChild(element);
    setTimeout(() => element.remove(), 550);
  }

  function effectText(text, x, player) {
    const element = document.createElement("div");

    element.className = "hit-effect";
    element.textContent = text;
    element.style.left =
      `${Math.max(10, Math.min(arenaWidth() - 120, x - 20))}px`;
    element.style.top =
      `${player === 1 ? arenaHeight() - 245 : arenaHeight() - 255}px`;

    $("combatEffects").appendChild(element);
    setTimeout(() => element.remove(), 550);
  }

  function showProjectile(f, opponent) {
    const element = document.createElement("div");

    element.className = "projectile";
    element.style.left = `${f.x}px`;
    element.style.top = "48%";

    if (opponent.x < f.x) {
      element.style.animationDirection = "reverse";
    }

    $("combatEffects").appendChild(element);
    setTimeout(() => element.remove(), 550);
  }

  function flashMessage(text) {
    $("battleMessage").textContent = text;

    setTimeout(() => {
      if ($("battleMessage").textContent === text) {
        $("battleMessage").textContent = "";
      }
    }, 1300);
  }

  function finishRound(winner) {
    if (!state.active || state.resultShown) return;

    state.active = false;
    state.resultShown = true;

    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }

    if (winner === 1 || winner === 2) {
      state.wins[winner - 1]++;
    }

    $("battleMessage").textContent =
      winner === 0 ? "DRAW" : `P${winner} ROUND WIN`;

    setTimeout(() => {
      if (
        state.wins[0] >= 2 ||
        state.wins[1] >= 2 ||
        state.round >= 3
      ) {
        state.matchOver = true;
        showResult();
        return;
      }

      state.round++;
      setupRound();
      beginCountdown();
    }, 1300);
  }

  function showResult() {
    stopBattleLoop();

    const winner = state.wins[0] === state.wins[1]
      ? 0
      : state.wins[0] > state.wins[1]
        ? 1
        : 2;

    $("resultTitle").textContent =
      winner === 0 ? "DRAW" : winner === 1 ? "PLAYER 1 WINS" : "PLAYER 2 WINS";

    $("resultTitle").classList.toggle("defeat", winner === 2);

    $("resultSubtitle").textContent = winner === 0
      ? "치열한 승부였습니다."
      : `${roster[state.picks[winner]].name} 승리!`;

    $("p1Wins").textContent = state.wins[0];
    $("p2Wins").textContent = state.wins[1];

    $("resultLines").textContent = winner === 0
      ? "끝까지 승부가 갈리지 않았습니다. 다시 대전해 보세요."
      : `${roster[state.picks[winner]].name}: “이 승리는 내 것이다!”`;

    sfx("win");
    showScreen("resultScreen");
  }

  function resetPicks() {
    state.picks = { 1: null, 2: null };
    state.currentPlayer = 1;
    updatePickUI();
  }

  function mobileHeld(player, direction) {
    return document.querySelector(
      `.mobile-controls button[data-player="${player}"][data-action="${direction}"].pressed`
    ) !== null;
  }

  function pressMobile(button) {
    const player = Number(button.dataset.player);
    const action = button.dataset.action;

    if (action === "guard") {
      act(player, "guard");
      return;
    }

    if (action === "left" || action === "right") {
      button.classList.add("pressed");
      return;
    }

    act(player, action);
  }

  function releaseMobile(button) {
    button.classList.remove("pressed");

    if (button.dataset.action === "guard") {
      const f = fighter(Number(button.dataset.player));
      if (f) f.guard = false;
    }
  }

  // 캐릭터 카드 선택
  document.querySelectorAll(".character-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.character;

      if (state.picks[1] === id) {
        state.picks[1] = null;
        state.currentPlayer = 1;
        updatePickUI();
        sfx("nav");
        return;
      }

      if (state.picks[2] === id) {
        state.picks[2] = null;
        state.currentPlayer = 2;
        updatePickUI();
        sfx("nav");
        return;
      }

      let player = state.currentPlayer;

      if (player === 0) {
        player = 1;
      }

      chooseCharacter(id, player);
    });
  });

  // 메뉴 버튼
  $("playButton").addEventListener("click", () => {
    sfx("transition");
    resetPicks();
    showScreen("selectScreen");
  });

  $("howButton").addEventListener("click", () => {
    state.settingsReturn = "titleScreen";
    sfx("transition");
    showScreen("howScreen");
  });

  $("titleSettingsButton").addEventListener("click", () => {
    state.settingsReturn = "titleScreen";
    sfx("transition");
    showScreen("settingsScreen");
  });

  $("howBackButton").addEventListener("click", () => {
    sfx("nav");
    showScreen(state.settingsReturn || "titleScreen");
  });

  $("startBattleButton").addEventListener("click", () => {
    sfx("transition");
    beginMatch();
  });

  $("rematchButton").addEventListener("click", () => {
    sfx("transition");
    resetPicks();
    showScreen("selectScreen");
  });

  $("resultMenuButton").addEventListener("click", () => {
    sfx("transition");
    showScreen("titleScreen");
  });

  $("resultSettingsButton").addEventListener("click", () => {
    state.settingsReturn = "resultScreen";
    sfx("transition");
    showScreen("settingsScreen");
  });

  $("settingsBackButton").addEventListener("click", () => {
    sfx("nav");
    showScreen(state.settingsReturn || "titleScreen");
  });

  $("soundToggle").addEventListener("click", () => {
    state.sfx = !state.sfx;
    $("soundToggle").textContent = state.sfx ? "♫" : "♪";

    if (state.sfx) sfx("select");
  });

  $("masterVolume").addEventListener("input", (event) => {
    state.master = Number(event.target.value) / 100;
    $("volumeValue").textContent = `${event.target.value}%`;
  });

  $("sfxToggle").addEventListener("change", (event) => {
    state.sfx = event.target.checked;
    document.querySelector(".toggle-label").textContent =
      state.sfx ? "ON" : "OFF";

    if (state.sfx) sfx("select");
  });

  $("musicToggle").addEventListener("change", (event) => {
    state.music = event.target.checked;

    if (state.music) {
      const mode = {
        titleScreen: "menu",
        selectScreen: "select",
        battleScreen: "battle",
        resultScreen: "result"
      }[state.screen] || "menu";

      startMusic(mode);
    } else {
      stopMusic();
    }
  });

  // 키보드 조작
  document.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Enter", "Space"].includes(event.code)) {
      event.preventDefault();
    }

    if (
      event.repeat &&
      ["KeyE", "Slash", "KeyQ", "ShiftLeft", "KeyR", "Enter"].includes(event.code)
    ) {
      return;
    }

    if (state.screen === "selectScreen") {
      const p1Keys = {
        Digit1: "blaze",
        Digit2: "kale",
        Digit3: "aris",
        Digit4: "winter"
      };

      const p2Keys = {
        Digit7: "blaze",
        Digit8: "kale",
        Digit9: "aris",
        Digit0: "winter"
      };

      if (p1Keys[event.code]) chooseCharacter(p1Keys[event.code], 1);
      if (p2Keys[event.code]) chooseCharacter(p2Keys[event.code], 2);

      if (event.code === "Enter" && !$("startBattleButton").disabled) {
        beginMatch();
      }

      return;
    }

    if (state.screen === "resultScreen") {
      if (event.code === "Enter" || event.code === "Space") {
        resetPicks();
        showScreen("selectScreen");
      }
      return;
    }

    if (state.screen === "settingsScreen" || state.screen === "howScreen") {
      if (event.code === "Escape") {
        showScreen(state.settingsReturn || "titleScreen");
      }
      return;
    }

    if (state.screen !== "battleScreen") return;

    state.keys.add(event.code);

    const p1Map = {
      KeyW: "jump",
      KeyE: "attack",
      KeyF: "guard",
      KeyQ: "skill",
      KeyR: "ultimate"
    };

    const p2Map = {
      ArrowUp: "jump",
      Slash: "attack",
      Period: "guard",
      ShiftLeft: "skill",
      Enter: "ultimate"
    };

    if (p1Map[event.code]) act(1, p1Map[event.code]);
    if (p2Map[event.code]) act(2, p2Map[event.code]);
  });

  document.addEventListener("keyup", (event) => {
    state.keys.delete(event.code);

    if (event.code === "KeyF") {
      const f = fighter(1);
      if (f) f.guard = false;
    }

    if (event.code === "Period") {
      const f = fighter(2);
      if (f) f.guard = false;
    }
  });

  window.addEventListener("blur", () => {
    state.keys.clear();
    state.fighters.forEach((f) => {
      f.guard = false;
    });
  });

  // 모바일 조작 버튼
  document.querySelectorAll(".mobile-controls button").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      pressMobile(button);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((name) => {
      button.addEventListener(name, (event) => {
        event.preventDefault();
        releaseMobile(button);
      });
    });
  });

  showScreen("titleScreen");
})();